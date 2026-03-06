// ===============================
// 地圖初始化
// ===============================
let map = L.map("map").setView([23.7,121],7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let markers = [];   // 所有 marker
let line;           // 路徑 polyline

// ===============================
// 解析 textarea 座標
// ===============================
function parse(){
    let text = document.getElementById("coords").value.trim();
    let lines = text.split("\n");
    let pts = [];
    lines.forEach(l=>{
        let p = l.trim().split(/[ ,]+/);
        if(p.length>=2){
            let lat = parseFloat(p[0]);
            let lon = parseFloat(p[1]);
            if(!isNaN(lat)&&!isNaN(lon)) pts.push([lat,lon]);
        }
    });
    return pts;
}

// ===============================
// 建立 marker icon
// ===============================
function createIcon(n){
    return L.divIcon({
        className:"",
        html:`<div class="circle-marker">${n}</div>`,
        iconSize:[22,22]
    });
}

// ===============================
// 建立 marker
// ===============================
function createMarker(p,i){
    let m = L.marker(p, {icon:createIcon(i+1), draggable:false}).addTo(map);

    // 點擊 marker 顯示選單
    m.on("click", function(e){
        L.DomEvent.stopPropagation(e);  // 防止觸發地圖 click
        showMenu(i, e.containerPoint);
    });

    return m;
}

// ===============================
// 載入座標
// ===============================
function loadPoints(){
    clearMap();
    let pts = parse();
    pts.forEach((p,i)=>{
        let m = createMarker(p,i);
        markers.push(m);
    });
    drawLine(true);
    buildList();
    updateStats();
}

// ===============================
// 清除所有 marker
// ===============================
function clearMap(){
    markers.forEach(m=>map.removeLayer(m));
    markers=[];
    if(line) map.removeLayer(line);
}

// ===============================
// 畫路徑
// ===============================
function drawLine(fit=false){
    if(line) map.removeLayer(line);
    let pts = markers.map(m=>m.getLatLng());
    line = L.polyline(pts,{color:"red"}).addTo(map);
    if(fit && pts.length>0) map.fitBounds(line.getBounds());
}

// ===============================
// 建立下方座標列表
// ===============================
function buildList(){
    let list = document.getElementById("list");
    list.innerHTML="";
    markers.forEach((m,i)=>{
        let p = m.getLatLng();
        let div = document.createElement("div");
        div.className="list-item";
        div.innerHTML=`
            <span class="num">${i+1}</span>
            <span class="coord">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</span>
            <span class="marker-menu">
                <button onclick="moveUp(${i})">⬆</button>
                <button onclick="moveDown(${i})">⬇</button>
                <button onclick="enableMove(${i})">移動</button>
                <button onclick="deletePoint(${i})">刪除</button>
            </span>
        `;
        list.appendChild(div);
    });
}

// ===============================
// 更新 marker icon 與路徑
// ===============================
function refreshMarkers(){
    markers.forEach((m,i)=> m.setIcon(createIcon(i+1)));
    drawLine();
    buildList();
    updateStats();
}

// ===============================
// 計算總距離
// ===============================
function calcDistance(){
    let d=0;
    for(let i=1;i<markers.length;i++){
        let a=markers[i-1].getLatLng();
        let b=markers[i].getLatLng();
        d += map.distance(a,b);
    }
    return d/1000;
}

// ===============================
// 更新右側統計資訊
// ===============================
function updateStats(){
    document.getElementById("count").innerText = markers.length;
    let dist = calcDistance();
    document.getElementById("distance").innerText = dist.toFixed(2);
    let speed = parseFloat(document.getElementById("speed").value);
    let minutes = (dist/speed)*60;
    document.getElementById("time").innerText = minutes.toFixed(1);
}

// ===============================
// 移動 marker（啟動拖曳模式）
// ===============================
function enableMove(i){
    let m = markers[i];
    m.dragging.enable();
    let el = m.getElement();
    el.classList.add("moving"); // 顯示拖曳顏色

    hideMenu(); // 點移動後選單消失

    m.once("dragend", function(){
        m.dragging.disable();
        el.classList.remove("moving");
        refreshMarkers();
    });
}

// ===============================
// 上移 marker
// ===============================
function moveUp(i){
    if(i===0) return;
    [markers[i-1], markers[i]] = [markers[i], markers[i-1]];
    refreshMarkers();
}

// ===============================
// 下移 marker
// ===============================
function moveDown(i){
    if(i===markers.length-1) return;
    [markers[i], markers[i+1]] = [markers[i+1], markers[i]];
    refreshMarkers();
}

// ===============================
// 刪除 marker
// ===============================
function deletePoint(i){
    map.removeLayer(markers[i]);
    markers.splice(i,1);
    refreshMarkers();
}

// ===============================
// 路徑閉合
// ===============================
function autoClose(){
    let pts=parse();
    if(pts.length===0) return;
    let s = pts[0];
    let lat=(s[0]+0.000001).toFixed(6);
    let lon=(s[1]+0.000001).toFixed(6);
    document.getElementById("coords").value += `\n${lat},${lon}`;
}

// ===============================
// 匯入 GPX
// ===============================
function importGPX(){
    let file = document.getElementById("gpxFile").files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e){
        let text = e.target.result;
        let parser = new DOMParser();
        let xml = parser.parseFromString(text,"text/xml");
        let pts=[];
        xml.querySelectorAll("wpt,rtept,trkpt").forEach(n=>{
            pts.push([parseFloat(n.getAttribute("lat")), parseFloat(n.getAttribute("lon"))]);
        });
        if(pts.length===0){alert("GPX 裡沒有點位"); return;}
        document.getElementById("coords").value = pts.map(p=>p.join(",")).join("\n");
        loadPoints();
    };
    reader.readAsText(file);
}

function selectGPX(){
    document.getElementById("gpxFile").click();
}

// ===============================
// 地圖點擊空白處關閉選單
// ===============================
function hideMenu(){
    // 這裡可以延伸成真正的 HTML 選單，如果需要
    // 目前只是確保拖曳前選單消失
}
map.on("click", hideMenu);


// ===============================
// 下載 GPX
// ===============================
function downloadGPX(){
    let pts = markers.map(m=>m.getLatLng());
    let trk="";
    pts.forEach(p=>{
        trk += `<rtept lat="${p.lat}" lon="${p.lng}"></rtept>\n`;
    });
    let gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Tool" xmlns="http://www.topografix.com/GPX/1/1">
<rte>
<name>Route</name>
${trk}
</rte>
</gpx>`;

    let filenameInput = document.getElementById("filename").value.trim();
    let filename = filenameInput ? filenameInput.replace(/\.gpx$/i,"")+".gpx" : `pikmingpx_${(new Date()).toISOString().replace(/[:T]/g,'-').slice(0,16)}.gpx`;
    
    let blob = new Blob([gpx], {type:"application/gpx+xml"});
    let url = URL.createObjectURL(blob);
    let a=document.createElement("a");
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===============================
// 事件綁定
// ===============================
document.getElementById("gpxFile").addEventListener("change", importGPX);
document.getElementById("speed").addEventListener("input", updateStats);

window.addEventListener("load", function(){
    setTimeout(()=>map.invalidateSize(), 200);
});
