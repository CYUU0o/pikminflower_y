// -------------------- 地圖初始化 --------------------
let map = L.map("map").setView([23.7,121],7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let markers = [];
let line;

// -------------------- 解析座標 --------------------
function parse() {
    let text = document.getElementById("coords").value.trim();
    let lines = text.split("\n");
    let pts = [];
    lines.forEach(l=>{
        let p = l.trim().split(/[ ,]+/);
        if(p.length>=2){
            let lat = parseFloat(p[0]);
            let lon = parseFloat(p[1]);
            if(!isNaN(lat) && !isNaN(lon)) pts.push([lat,lon]);
        }
    });
    return pts;
}

// -------------------- 建立 Marker --------------------
function createIcon(n){
    return L.divIcon({
        className:"",
        html:`<div class="circle-marker">${n}</div>`,
        iconSize:[22,22]
    });
}

// Marker 核心建立
function createMarker(p,i){
    let m = L.marker(p,{icon:createIcon(i+1)}).addTo(map);

    // 點擊 Marker 彈出選單
    m.on("click", function(e){
        // 移除舊選單
        document.querySelectorAll(".marker-menu").forEach(el => el.remove());

        let menu = L.DomUtil.create('div','marker-menu', map.getPanes().popupPane);
        menu.style.position='absolute';
        let pos = map.latLngToContainerPoint(m.getLatLng());
        menu.style.left = pos.x + 'px';
        menu.style.top = pos.y + 'px';
        menu.innerHTML = `
            <button onclick="enableMove(${i}); this.parentElement.remove();">移動</button>
            <button onclick="moveUp(${i}); this.parentElement.remove();">前移</button>
            <button onclick="moveDown(${i}); this.parentElement.remove();">後移</button>
            <button onclick="deletePoint(${i}); this.parentElement.remove();">刪除</button>
        `;
    });

    return m;
}

// -------------------- 載入 Marker --------------------
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

// -------------------- 啟用拖曳 --------------------
function enableMove(i){
    let m = markers[i];
    m.getElement().classList.add('moving');
    m.dragging.enable();
    m.once("dragend", function(){
        m.dragging.disable();
        m.getElement().classList.remove('moving');
        refreshMarkers();
    });
}

// -------------------- 上移/下移/刪除 --------------------
function moveUp(i){
    if(i===0) return;
    [markers[i-1], markers[i]] = [markers[i], markers[i-1]];
    refreshMarkers();
}
function moveDown(i){
    if(i===markers.length-1) return;
    [markers[i], markers[i+1]] = [markers[i+1], markers[i]];
    refreshMarkers();
}
function deletePoint(i){
    map.removeLayer(markers[i]);
    markers.splice(i,1);
    refreshMarkers();
}

// -------------------- 繪製線段 --------------------
function drawLine(fit=false){
    if(line) map.removeLayer(line);
    let pts = markers.map(m=>m.getLatLng());
    line = L.polyline(pts,{color:"red"}).addTo(map);
    if(fit && pts.length>0) map.fitBounds(line.getBounds());
}

// -------------------- 清除 --------------------
function clearMap(){
    markers.forEach(m=>map.removeLayer(m));
    markers=[];
    if(line) map.removeLayer(line);
}

// -------------------- 列表生成 (僅上移/下移) --------------------
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
            <span>
                <button class="up">⬆</button>
                <button class="down">⬇</button>
            </span>
        `;
        list.appendChild(div);

        div.querySelector(".up").onclick = ()=>{ moveUp(i); };
        div.querySelector(".down").onclick = ()=>{ moveDown(i); };
    });
}

// -------------------- 更新 Marker / 列表 --------------------
function refreshMarkers(){
    markers.forEach((m,i)=>{ m.setIcon(createIcon(i+1)); });
    drawLine();
    buildList();
    updateStats();
}

// -------------------- 閉合路徑 --------------------
function autoClose(){
    let pts = parse();
    if(pts.length==0) return;
    let s = pts[0];
    let lat = (s[0]+0.000001).toFixed(6);
    let lon = (s[1]+0.000001).toFixed(6);
    document.getElementById("coords").value += `\n${lat},${lon}`;
}

// -------------------- 計算距離 --------------------
function calcDistance(){
    let d=0;
    for(let i=1;i<markers.length;i++){
        let a=markers[i-1].getLatLng();
        let b=markers[i].getLatLng();
        d += map.distance(a,b);
    }
    return d/1000;
}

// -------------------- 更新統計 --------------------
function updateStats(){
    document.getElementById("count").innerText = markers.length;
    let dist = calcDistance();
    document.getElementById("distance").innerText = dist.toFixed(2);
    let speed = parseFloat(document.getElementById("speed").value);
    let minutes = (dist/speed)*60;
    document.getElementById("time").innerText = minutes.toFixed(1);
}

// -------------------- GPX 下載 --------------------
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
    let filename = filenameInput? filenameInput.replace(/\.gpx$/i,"")+".gpx": 
        `pikmingpx_${new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)}.gpx`;

    let blob = new Blob([gpx], {type:"application/gpx+xml"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// -------------------- GPX 匯入 --------------------
function importGPX(){
    let file=document.getElementById("gpxFile").files[0];
    if(!file) return;
    let reader=new FileReader();
    reader.onload=function(e){
        let text=e.target.result;
        let xml=new DOMParser().parseFromString(text,"text/xml");
        let pts=[];
        xml.querySelectorAll("wpt,rtept,trkpt").forEach(n=>{
            pts.push([parseFloat(n.getAttribute("lat")),parseFloat(n.getAttribute("lon"))]);
        });
        if(pts.length==0){alert("GPX 裡沒有點位"); return;}
        document.getElementById("coords").value = pts.map(p=>p.join(",")).join("\n");
        loadPoints();
    };
    reader.readAsText(file);
}

// -------------------- 觸發檔案選擇 --------------------
function selectGPX(){ document.getElementById("gpxFile").click(); }

document.getElementById("gpxFile").addEventListener("change", importGPX);
document.getElementById("speed").addEventListener("input", updateStats);

// -------------------- 修正地圖尺寸 --------------------
window.addEventListener("load",()=>{ setTimeout(()=>map.invalidateSize(),200); });
