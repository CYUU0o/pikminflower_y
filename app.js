/* =====================================
   地圖初始化
===================================== */

let map = L.map("map").setView([23.7,121],7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let markers = [];
let line;


/* =====================================
   解析文字座標
===================================== */

function parse(){

    let text = document.getElementById("coords").value.trim();

    let lines = text.split("\n");

    let pts = [];

    lines.forEach(l=>{

        let p = l.trim().split(/[ ,]+/);

        if(p.length >= 2){

            let lat = parseFloat(p[0]);
            let lon = parseFloat(p[1]);

            if(!isNaN(lat)&&!isNaN(lon)) pts.push([lat,lon]);

        }

    });

    return pts;

}


/* =====================================
   Marker 圖示
===================================== */

function createIcon(n){

    return L.divIcon({

        className:"",
        html:`<div class="circle-marker">${n}</div>`,
        iconSize:[22,22]

    });

}


/* =====================================
   建立 Marker
===================================== */

function createMarker(pos,i){

    let m = L.marker(pos,{
        draggable:false,
        icon:createIcon(i+1)
    }).addTo(map);

    m.on("drag", updateLine);

    /* Marker 點擊選單 */

    m.on("click",function(){

        let menu = `
        <b>座標 ${i+1}</b><br><br>
        <button onclick="enableMove(${i})">移動</button>
        <button onclick="moveUp(${i})">前移</button>
        <button onclick="moveDown(${i})">後移</button>
        <button onclick="deletePoint(${i})">刪除</button>
        `;

        m.bindPopup(menu).openPopup();

    });

    return m;

}


/* =====================================
   載入座標 -> 地圖
===================================== */

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


/* =====================================
   啟用 Marker 移動
===================================== */

function enableMove(i){

    let m = markers[i];

    m.dragging.enable();

    m.once("dragend",function(){

        m.dragging.disable();

        refreshMarkers();

    });

}


/* =====================================
   Marker 順序控制
===================================== */

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


/* =====================================
   刪除 Marker
===================================== */

function deletePoint(i){

    map.removeLayer(markers[i]);

    markers.splice(i,1);

    refreshMarkers();

}


/* =====================================
   更新 Marker
===================================== */

function refreshMarkers(){

    markers.forEach((m,i)=>{

        m.setIcon(createIcon(i+1));

    });

    drawLine();
    buildList();
    updateStats();

}


/* =====================================
   清除地圖
===================================== */

function clearMap(){

    markers.forEach(m=>map.removeLayer(m));

    markers=[];

    if(line) map.removeLayer(line);

}


/* =====================================
   繪製路線
===================================== */

function drawLine(fit=false){

    if(line) map.removeLayer(line);

    let pts = markers.map(m=>m.getLatLng());

    line = L.polyline(pts,{color:"red"}).addTo(map);

    if(fit && pts.length>0){

        map.fitBounds(line.getBounds());

    }

}


function updateLine(){

    drawLine();

    updateStats();

}


/* =====================================
   座標列表
===================================== */

function buildList(){

    let list = document.getElementById("list");

    list.innerHTML="";

    markers.forEach((m,i)=>{

        let p=m.getLatLng();

        let div=document.createElement("div");

        div.className="list-item";

        div.innerHTML=`
        <span class="num">${i+1}</span>
        <span class="coord">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</span>
        `;

        list.appendChild(div);

    });

}


/* =====================================
   路徑閉合
===================================== */

function autoClose(){

    let pts=parse();

    if(pts.length==0) return;

    let s=pts[0];

    let lat=(s[0]+0.000001).toFixed(6);
    let lon=(s[1]+0.000001).toFixed(6);

    document.getElementById("coords").value+=`\n${lat},${lon}`;

}


/* =====================================
   計算距離
===================================== */

function calcDistance(){

    let d=0;

    for(let i=1;i<markers.length;i++){

        let a=markers[i-1].getLatLng();
        let b=markers[i].getLatLng();

        d+=map.distance(a,b);

    }

    return d/1000;

}


/* =====================================
   更新統計
===================================== */

function updateStats(){

    document.getElementById("count").innerText=markers.length;

    let dist=calcDistance();

    document.getElementById("distance").innerText=dist.toFixed(2);

    let speed=parseFloat(document.getElementById("speed").value);

    let minutes=(dist/speed)*60;

    document.getElementById("time").innerText=minutes.toFixed(1);

}


/* =====================================
   下載 GPX
===================================== */

function downloadGPX(){

    let pts=markers.map(m=>m.getLatLng());

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

    let filename;

    if(filenameInput){

        if(!filenameInput.toLowerCase().endsWith(".gpx")){
            filenameInput+=".gpx";
        }

        filename=filenameInput;

    }else{

        let now=new Date();

        let Y=now.getFullYear();
        let M=("0"+(now.getMonth()+1)).slice(-2);
        let D=("0"+now.getDate()).slice(-2);
        let h=("0"+now.getHours()).slice(-2);
        let m=("0"+now.getMinutes()).slice(-2);

        filename=`pikmingpx_${Y}-${M}-${D}_${h}-${m}.gpx`;

    }

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


/* =====================================
   匯入 GPX
===================================== */

function importGPX(){

    let file=document.getElementById("gpxFile").files[0];

    if(!file) return;

    let reader=new FileReader();

    reader.onload=function(e){

        let text=e.target.result;

        let parser=new DOMParser();

        let xml=parser.parseFromString(text,"text/xml");

        let pts=[];

        xml.querySelectorAll("wpt").forEach(n=>pts.push([parseFloat(n.getAttribute("lat")),parseFloat(n.getAttribute("lon"))]));

        xml.querySelectorAll("rtept").forEach(n=>pts.push([parseFloat(n.getAttribute("lat")),parseFloat(n.getAttribute("lon"))]));

        xml.querySelectorAll("trkpt").forEach(n=>pts.push([parseFloat(n.getAttribute("lat")),parseFloat(n.getAttribute("lon"))]));

        if(pts.length==0){

            alert("GPX 裡沒有點位");

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


/* =====================================
   事件
===================================== */

document.getElementById("gpxFile").addEventListener("change",importGPX);

document.getElementById("speed").oninput=updateStats;

window.addEventListener("load",function(){

    setTimeout(function(){

        map.invalidateSize();

    },200);

});
