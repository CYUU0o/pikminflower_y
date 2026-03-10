/* ===============================
   地圖初始化 (HTML: #map | CSS: #map)
=============================== */

let map = L.map("map").setView([23.7,121],7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    attribution:"© OpenStreetMap"
}).addTo(map);

map.on("click", function(){
    removeMarkerMenu();
});


/* ===============================
   全域變數 (對應所有 marker、list、panel)
=============================== */

let markers = [];           // 所有 marker
let line = null;            // 路線 polyline
let currentMenu = null;     // Marker menu
let selectedMarker = null;  // 當前選中 marker


/* ===============================
   Marker Icon (CSS: .circle-marker)
=============================== */

function createIcon(n){
    return L.divIcon({
        className: "custom-marker",
        html: `<div class="marker-img">${n}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26]
    });
}


/* ===============================
   建立 Marker + 81m 範圍圈
   HTML: list-item
   CSS : .circle-marker .selected .moving
=============================== */

function createMarker(p,i){

    /* Marker */
    let m = L.marker(p,{
        icon:createIcon(i+1),
        draggable:false
    }).addTo(map);

    /* 範圍圈 (直徑 81m) */
    let circle = L.circle(p,{
        radius:40.5,        // 81m ÷ 2
        color:"#888",
        weight:1,
        dashArray:"5,5",
        fill:false,
        interactive:false
    }).addTo(map);

    /* 圈圈放到 marker 下層 */
    circle.bringToBack();

    /* 綁定 circle */
    m.circle = circle;
   
    m.on("move", function(e){
        if(m.circle){
            m.circle.setLatLng(e.latlng);
        }
    });
   
    /* Marker Click */

    m.on("click",function(){

        removeMarkerMenu();

        if(selectedMarker && selectedMarker !== m){
            resetMarker(selectedMarker);
        }

        selectedMarker = m;

        if(m._icon){
            m._icon.classList.add("selected");
        }

        showMarkerMenu(m);
    });

    return m;
}


/* ===============================
   顯示 Marker 選單 (HTML: .marker-menu, button | CSS: .marker-menu, .marker-menu button)
=============================== */

function showMarkerMenu(marker){

    removeMarkerMenu(); // 先關閉舊 menu

    selectedMarker = marker;

    let index = markers.indexOf(marker);

    let menu = document.createElement("div");
    menu.className = "marker-menu";

    menu.innerHTML = `
        <button onclick="enableMove(${index})">移動</button>
        <button onclick="deletePoint(${index})">刪除</button>
    `;

    // 防止點 menu 時觸發 map click
    menu.addEventListener("click", e => e.stopPropagation());

    map.getContainer().appendChild(menu);

    // 取得 marker 畫面位置
    let pos = map.latLngToContainerPoint(marker.getLatLng());

    menu.style.position = "absolute";
    menu.style.left = (pos.x - 30) + "px";
    menu.style.top = (pos.y + 30) + "px";
    menu.style.zIndex = 9999;

    marker.menuDiv = menu;
}

map.on("click", function(){
    removeMarkerMenu();
});

function removeMarkerMenu(){

    if(selectedMarker && selectedMarker.menuDiv){
        selectedMarker.menuDiv.remove();
        selectedMarker.menuDiv = null;
    }
}


/* ===============================
   Marker 可拖曳 (CSS: .moving)
=============================== */

function enableMove(i){

    let m = markers[i];

    removeMarkerMenu();

    resetMarker(m);

    selectedMarker = m;

    m.dragging.enable();

    if(m._icon){
        m._icon.classList.add("moving");
    }

    m.once("dragend",function(){

        m.dragging.disable();

        resetMarker(m);

        refreshMarkers();

        selectedMarker = null;

    });
}


/* ===============================
   重置 Marker (CSS: .selected, .moving)
=============================== */

function resetMarker(m){
    if(m && m._icon){
        m._icon.classList.remove("moving");
        m._icon.classList.remove("selected");
    }
}


/* ===============================
   解析座標 (HTML: #coords)
=============================== */

function parse(){

    let text = document.getElementById("coords").value.trim();

    let lines = text.split("\n");

    let pts=[];

    lines.forEach(l=>{

        let p = l.trim().split(/[ ,]+/);

        if(p.length>=2){

            let lat=parseFloat(p[0]);
            let lon=parseFloat(p[1]);

            if(!isNaN(lat)&&!isNaN(lon)){
                pts.push([lat,lon]);
            }
        }

    });

    return pts;
}


/* ===============================
   載入座標 (HTML: #coords, #list, CSS: .list-item)
=============================== */

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


/* ===============================
   清空地圖 (HTML: #map, #list)
=============================== */

function clearMap(){

    markers.forEach(m=>{
        if(m.circle){
            map.removeLayer(m.circle);
        }

        map.removeLayer(m);
    });

    markers = [];

    if(line){
        map.removeLayer(line);
    }

    selectedMarker = null;
}


/* ===============================
   畫線 (CSS: L.polyline)
=============================== */

function drawLine(fit=false){

    if(line){
        map.removeLayer(line);
    }

    let pts = markers.map(m=>m.getLatLng());

    line = L.polyline(pts,{
        color:"#ff3333",
        weight:5,
        opacity:0.85
    }).addTo(map);

    if(fit && pts.length>0){
        map.fitBounds(line.getBounds());
    }

}


/* ===============================
   Marker刷新 (HTML: #list, CSS: .circle-marker)
=============================== */

function refreshMarkers(){

    markers.forEach((m,i)=>{
        m.setIcon(createIcon(i+1));
    });

    drawLine();

    buildList();

    updateStats();

}


/* ===============================
   清單建立 (HTML: #list, CSS: .list-item, .num, .coord, .marker-list-btn)
=============================== */

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
        <button class="marker-list-btn up">⬆</button>
        <button class="marker-list-btn down">⬇</button>
        </span>
        `;

        list.appendChild(div);

        div.querySelector(".up").onclick=()=>moveUp(i);
        div.querySelector(".down").onclick=()=>moveDown(i);

    });

}


/* ===============================
   上下移動 (HTML: #list)
=============================== */

function moveUp(i){

    if(i===0) return;

    [markers[i-1],markers[i]]=[markers[i],markers[i-1]];

    refreshMarkers();
}

function moveDown(i){

    if(i===markers.length-1) return;

    [markers[i],markers[i+1]]=[markers[i+1],markers[i]];

    refreshMarkers();
}


/* ===============================
   刪除 Marker (HTML: #list, CSS: .marker-list-btn)
=============================== */

function deletePoint(i){

    removeMarkerMenu();

    let m = markers[i];

    if(m.circle){
        map.removeLayer(m.circle);
    }

    map.removeLayer(m);

    markers.splice(i,1);

    refreshMarkers();
}

/* ===============================
   路徑閉合 (HTML: #coords, #map, #list)
=============================== */

function autoClose(){

    let pts = parse();

    if(pts.length === 0) return;

    let first = pts[0];

    let lat = (first[0] + 0.000001).toFixed(6);
    let lon = (first[1] + 0.000001).toFixed(6);

    let textarea = document.getElementById("coords");

    textarea.value += `\n${lat},${lon}`;

    // ⭐ 重新載入地圖
    loadPoints();

}


/* ===============================
   距離計算 (HTML: #list)
=============================== */

function calcDistance(){

    let d=0;

    for(let i=1;i<markers.length;i++){

        let a=markers[i-1].getLatLng();
        let b=markers[i].getLatLng();

        d+=map.distance(a,b);

    }

    return d/1000;
}


/* ===============================
   更新統計 (速度、棵數、距離、時間、花瓣數)
=============================== */
function updateStats(){

    // 棵數
    document.getElementById("count").innerText = markers.length;

    // 距離 (km)
    let dist = calcDistance();
    document.getElementById("distance").innerText = dist.toFixed(2);

    // 時間 (分鐘)
    let speed = parseFloat(document.getElementById("speed").value);
    let minutes = (dist / speed) * 60;
    document.getElementById("time").innerText = minutes.toFixed(1);

    // 花瓣數
    let level = parseInt(document.getElementById("level").value);
    let seconds = minutes * 60;

    let divisor;
    if(level <= 6){
        divisor = 30;
    }
    else if(level <= 8){
        divisor = 20;
    }
    else if(level <= 14){
        divisor = 15;
    }
    else if(level <= 54){
        divisor = 12;
    }
    else{
        divisor = 10;
    }

    let petals = seconds / divisor;

    // 無條件進位
    document.getElementById("petals").innerText = Math.ceil(petals);
}


    document.getElementById("speed").addEventListener("input", updateStats);
    document.getElementById("level").addEventListener("input", updateStats);


/* ===============================
   GPX 匯出 (HTML: #filename)
=============================== */

function downloadGPX(){

    let pts = markers.map(m=>m.getLatLng());

    // 取得使用者選擇的 GPX 類型
    let type = document.querySelector('input[name="gpxType"]:checked').value;

    let trk="";

    if(type==="wpt"){

        pts.forEach(p=>{
            trk+=`<wpt lat="${p.lat}" lon="${p.lng}"></wpt>\n`;
        });

    }else if(type==="rte"){

        pts.forEach(p=>{
            trk+=`<rtept lat="${p.lat}" lon="${p.lng}"></rtept>\n`;
        });

    }else if(type==="trk"){

        pts.forEach(p=>{
            trk+=`<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>\n`;
        });

    }

    // GPX 主體
    let body="";

    if(type==="wpt"){

        body = trk;

    }else if(type==="rte"){

        body = `<rte>
<name>Route</name>
${trk}
</rte>`;

    }else if(type==="trk"){

        body = `<trk>
<name>Track</name>
<trkseg>
${trk}
</trkseg>
</trk>`;

    }

    let gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Tool" xmlns="http://www.topografix.com/GPX/1/1">
${body}
</gpx>`;

    let filenameInput=document.getElementById("filename").value.trim();

    let today = new Date().toISOString().slice(0,10);

    let filename = filenameInput ?
    (filenameInput.endsWith(".gpx") ? filenameInput : filenameInput + ".gpx")
    :
    `PIKMIN路徑${markers.length}棵_${today}_${type.toUpperCase()}.gpx`

    let blob=new Blob([gpx],{type:"application/gpx+xml"});

    let url=URL.createObjectURL(blob);

    let a=document.createElement("a");

    a.href=url;
    a.download=filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}


/* ===============================
   GPX 匯入 (HTML: #gpxFile, #coords, #map, #list)
=============================== */

function importGPX(){

    let file=document.getElementById("gpxFile").files[0];

    if(!file) return;

    let reader=new FileReader();

    reader.onload=function(e){

        let text=e.target.result;

        let parser=new DOMParser();

        let xml=parser.parseFromString(text,"text/xml");

        let pts=[];

        xml.querySelectorAll("wpt,rtept,trkpt").forEach(n=>{
            pts.push([
                parseFloat(n.getAttribute("lat")),
                parseFloat(n.getAttribute("lon"))
            ]);
        });

        if(pts.length===0){
            alert("GPX 裡沒有座標");
            return;
        }

        let txt="";

        pts.forEach(p=>{
            txt+=p[0]+","+p[1]+"\n";
        });

        document.getElementById("coords").value=txt.trim();

        loadPoints();

    };

    reader.readAsText(file);

}

function selectGPX(){
    document.getElementById("gpxFile").click();
}

document.getElementById("gpxFile").addEventListener("change",importGPX);
document.getElementById("speed").oninput=updateStats;


/* ===============================
   地圖尺寸修正 (HTML: #map)
=============================== */

window.addEventListener("load",()=>{
    setTimeout(()=>map.invalidateSize(),200);
});

















