/* ===============================
   地圖初始化
=============================== */

let map = L.map("map").setView([23.7,121],7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19
}).addTo(map);


/* ===============================
   全域變數
=============================== */

let markers = [];
let line = null;

let activeMarker = null;
let movingMarker = null;


/* ===============================
   Marker icon
=============================== */

function createIcon(num){
    return L.divIcon({
        className:"",
        html:`<div class="circle-marker">${num}</div>`,
        iconSize:[22,22],
        iconAnchor:[11,11]
    });
}


/* ===============================
   建立 marker
=============================== */

function createMarker(p,i){

    let marker = L.marker(p,{
        icon:createIcon(i+1),
        draggable:false
    }).addTo(map);

    marker.on("click",()=>{

        if(movingMarker===marker) return;

        activeMarker = marker;

        showMarkerMenu(marker);

        let el = marker.getElement();
        if(el) el.classList.add("selected");

    });

    marker.on("dragend",()=>{

        marker.dragging.disable();

        let el = marker.getElement();

        if(el){
            el.classList.remove("moving");
        }

        movingMarker = null;

        updateLine();
        buildList();

    });

    return marker;
}


/* ===============================
   Marker 選單
=============================== */

function showMarkerMenu(marker){

    removeMarkerMenu();

    let menu = document.createElement("div");
    menu.className="marker-menu";

    menu.innerHTML=`
    <button onclick="enableMove()">移動</button>
    <button onclick="deletePoint()">刪除</button>
    `;

    document.body.appendChild(menu);

    let pos = map.latLngToContainerPoint(marker.getLatLng());

    let mapRect = map.getContainer().getBoundingClientRect();

    menu.style.position="absolute";
    menu.style.left = mapRect.left + pos.x - 40 + "px";
    menu.style.top  = mapRect.top + pos.y + 25 + "px";

}


/* ===============================
   移動 marker
=============================== */

function enableMove(){

    if(!activeMarker) return;

    let el = activeMarker.getElement();

    if(el){

        el.classList.remove("selected");
        el.classList.add("moving");

    }

    activeMarker.dragging.enable();

    movingMarker = activeMarker;

    removeMarkerMenu();

}


/* ===============================
   刪除 marker
=============================== */

function deletePoint(){

    if(!activeMarker) return;

    map.removeLayer(activeMarker);

    markers = markers.filter(m=>m!==activeMarker);

    activeMarker=null;

    removeMarkerMenu();

    refreshMarkers();

}


/* ===============================
   移除選單
=============================== */

function removeMarkerMenu(){

    document.querySelectorAll(".marker-menu").forEach(e=>e.remove());

}


/* ===============================
   解析座標
=============================== */

function parse(){

    let text=document.getElementById("coords").value.trim();

    let lines=text.split("\n");

    let pts=[];

    lines.forEach(l=>{

        let p=l.trim().split(/[ ,]+/);

        if(p.length>=2){

            let lat=parseFloat(p[0]);
            let lon=parseFloat(p[1]);

            if(!isNaN(lat)&&!isNaN(lon)) pts.push([lat,lon]);

        }

    });

    return pts;

}


/* ===============================
   載入座標
=============================== */

function loadPoints(){

    clearMap();

    let pts=parse();

    pts.forEach((p,i)=>{

        let m=createMarker(p,i);

        markers.push(m);

    });

    drawLine(true);

    buildList();

    updateStats();

}


/* ===============================
   線段
=============================== */

function drawLine(fit=false){

    if(line) map.removeLayer(line);

    let pts=markers.map(m=>m.getLatLng());

    line=L.polyline(pts,{color:"red"}).addTo(map);

    if(fit && pts.length>0) map.fitBounds(line.getBounds());

}

function updateLine(){

    drawLine();

    updateStats();

}


/* ===============================
   清空地圖
=============================== */

function clearMap(){

    markers.forEach(m=>map.removeLayer(m));

    markers=[];

    if(line) map.removeLayer(line);

}


/* ===============================
   座標清單
=============================== */

function buildList(){

    let list=document.getElementById("list");

    list.innerHTML="";

    markers.forEach((m,i)=>{

        let p=m.getLatLng();

        let div=document.createElement("div");

        div.className="list-item";

        div.innerHTML=`
        <span class="num">${i+1}</span>
        <span class="coord">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</span>
        <span>
        <button onclick="moveUp(${i})">⬆</button>
        <button onclick="moveDown(${i})">⬇</button>
        </span>
        `;

        list.appendChild(div);

    });

}


/* ===============================
   marker順序刷新
=============================== */

function refreshMarkers(){

    markers.forEach((m,i)=>{

        m.setIcon(createIcon(i+1));

    });

    updateLine();

    buildList();

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

function updateStats(){

    document.getElementById("count").innerText=markers.length;

    let dist=calcDistance();

    document.getElementById("distance").innerText=dist.toFixed(2);

    let speed=parseFloat(document.getElementById("speed").value);

    let minutes=(dist/speed)*60;

    document.getElementById("time").innerText=minutes.toFixed(1);

}


/* ===============================
   地圖初始化修正
=============================== */

window.addEventListener("load",()=>{

    setTimeout(()=>map.invalidateSize(),200);

});
