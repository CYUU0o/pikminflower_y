/* ===============================
   地圖初始化
=============================== */

let map = L.map("map").setView([23.7,121],7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    attribution:"© OpenStreetMap"
}).addTo(map);

map.on("click", function(){
    removeMarkerMenu();
});

/* ===============================
   全域變數
=============================== */

let markers = [];
let line = null;
let selectedMarker = null;


/* ===============================
   Marker Icon
=============================== */

function createIcon(n){
    return L.divIcon({
        className:"",
        html:`<div class="circle-marker">${n}</div>`,
        iconSize:[22,22]
    });
}


/* ===============================
   建立 Marker
=============================== */

function createMarker(p,i){

    let m = L.marker(p,{
        icon:createIcon(i+1),
        draggable:false
    }).addTo(map);

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
   顯示 Marker 選單
=============================== */

function showMarkerMenu(m){
    removeMarkerMenu();

    let index = markers.indexOf(m);

    let menu = document.createElement("div");
    menu.className = "marker-menu";

    menu.innerHTML = `
    <button onclick="enableMove(${index})">移動</button>
    <button onclick="deletePoint(${index})">刪除</button>
    `;

   menu.addEventListener("click", function(e){
    e.stopPropagation();
});

    map.getContainer().appendChild(menu);

    let pos = map.latLngToContainerPoint(m.getLatLng());

    menu.style.position="absolute";
    menu.style.left = (pos.x - 45) + "px";
    menu.style.top  = (pos.y + 30) + "px";
    menu.style.zIndex = 9999;

}

/* ===============================
   刪除選單
=============================== */

function removeMarkerMenu(){

    if(selectedMarker && selectedMarker.menuDiv){
        selectedMarker.menuDiv.remove();
        selectedMarker.menuDiv = null;
    }

    if(selectedMarker){
        resetMarker(selectedMarker);
        selectedMarker = null;
    }
}


/* ===============================
   Marker 可拖曳
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
   重置 Marker
=============================== */

function resetMarker(m){
    if(m && m._icon){
        m._icon.classList.remove("moving");
        m._icon.classList.remove("selected");
    }
}


/* ===============================
   解析座標
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
   載入座標
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
   清空地圖
=============================== */

function clearMap(){

    markers.forEach(m=>map.removeLayer(m));

    markers=[];

    if(line){
        map.removeLayer(line);
    }

    selectedMarker=null;
}


/* ===============================
   畫線
=============================== */

function drawLine(fit=false){

    if(line){
        map.removeLayer(line);
    }

    let pts = markers.map(m=>m.getLatLng());

    line = L.polyline(pts,{color:"red"}).addTo(map);

    if(fit && pts.length>0){
        map.fitBounds(line.getBounds());
    }

}


/* ===============================
   Marker刷新
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
   清單建立
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
   上下移動
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
   刪除
=============================== */

function deletePoint(i){

    map.removeLayer(markers[i]);

    markers.splice(i,1);

    refreshMarkers();
}

/* ===============================
   路徑閉合
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
   距離計算
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
   更新統計
=============================== */

function updateStats(){

    document.getElementById("count").innerText = markers.length;

    let dist = calcDistance();

    document.getElementById("distance").innerText = dist.toFixed(2);

    let speed = parseFloat(document.getElementById("speed").value);

    let minutes = (dist/speed)*60;

    document.getElementById("time").innerText = minutes.toFixed(1);

}


/* ===============================
   GPX 匯出
=============================== */

function downloadGPX(){

    let pts = markers.map(m=>m.getLatLng());

    let trk="";

    pts.forEach(p=>{
        trk+=`<rtept lat="${p.lat}" lon="${p.lng}"></rtept>\n`;
    });

    let gpx=`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Tool" xmlns="http://www.topografix.com/GPX/1/1">
<rte>
<name>Route</name>
${trk}
</rte>
</gpx>`;

    let filenameInput=document.getElementById("filename").value.trim();

    let filename= filenameInput ?
    (filenameInput.endsWith(".gpx")?filenameInput:filenameInput+".gpx")
    :
    "pikmin_route.gpx";

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
   GPX 匯入
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
   地圖尺寸修正
=============================== */

window.addEventListener("load",()=>{
    setTimeout(()=>map.invalidateSize(),200);
});





