"use strict";
/* opening */
'use strict';

// A chapter is a separate aquarium. Established tanks and standalone studies keep their own saves.
const visitName=new URLSearchParams(location.search).get('visit');
const letterVisit=['letter','fieldbook'].includes(visitName);
const visitSlot=visitName==='fieldbook'?'fieldbook':'letter-visit';
const openingKey=letterVisit?'aquarium.'+visitSlot+'.chapter.1':'aquarium.arrival.chapter.1',firstFishId='arrival-guppy';
function storedValue(key){try{return localStorage.getItem(key);}catch{return null;}}
function chapterRoute(){
  const params=new URLSearchParams(location.search);
  if(['scene','care','watch','animal','edit'].some(k=>params.has(k)))return false;
  if(params.get('chapter')==='arrival')return true;
  const old=['aquarium.residents.1','aquarium.care.1','aquarium.light-study.layout.1','aquarium.front-glass.1','aquarium.zebra-nerite.1','aquarium.light-study.layout.1.started.islands'];
  if(old.some(k=>storedValue(k)!==null))return false;
  return !params.has('panel')||storedValue(openingKey)!==null;
}
const chapterTank=chapterRoute();
globalThis.tankSavePrefix=chapterTank?(letterVisit?visitSlot+'.':'arrival.'):'';
const chapterSteps=['letter','wipe','fish','feed','home'];
let openingStep=chapterTank?(storedValue(openingKey)||'letter'):'home',openingBusy=false;
if(!chapterSteps.includes(openingStep))openingStep='letter';
let feedingArmed=false,awaitingFirstBite=false;
let wipedDistance=0,activeDrawer=null,autoWipe=null;
function openingActive(){return chapterTank&&openingStep!=='home';}
function writeStep(step){
  openingStep=step;
  try{localStorage.setItem(openingKey,step);}catch{}
}
function starterLayout(){
  return [piece('arrival-wood','branch',.31,.38,.86,false,null,.5,3),
    piece('arrival-stone','pebble',.44,.53,.79),piece('arrival-fern','anubias',.31,.38,1.14,false,'arrival-wood',.42)];
}
function prepareOpening(){
  if(!chapterTank)return;
  if(!readPopulation()){
    for(const a of residents())removeResident(a);
    for(const k of Object.keys(lastNumber))delete lastNumber[k];
    writeResidents();
  }
  if(!storedValue(openingKey)){
    glassStart=careNow()-49*algaeHour;glassRedraw=true;algaeChanged=true;
    saveGlass();saveLayout(layout);writeStep('letter');
  }
  if(openingActive()){
    if(fish.some(a=>a.careId===firstFishId))writeStep('feed');
    else if(openingStep==='feed')writeStep('fish');
  }
  if(openingStep==='wipe')wipingGlass=true;
  if(openingActive())pan=.085;
}
const openingLines={
  letter:['阿禾的留条','窗边的缸，留给你了。','搬家带不走它。水泵一直开着，那株水榕也冒了新叶。刮片放在缸边，你收拾好了，我就把那条小孔雀送过来。','拿起刮片'],
  wipe:['缸边的刮片','把这片玻璃擦亮。','在左边的绿藻上来回擦一小块。','帮我擦一下'],
  fish:['第一位住客','阿禾把鱼送来了。','一条橘尾的小孔雀。把网轻轻放低，让它自己游出来。','接它入缸'],
  feed:['桌上的饵瓶','给小孔雀喂第一餐。','先拿起饵瓶，再轻点鱼头前方的水，让它看见飘下来的食物。','拿起饵瓶']
};
function refreshOpening(){
  const active=openingActive();
  document.body.classList.toggle('in-opening',active);
  $('#opening-note').hidden=!active;
  if(!active)return;
  const [from,title,copy,action]=openingLines[openingStep];
  $('#opening-from').textContent=from;$('#opening-title').textContent=title;$('#opening-copy').textContent=openingStep==='letter'&&mood[3]>.44?'我搬走时给你留了盏缸灯。水泵还开着，沉木上的水榕又冒了新叶。刮片就在手边，等你擦亮玻璃，我把那条小孔雀送过来。':copy;
  if(openingStep==='feed'&&feedingArmed)$('#opening-copy').textContent='饵瓶已拿在手里。轻点鱼前方的水，落下一小撮就够了。';
  if(openingStep==='feed'&&awaitingFirstBite)$('#opening-copy').textContent='看看它怎样转身靠近鱼食，等它啄到第一口。';
  $('#opening-action').textContent=openingStep==='feed'&&feedingArmed?'收起饵瓶':action;
  $('#opening-action').disabled=openingBusy||!!introduction||!!autoWipe||(awaitingFirstBite&&openingStep==='feed');
  $('#opening-skip').hidden=openingStep!=='letter';
  $('#opening-skip').disabled=openingBusy;
  $('#opening-note').dataset.step=openingStep;
}
function finishOpeningWipe(){
  if(openingStep!=='wipe'||wipedDistance<30)return;
  autoWipe=null;wipingGlass=false;scraper=null;saveGlass();
  writeStep('fish');refresh();refreshOpening();
}
function assistOpeningWipe(){
  const c=camera(),visible=glassSpots.filter(s=>s.x>c.left+16&&s.x<c.left+c.w-16);
  const patch=visible.reduce((best,s)=>glassStrength(s,careNow())>glassStrength(best,careNow())?s:best,visible[0]);
  if(!patch||glassStrength(patch,careNow())<.02){wipedDistance=30;finishOpeningWipe();return;}
  autoWipe={x:patch.x,y:patch.y,t:0,last:{x:patch.x-35,y:patch.y},pass:new Map()};refreshOpening();
}
function stepOpening(dt){
  if(awaitingFirstBite&&(!food.some(p=>!p.taken)&&!fish.some(f=>f.target?.mass)||time-lastFeed>14)){
    awaitingFirstBite=false;refreshOpening();
  }
  if(!autoWipe)return;
  const w=autoWipe;w.t=Math.min(1,w.t+dt/.95);
  const p={x:w.x-35*Math.cos(w.t*Math.PI*2),y:w.y-4*Math.sin(w.t*Math.PI*2)};
  scraper={...p,r:23,angle:Math.PI/2};
  if(wipeWithNotes(w.last,p,23,w.pass,careNow(),5,.8,Math.PI/2))wipedDistance+=Math.hypot(p.x-w.last.x,p.y-w.last.y);
  w.last=p;
  if(w.t===1){finishScrapeNotes(w.pass,true);autoWipe=null;scraper=null;wipedDistance=30;finishOpeningWipe();}
}
async function receiveFirstFish(skip=false){
  if(openingBusy||introduction)return;
  openingBusy=true;refreshOpening();
  try{
    const change=await changeResidents(()=>{
      if(fish.some(f=>f.careId===firstFishId))return false;
      const cam=camera(),x=clamp(cam.left+cam.w*.52,left+40,right-40);
      const f=newResident('guppy',firstFishId,1,x,surface+75,.72);
      f.fullness=.23;startIntroduction([f],cam);return true;
    });
    writeStep(skip?'home':'feed');
    if(!change.saved)message('本次入缸已完成，浏览器未能保存。');
  }finally{openingBusy=false;refresh();refreshOpening();}
}
function finishOpeningFeed(){
  if(chapterTank&&openingStep==='feed'&&!introduction){writeStep('home');awaitingFirstBite=false;refreshOpening();refresh();}
}
function roomDrawer(name,focus=false){
  activeDrawer=name;
  document.body.classList.toggle('choosing-care',name==='care');
  for(const id of ['care','view']){
    $('#'+id+'-options').hidden=id!==name;
    $('#'+id+'-drawer').setAttribute('aria-expanded',String(id===name));
  }
  if(name==='view'&&focus)$('#view-options').scrollIntoView({block:'nearest'});
}
function setFeedingTool(take){
  feedingArmed=!!take;
  if(take){
    wipingGlass=false;siphoning=false;siphonTip=null;roomDrawer(null);
  }
  $('#feed').setAttribute('aria-pressed',String(feedingArmed));
  $('#feeding-guide').hidden=!feedingArmed||openingActive();
  refreshOpening();refresh();
}
function givePinch(point){
  if(!feedingArmed||!inFeedingWater(point))return;
  if(scatter(point.x,camera().top)){
    awaitingFirstBite=openingStep==='feed';
    setFeedingTool(false);
  }
}
function touchWater(point){
  if(!inFeedingWater(point)||openingActive()&&openingStep!=='feed')return;
  ripples.push({x:point.x,y:surface-6,age:0,strength:.36});
  const a=fish.filter(f=>!f.inNet&&!f.target&&!f.trip?.onPath).sort((a,b)=>Math.abs(a.x-point.x)-Math.abs(b.x-point.x))[0];
  if(!a||Math.abs(a.x-point.x)>310||time<(a.nextTap||0))return;
  a.nextTap=time+4;
  a.look={x:mix(a.x,point.x,.32),y:Math.max(surface+12,a.y-14),side:Math.abs(point.x-a.x)>15?Math.sign(point.x-a.x):a.facing,from:time,until:time+1.35};
}
function bindRoom(){
  $('#visit-letter').hidden=letterVisit;
  const viewOptions=$('#view-options');document.querySelector('header').after(viewOptions);
  for(const id of ['care','view']){
    $('#'+id+'-drawer').addEventListener('click',()=>roomDrawer(activeDrawer===id?null:id,true));
    document.querySelector('[data-close-drawer="'+id+'"]').addEventListener('click',()=>{
      roomDrawer(null);$('#'+id+'-drawer').focus({preventScroll:true});
    });
  }
  for(const id of ['edit','residents-open','watch'])$('#'+id).addEventListener('click',()=>roomDrawer(null));
  for(const id of ['wipe-glass','siphon'])$('#'+id).addEventListener('click',()=>{
    roomDrawer(null);
  });
  $('#put-away').addEventListener('click',()=>setFeedingTool(false));
  for(const id of ['care-drawer','view-drawer','residents-open','edit','watch'])$('#'+id).addEventListener('click',()=>{
    if(feedingArmed)setFeedingTool(false);
  });
  $('#fine-filter').addEventListener('click',()=>roomDrawer(null));
  canvas.addEventListener('keydown',e=>{
    if(!feedingArmed||!['Enter',' '].includes(e.key))return;
    e.preventDefault();const c=camera(),a=fish.find(f=>!f.inNet&&f.x>c.left&&f.x<c.left+c.w);
    givePinch({x:a?clamp(a.x+a.facing*a.width*.68,c.left+16,c.left+c.w-16):c.left+c.w*.50,y:Math.max(surface+8,c.top+12)});
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&feedingArmed)setFeedingTool(false);
    if(e.key==='Escape'&&activeDrawer){const old=activeDrawer;roomDrawer(null);$('#'+old+'-drawer').focus();}
  });
  $('#opening-action').addEventListener('click',()=>{
    if(!ready||openingBusy||introduction)return;
    if(openingStep==='letter'){writeStep('wipe');wipingGlass=true;refresh();refreshOpening();}
    else if(openingStep==='wipe')assistOpeningWipe();
    else if(openingStep==='fish')receiveFirstFish();
    else if(openingStep==='feed')setFeedingTool(!feedingArmed);
  });
  $('#opening-skip').addEventListener('click',()=>receiveFirstFish(true));
  window.addEventListener('storage',e=>{
    if(chapterTank&&e.key===openingKey&&chapterSteps.includes(e.newValue)){
      openingStep=e.newValue;autoWipe=null;wipingGlass=openingStep==='wipe';if(ready){refresh();refreshOpening();}
    }
  });
}

;
/* sand */
'use strict';

// In the source plate the exposed sand has four distinct inner glass corners.
const sandCorners={back:[[135/1536,752/1024],[1402/1536,749/1024]],front:[[88/1536,846/1024],[1447/1536,841/1024]]};
const rearWidth=sandCorners.back[1][0]-sandCorners.back[0][0],frontWidth=sandCorners.front[1][0]-sandCorners.front[0][0];
function sandRow(z){
  const ratio=rearWidth/mix(frontWidth,rearWidth,clamp(z)),t=clamp(z)*ratio;
  const [a,b]=sandCorners.back,[c,d]=sandCorners.front;
  return {z:clamp(z),t,ratio,left:W*mix(a[0],c[0],t),right:W*mix(b[0],d[0],t),yl:H*mix(a[1],c[1],t),yr:H*mix(b[1],d[1],t)};
}
function rowYFlat(row,x){return mix(row.yl,row.yr,clamp((x-row.left)/(row.right-row.left)));}
const bedForms={
  flat:Array(15).fill(0),
  left:[41,54,24,9,4, 27,39,15,5,2, 10,14,5,1,0],
  valley:[52,36,4,27,47, 26,23,2,18,31, 8,8,0,5,10],
  right:[4,10,26,54,42, 2,5,17,39,27, 0,1,6,14,10]
};
const bedStyleNames={sand:'自然河砂',pale:'浅色细砂',soil:'深色水草泥'};
function bedFrom(form='flat',style='sand'){return {style,heights:[...bedForms[form]]};}
function formForScene(name){return name==='black-bank'?{style:'soil',heights:[29,49,15,8,22,17,32,6,4,13,2,8,0,1,4]}:name==='fern-bank'?bedFrom('left','pale'):bedFrom();}
let terrain=bedFrom(),activeBed=terrain;
function validBed(value){
  const bed=bedFrom();if(!value)return bed;
  if(Object.hasOwn(bedStyleNames,value.style))bed.style=value.style;
  if(Array.isArray(value.heights)&&value.heights.length===15)
    bed.heights=value.heights.map(h=>Number.isFinite(h)?clamp(Math.round(h),0,54):0);
  return bed;
}
const bedProfiles=new WeakMap();
// Tangents agree at neighbouring controls. A bank keeps its descending flank
// through a control point, while a crest or hollow rounds off without overshoot.
function bedTangent(a,b){return a*b>0?2*a*b/(a+b):0;}
function bedCurve(a,b,ma,mb,t){
  const d=b-a;return a+t*(ma+t*((3*d-2*ma-mb)+t*(ma+mb-2*d)));
}
function profileFor(bed){
  let profile=bedProfiles.get(bed);if(profile)return profile;
  const bands=Array.from({length:3},()=>new Float32Array(W+1));
  for(let j=0;j<3;j++){
    const row=sandRow(j/2),values=bed.heights.slice(j*5,j*5+5);
    const diffs=values.slice(1).map((v,i)=>v-values[i]);
    const tangents=values.map((v,i)=>i===0?diffs[0]:i===4?diffs[3]:bedTangent(diffs[i-1],diffs[i]));
    for(let x=0;x<=W;x++){
      const u=clamp((x-row.left)/(row.right-row.left))*4,i=Math.min(3,Math.floor(u));
      // Vary the length of a slope with depth; keep the sculpting nodes exact.
      const local=u-i,warp=(.075*Math.sin(x*.019+j*1.7)+.063*Math.sin(x*.009-j*.88))*Math.sin(Math.PI*local)**2;
      bands[j][x]=bedCurve(values[i],values[i+1],tangents[i],tangents[i+1],local+warp);
    }
  }
  for(let x=0;x<=W;x++){
    bands[1][x]=Math.max(bands[1][x],bands[2][x]-20);
    bands[0][x]=Math.max(bands[0][x],bands[1][x]-20);
  }
  profile={bands,flat:bed.heights.every(h=>h===0)};bedProfiles.set(bed,profile);return profile;
}
function terrainHeight(x,z){
  const {bands,flat}=profileFor(activeBed);if(flat)return 0;
  const col=clamp(Math.round(x),0,W),a=bands[0][col],b=bands[1][col],c=bands[2][col];
  const ab=b-a,bc=c-b,mid=bedTangent(ab,bc);
  return z<.5?bedCurve(a,b,ab,mid,2*z):bedCurve(b,c,mid,bc,2*z-1);
}
function rowY(row,x){return rowYFlat(row,x)-terrainHeight(x,row.z);}
function sandDepthAt(x,y){
  let lo=0,hi=1;
  for(let i=0;i<12;i++){const mid=(lo+hi)*.5;if(rowY(sandRow(mid),x)<y)lo=mid;else hi=mid;}
  return (lo+hi)*.5;
}
function pieceBedAt(g,x){
  return g.bed+rowY(g.row,x)-rowY(g.row,g.x);
}
const burialPaths=new WeakMap();
function clipPieceAtBed(c,g){
  // The substrate hides the roots. The side and top edges belong to the aquarium,
  // not to a still photograph of this plant.
  let paths=burialPaths.get(activeBed);
  if(!paths){paths=new Map();burialPaths.set(activeBed,paths);}
  const offset=g.bed-rowY(g.row,g.x),key=g.z+'/'+offset.toFixed(2);
  let path=paths.get(key);
  if(!path){
    const front=sandRow(1),l=front.left,r=front.right;
    path=new Path2D();path.moveTo(l,0);path.lineTo(r,0);
    for(let i=100;i>=0;i--){
      const wx=mix(l,r,i/100);
      path.lineTo(wx,rowY(g.row,wx)+offset-1.15+Math.sin(wx*.21+g.z*7)*.8+Math.cos(wx*.13)*.65);
    }
    path.closePath();
    if(paths.size>=120)paths.delete(paths.keys().next().value);
    paths.set(key,path);
  }
  c.clip(path);
}
function projectLateral(x,row){return row.left+(x-sandCorners.front[0][0])*W*row.ratio;}
function lateralAt(x,row){return sandCorners.front[0][0]+(x-row.left)/(W*row.ratio);}
function sandContains(x,y,slop=0){
  const rear=sandRow(0),front=sandRow(1),backY=rowY(rear,x),frontY=rowY(front,x);
  if(y<backY-slop||y>frontY+slop)return false;
  const row=sandRow(sandDepthAt(x,y));
  return x>=row.left-slop&&x<=row.right+slop;
}
function sandPath(c){
  c.beginPath?.();
  const trace=(z,u,first=false)=>{
    const r=sandRow(z),x=mix(r.left,r.right,u),y=rowY(r,x);
    if(first)c.moveTo(x,y);else c.lineTo(x,y);
  };
  trace(0,0,true);
  for(let i=1;i<=64;i++)trace(0,i/64);
  for(let i=1;i<=12;i++)trace(i/12,1);
  for(let i=63;i>=0;i--)trace(1,i/64);
  for(let i=11;i>0;i--)trace(i/12,0);
  c.closePath();
}

// Trace solid runs once. Trim each run against the sand before measuring rotated pieces.
const silhouettes={},poseBounds=new Map();
function traceSilhouette(alpha,w,h){
  const runs=[];let minX=w,maxX=-1,minY=h,maxY=-1;
  for(let y=0;y<h;y++){
    let left=-1;
    for(let x=0;x<=w;x++){
      const solid=x<w&&alpha[y*w+x]>=32;
      if(solid&&left<0)left=x;
      if(!solid&&left>=0){runs.push([left/w,x/w,(y+.5)/h]);minX=Math.min(minX,left);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y+1);left=-1;}
    }
  }
  return {runs,box:[minX/w,minY/h,maxX/w,maxY/h]};
}
function solidExtents(g,drop){
  const mask=silhouettes[g.sprite],ratio=g.height/g.width,clip=drop/g.width;
  const key=[g.sprite,g.sign,Math.round(g.angle*10000),Math.round(clip*10000)].join('/');
  let units=poseBounds.get(key);
  if(!units){
    let left=Infinity,right=-Infinity,top=Infinity;
    for(const [lo,hi,v] of mask.runs){
      const dy=(v-g.pivotY)*ratio;
      let a=(lo-g.pivotX)*g.sign,b=(hi-g.pivotX)*g.sign;
      let ay=g.sin*a+g.cos*dy,by=g.sin*b+g.cos*dy;
      if(ay>clip&&by>clip)continue;
      if(ay>clip){a+=(b-a)*(clip-ay)/(by-ay);ay=clip;}
      if(by>clip){b+=(a-b)*(clip-by)/(ay-by);by=clip;}
      const ax=g.cos*a-g.sin*dy,bx=g.cos*b-g.sin*dy;
      left=Math.min(left,ax,bx);right=Math.max(right,ax,bx);top=Math.min(top,ay,by);
    }
    units={left,right,top};poseBounds.set(key,units);
  }
  return {left:units.left*g.width,right:units.right*g.width,top:units.top*g.width};
}

const sandOutlines=new WeakMap();
function clipSand(c){
  let path=sandOutlines.get(activeBed);
  if(!path){
    path=new Path2D();sandPath(path);sandOutlines.set(activeBed,path);
  }
  c.clip(path);
}

;
/* substrate-art */
'use strict';

// One diffuse microtexture per sediment. Centring its RGB channels removes the studio
// exposure; the tank's depth, slope light and time-of-day grade supply the illumination.
const substrateMinerals={};
async function loadSubstrateMaterials(style){
  await Promise.all(Object.entries({pale:'quartz-grains',soil:'aquasoil-granules'}).map(async ([kind,file])=>{
    if((style&&style!==kind)||substrateMinerals[kind])return;
    const im=new Image();
    im.src='assets/bed/'+file+'.webp';
    try{await im.decode();}
    catch{ return; } // The procedural sediment remains available on a partial asset load.
    const size=256,c=document.createElement('canvas');c.width=c.height=size;
    const g=c.getContext('2d');g.drawImage(im,0,0,size,size);
    const pixels=g.getImageData(0,0,size,size).data;
    const mean=[0,0,0];
    for(let p=0;p<pixels.length;p+=4)for(let k=0;k<3;k++)mean[k]+=pixels[p+k];
    substrateMinerals[kind]={pixels,mean:mean.map(x=>x/(size*size))};
  }));
}

// The neutral plate includes the transmission of the original golden sand through the glass.
// Recover that contribution independently from the glass before assigning a new sediment.
const paintSubstratePhoto = (() => {
  const steps=32, spacing=7, tileSize=256, tileMask=255;
  const firstY=565,lastY=688,scanLeft=67,scanRight=1131;
  const unit=v=>Math.max(0,Math.min(1,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=unit(t);return t*t*(3-2*t);};
  const noise=(x,y,s)=>{
    let n=Math.imul(x+19,374761393)^Math.imul(y+7,668265263)^s;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  };
  let sourcePlate, edge, glass, broad, atlas;
  const flat=(row,x)=>lerp(row.yl,row.yr,unit((x-row.left)/(row.right-row.left)));

  // Overlapping irregular granules have their own occlusion, rounded edges and mineral
  // specks. Two sizes are combined on the ground according to the local slope and deposition.
  function grains() {
    const map=new Float32Array(tileSize*tileSize);
    for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++)map[y*tileSize+x]=-9+7*noise(x,y,3889);
    function scatter(n,radius,seed) {
      for(let i=0;i<n;i++) {
        const x=noise(i,0,seed)*tileSize,y=noise(i,1,seed)*tileSize;
        const a=radius*(.52+noise(i,2,seed)*.93),b=a*(.65+.36*noise(i,3,seed));
        const angle=noise(i,4,seed)*Math.PI,cs=Math.cos(angle),sn=Math.sin(angle);
        const tone=34*(noise(i,5,seed)-.53)+(noise(i,6,seed)>.968?28:0);
        const radiusInt=Math.ceil(a+1),phase=noise(i,7,seed)*7;
        for(let j=-radiusInt;j<=radiusInt;j++)for(let k=-radiusInt;k<=radiusInt;k++) {
          const ox=Math.floor(x)+k+.5-x,oy=Math.floor(y)+j+.5-y;
          const u=(ox*cs+oy*sn)/a,v=(-ox*sn+oy*cs)/b,sq=u*u+v*v;
          if(sq>1.18)continue;
          const px=(Math.floor(x)+k)&tileMask,py=(Math.floor(y)+j)&tileMask,idx=py*tileSize+px;
          const d=Math.sqrt(sq),lip=1+.085*Math.sin(phase+3*Math.atan2(v,u));
          const alpha=unit((lip-d)*a+.4);
          const crown=Math.sqrt(Math.max(0,1-sq));
          const mineral=tone-17+28*crown-(8*ox+12*oy)/a+4*(noise(px,py,395)-.5);
          map[idx]=lerp(map[idx],mineral,alpha);
        }
      }
    }
    scatter(15000,1.35,373);scatter(7400,2.02,881);scatter(2850,2.8,277);
    return map;
  }
  function sampleGrain(u,v){
    const a=Math.floor(u),b=Math.floor(v),fx=u-a,fy=v-b;
    const x=a&tileMask,nx=(a+1)&tileMask,y=(b&tileMask)*tileSize,ny=((b+1)&tileMask)*tileSize;
    return lerp(lerp(atlas[y+x],atlas[y+nx],fx),lerp(atlas[ny+x],atlas[ny+nx],fx),fy);
  }
  function sampleSediment(material,u,v,detail){
    const x=Math.floor(u),y=Math.floor(v),f=u-x,h=v-y;
    const a=x&tileMask,b=(x+1)&tileMask,j=(y&tileMask)*tileSize,n=((y+1)&tileMask)*tileSize;
    const p=material.pixels;
    for(let c=0;c<3;c++){
      detail[c]=lerp(lerp(p[4*(j+a)+c],p[4*(j+b)+c],f),lerp(p[4*(n+a)+c],p[4*(n+b)+c],f),h)-material.mean[c];
    }
  }
  function calibrate(photo,rear,front) {
    sourcePlate=photo;edge=new Float32Array(W);glass=new Float32Array(W);
    const src=photo.data;
    for(let x=scanLeft;x<=scanRight;x++){
      const ix=Math.max(72,Math.min(1127,x)),flatRear=flat(rear,ix);
      let past=-1,boundary=flatRear;
      for(let y=Math.floor(flatRear)-17;y<flatRear+9;y++){
        const p=(W*y+ix)*4,v=src[p]-.64*src[p+1];
        if(past<0&&v>=0){boundary=y-v/(v-past);break;}past=v;
      }
      edge[x]=boundary;
      // At the side mullions measure actual optical transmission of the sand. A thin specular
      // line can be partly transparent even when its red channel is brighter than the sand.
      if(x>=72&&x<=1127)glass[x]=1;
      else {
        let sand=0,water=0,refSand=0,refWater=0;
        for(let j=0;j<12;j++){
          const a=(W*(612+j*2)+x)*4,b=(W*(548+j*2)+x)*4;
          const d=4*(ix-x);
          sand+=src[a];water+=src[b];refSand+=src[a+d];refWater+=src[b+d];
        }
        glass[x]=unit((sand-water)/Math.max(1,refSand-refWater));
      }
    }
    // Low-pass the photographed colour. Grain is supplied separately when a bank is exposed.
    const radius=5,n=2*radius+1,h=lastY-firstY+1;
    const temp=new Float32Array(W*h*3);broad=new Uint8ClampedArray(W*h*3);
    for(let y=firstY;y<=lastY;y++){
      const line=(y-firstY)*W;
      for(let c=0;c<3;c++) {
        let sum=0;
        for(let d=-radius;d<=radius;d++)sum+=src[4*(W*y+scanLeft+d)+c];
        for(let x=scanLeft;x<=scanRight;x++){
          temp[3*(line+x)+c]=sum/n;
          sum+=src[4*(W*y+x+radius+1)+c]-src[4*(W*y+x-radius)+c];
        }
      }
    }
    for(let x=scanLeft;x<=scanRight;x++)for(let c=0;c<3;c++){
      let sum=0;
      for(let d=-radius;d<=radius;d++)sum+=temp[3*(Math.max(0,d)*W+x)+c];
      for(let y=0;y<h;y++){
        broad[3*(y*W+x)+c]=sum/n;
        sum+=temp[3*(Math.min(h-1,y+radius+1)*W+x)+c]-temp[3*(Math.max(0,y-radius)*W+x)+c];
      }
    }
  }
  // Project into the bank seen in a side pane. At this shallow viewing angle a
  // narrow strip of glass shows a much wider, laterally reversed strip of substrate.
  function reflectedPoint(x,left,right,front,z){
    if(x>=left&&x<=right)return x;
    const onLeft=x<left,wall=onLeft?left:right,span=onLeft?left-front.left:front.right-right;
    const d=Math.abs(x-wall),across=unit(d/Math.max(1,span));
    const distance=d*(1.70+.80*(1-z)+.60*across);
    return wall+(onLeft?distance:-distance);
  }
  function readBedPixel(data,u,v,c){
    const x=Math.floor(u),y=Math.floor(v),p=4*(y*W+x)+c;
    return lerp(lerp(data[p],data[p+4],u-x),lerp(data[p+4*W],data[p+4*W+4],u-x),v-y);
  }
  function gridFor(rows,heightAt,reflectedMaterial) {
    const cols=Math.ceil((scanRight-scanLeft)/spacing)+1;
    const h=new Float32Array(cols*rows.length),light=new Float32Array(h.length),sorting=new Float32Array(h.length);
    let high=0;
    for(let j=0;j<=steps;j++)for(let i=0;i<cols;i++){
      const row=rows[j],x=scanLeft+i*spacing;
      const point=reflectedMaterial?reflectedPoint(x,row.left,row.right,rows[steps],row.z):
        x<row.left?2*row.left-x:x>row.right?2*row.right-x:x;
      h[j*cols+i]=Math.max(0,Math.min(60,heightAt(point,j/steps)||0));
      high=Math.max(high,h[j*cols+i]);
    }
    for(let j=0;j<=steps;j++)for(let i=0;i<cols;i++){
      const idx=j*cols+i,l=Math.max(0,i-1),r=Math.min(cols-1,i+1),b=Math.max(0,j-1),f=Math.min(steps,j+1);
      const dx=(h[j*cols+r]-h[j*cols+l])/((r-l)*spacing);
      const dz=(h[f*cols+i]-h[b*cols+i])/((f-b)*245/steps);
      const normal=1/Math.sqrt(1+dx*dx+dz*dz);
      let diffuse=.25+.75*(1+.67*dx+.53*dz)*normal;
      for(const d of [3,7]){
        const above=h[Math.max(0,j-Math.ceil(d*.5))*cols+Math.max(0,i-d)];
        diffuse-=.08*unit((above-h[idx]-d*2.2)/13);
      }
      light[idx]=Math.max(.52,Math.min(1.27,diffuse));
      // Coarser grains gather where the slope flattens again below an uphill neighbour.
      const uphill=h[Math.max(0,j-4)*cols+i],toe=unit((uphill-h[idx])/21)*Math.max(.18,1-Math.abs(dz)*2);
      sorting[idx]=unit(.20+.44*Math.hypot(dx,dz)+.54*toe+.14*j/steps);
    }
    return {cols,h,light,sorting,high};
  }
  function build(photo,style,heightAt) {
    const rows=Array.from({length:steps+1},(_,j)=>sandRow(j/steps)),rear=rows[0],front=rows[steps];
    const reflectedMaterial=style==='soil'||style==='pale';
    const grid=gridFor(rows,heightAt,reflectedMaterial);
    if(style!=='soil'&&style!=='pale')style='sand';
    if(style==='sand'&&grid.high<.001)return photo;
    if(photo!==sourcePlate)calibrate(photo,rear,front);
    const src=photo.data, result=new ImageData(new Uint8ClampedArray(src),W,H),dst=result.data;
    const rising=new Float32Array(steps+1),cuts=new Float32Array(steps+1),flatCuts=new Float32Array(steps+1);
    const levels=new Float32Array(steps+1),sorted=new Float32Array(steps+1),arc=new Float32Array(steps+1);
    const groundY=680, renderEnd=684, soil=style==='soil',pale=style==='pale';
    const mineral=substrateMinerals[style],sampled=new Float32Array(3);
    if(!mineral&&!atlas)atlas=grains();
    // Work outwards from the middle. Each pane can now reflect the exact grains
    // already painted on the direct-view bank, including their shading and clumps.
    const center=Math.floor((scanLeft+scanRight)/2),leftCount=center-scanLeft+1;
    for(let col=0;col<=scanRight-scanLeft;col++){
      const x=col<leftCount?center-col:center+col-leftCount+1;
      if(glass[x]<.008)continue;
      const fx=(x-scanLeft)/spacing,i=Math.min(grid.cols-2,Math.floor(fx)),f=fx-i;
      const nativeEdge=edge[x],rearRay=reflectedMaterial?reflectedPoint(x,rear.left,rear.right,front,0):x;
      const organic=edge[Math.round(rearRay)]-flat(rear,rearRay);
      let silhouette=Infinity,built=0;
      for(let j=0;j<=steps;j++) {
        const k=j*grid.cols+i;
        rising[j]=lerp(grid.h[k],grid.h[k+1],f);
        levels[j]=lerp(grid.light[k],grid.light[k+1],f);
        sorted[j]=lerp(grid.sorting[k],grid.sorting[k+1],f);
        flatCuts[j]=flat(rows[j],x)+organic*(1-rows[j].t);
        cuts[j]=flatCuts[j]-rising[j];
        built=Math.max(built,rising[j],90*Math.abs(levels[j]-1));
        silhouette=Math.min(silhouette,cuts[j]);
        if(j) {
          const delta=rising[j]-rising[j-1],projected=Math.max(.1,cuts[j]-cuts[j-1]);
          // The sediment runs down the actual surface. Rounded grains retain a minimum
          // apparent depth when the line of sight grazes a steep bank.
          arc[j]=arc[j-1]+Math.min(projected*1.82,Math.hypot(188/steps,delta));
        }
      }
      if(style==='sand'&&built<.005)continue;
      const bgY=Math.floor(nativeEdge-5),bg=4*(W*bgY+x);
      const refX=Math.max(76,Math.min(1124,x));
      const clearRef=4*(W*bgY+refX),lipIndex=4*(W*684+x);
      const sideLight=[0,1,2].map(c=>Math.max(0,src[bg+c]-glass[x]*src[clearRef+c]));
      const contactR=Math.max(100,broad[((677-firstY)*W+refX)*3]);
      // Remove the warm antialias left above the measured original silhouette.
      for(let y=Math.floor(nativeEdge)-3;y<silhouette-.8;y++){
        const p=4*(W*y+x);
        for(let c=0;c<3;c++)dst[p+c]=lerp(src[p+c],src[bg+c],glass[x]);
      }
      for(let j=0;j<=steps;j++){
        const face=j===steps,y0=cuts[j],y1=face?renderEnd+1:cuts[j+1];
        if(y1<=y0)continue;
        const first=Math.ceil(y0-.5-(Math.abs(y0-silhouette)<.01?.85:0)),end=Math.ceil(y1-.5);
        for(let y=first;y<end;y++) {
          const t=unit((y+.5-y0)/(y1-y0)),z=face?1:(j+t)/steps;
          const rowL=face?front.left:lerp(rows[j].left,rows[j+1].left,t);
          const rowR=face?front.right:lerp(rows[j].right,rows[j+1].right,t);
          const mirror=x<rowL?rowL-x:x>rowR?x-rowR:0;
          const wx=x<rowL?x+2*mirror:x>rowR?x-2*mirror:x;
          const u=600+(wx-600)/(face?1:lerp(rows[j].ratio,rows[j+1].ratio,t));
          const depth=face?Math.max(0,y+.5-y0):0;
          const v=face?arc[j]+depth*1.08:lerp(arc[j],arc[j+1],t);
          const sorting=face?lerp(sorted[j],.57,unit(depth/13)):lerp(sorted[j],sorted[j+1],t);
          const hill=face?rising[j]:lerp(rising[j],rising[j+1],t);
          const light=face?lerp(levels[j],.87,unit(depth/14)):lerp(levels[j],levels[j+1],t);
          const exposed=style==='sand'?smooth((hill+Math.abs((face?levels[j]:light)-1)*32)/14):1;
          const fxPhoto=Math.max(77,Math.min(1123,Math.round(wx)));
          const flatY=face?flatCuts[j]:lerp(flatCuts[j],flatCuts[j+1],t);
          const sy=Math.max(edge[fxPhoto]+7,Math.min(flat(front,fxPhoto)-6,flatY));
          const sample=((Math.round(sy)-firstY)*W+fxPhoto)*3;
          const p=4*(W*y+x),nativeY=face?lerp(flatCuts[j],renderEnd+1,t):y+hill;
          const original=4*(Math.round(nativeY)*W+x);
          const packing=unit(.47+.24*Math.sin(u*.028+v*.063)+.20*Math.sin(v*.12-u*.019));
          const deposit=smooth((.40*packing+.79*sorting-.18)/.63);
          let coarse=0,grain=0;
          if(mineral){
            // A coherent grain chart follows the slope and rotates over the front cut.
            // Domain variation is slow enough to keep quartz facets and clay pores intact.
            const scale=soil?1.10:1.55;
            // A round pellet projects its own height even when the ground is seen edge-on.
            const grainDepth=soil?v*.74+depth*.29:v;
            const tx=u*scale+5.2*Math.sin(u*.019+v*.023);
            const ty=grainDepth*scale+u*.065+6*Math.sin(u*.021-v*.027);
            sampleSediment(mineral,tx,ty,sampled);
          }else{
            const fineScale=soil?1.07:pale?1.96:1.57,largeScale=soil?.66:pale?1.49:1.12;
            const fine=sampleGrain(u*fineScale+35,v*fineScale+63);
            coarse=sampleGrain(u*largeScale+94,v*largeScale+31);
            grain=lerp(fine,coarse,deposit);
          }
          const strata=face?Math.sin((depth+3*Math.sin(u*.013)+2*Math.sin(u*.039))*.43)*unit(depth/7):0;
          const burial=face?1-Math.exp(-depth/(soil?6.7:8.8)):0;
          const optical=1-z, irr=(broad[sample+1]-lerp(166,201,z))*.24;
          // Face and top share their outermost grains. Only buried particles darken
          // progressively with depth along the front pane.
          let r,g,b;
          if(mineral){
            // Surface stones have higher microcontrast than those seen across the rear
            // or through packed sediment. Pores stay dark while wet shoulders catch the light.
            const contrast=(soil?.90:.89)+.15*z+.12*deposit-.13*burial;
            const diffuse=soil?49+13*z+irr*.83+3*packing-20*burial+1.7*strata:
              174+26*z+irr*.84+1.9*packing-40*burial+1.6*strata;
            if(soil){
              const wet=Math.max(0,sampled[1]-19)*.12*(1-.83*burial);
              r=diffuse+15-3.1*optical+sampled[0]*contrast+wet*.74;
              g=diffuse+.5+2.8*optical+sampled[1]*contrast+wet;
              b=diffuse-10+5.4*optical+sampled[2]*contrast+wet*1.22;
            }else{
              r=diffuse+14+.95*sampled[0]*contrast;
              g=diffuse+10+sampled[1]*contrast;
              b=diffuse-2+2.9*optical+sampled[2]*contrast;
            }
          }else if(soil) {
            const diffuse=66+12*z+irr*.86+(1.13+.25*deposit)*grain+4*packing-20*burial+1.7*strata;
            r=diffuse+8-4*optical+.16*coarse;g=diffuse+1+3*optical;b=diffuse-7+6*optical-.12*coarse;
          } else if(pale) {
            const diffuse=181+25*z+irr*.85+grain*.60-43*burial+1.9*strata;
            r=diffuse+11;g=diffuse+7;b=diffuse+.7+2.8*optical;
          } else {
            const micro=grain*(.92+.47*deposit)+2.3*strata;
            r=broad[sample]+micro-55*burial;g=broad[sample+1]+micro-64*burial;b=broad[sample+2]+micro-72*burial;
          }
          r*=light;g*=light;b*=light;
          if(reflectedMaterial&&mirror>0&&!face){
            const onLeft=x<rowL,sideWidth=onLeft?rowL-front.left:front.right-rowR;
            const across=unit(mirror/Math.max(1,sideWidth));
            const incident=reflectedPoint(x,rowL,rowR,front,z);
            // A subpixel footprint confined to previously painted direct-view pixels.
            const donor=onLeft?Math.max(incident,x+2):Math.min(incident,x-2);
            const rowT=lerp(rows[j].t,rows[j+1].t,t);
            const u=(donor-rowL)/(rowR-rowL);
            const yFlat=lerp(lerp(rows[j].yl,rows[j+1].yl,t),lerp(rows[j].yr,rows[j+1].yr,t),u);
            const finalY=yFlat+(edge[Math.round(donor)]-flat(rear,donor))*(1-rowT)-heightAt(donor,z)-.5;
            const near=flat(front,donor)-heightAt(donor,1)-1.1;
            const far=edge[Math.round(donor)]-heightAt(donor,0)+1.1;
            const donorY=Math.max(far,Math.min(near,finalY));
            const fold=smooth((mirror+.15)/1.55),transfer=(pale?.91:.69)-.16*across-.04*(1-z);
            const prism=.045+.045*across;
            // The same diffuse field that tints the photographed side glass tints
            // this reflection. Preserve individual minerals and the real front bevel.
            const mirroredR=readBedPixel(dst,donor,donorY,0)*((pale?.91:.81)*transfer)+src[clearRef]*prism;
            const mirroredG=readBedPixel(dst,donor,donorY,1)*((pale?.99:.94)*transfer)+src[clearRef+1]*prism;
            const mirroredB=readBedPixel(dst,donor,donorY,2)*((pale?1.03:1.08)*transfer)+src[clearRef+2]*(prism+.042);
            r=lerp(r,mirroredR,fold);g=lerp(g,mirroredG,fold);b=lerp(b,mirroredB,fold);
          }else if(mirror>0){
            const veil=.19*smooth(mirror/13),seam=1-.08*(1-smooth(mirror/3));
            r=lerp(r*seam,34,veil);g=lerp(g*seam,101,veil);b=lerp(b*seam,86,veil);
          }
          if(exposed<1){
            r=lerp(src[original],r,exposed);g=lerp(src[original+1],g,exposed);b=lerp(src[original+2],b,exposed);
          }
          if(!face){
            const haze=.14*(1-smooth((y+.5-silhouette)/10))*(1-.67*z);
            r=lerp(r,src[bg],haze);g=lerp(g,src[bg+1],haze);b=lerp(b,src[bg+2],haze);
          }
          const mat=unit((y+.5-silhouette+1.05)/1.8);
          const pane=glass[x];
          // On the two front bevels preserve the captured glass light, subtracting the
          // transmitted old bed colour before mixing the new bed into the same photograph.
          for(let c=0;c<3;c++) {
            const target=c===0?r:c===1?g:b;
            let color;
            if(y>=groundY) {
              if(y<=681){
                const depth=y===680?.84:.42;
                const coverage=unit(depth+.11*(unit(src[p]/contactR)-depth));
                const under=src[lipIndex+c];
                const targetBehind=target*pane+sideLight[c];
                color=lerp(under,targetBehind,coverage);
              } else {
                // The bright bottom bevel is polished glass. Only a weak warm reflection
                // of the original bed was baked into these two rows.
                const under=broad[((677-firstY)*W+refX)*3+c];
                const reflect=y===682?.13:y===683?.042:0;
                color=src[p+c]+reflect*pane*(target-under);
              }
            } else if(pane<.995) {
              // The clear-water reading separates this vertical line's reflection from its
              // transmission. Subtracting another sand grain here leaves black pinholes.
              const targetBehind=sideLight[c]+pane*target;
              color=lerp(src[bg+c],targetBehind,mat);
            } else {
              color=lerp(src[bg+c],target,mat);
            }
            dst[p+c]=color;
          }
        }
      }
    }
    return result;
  }
  return build;
})();

;
/* botanical-layout */
'use strict';

const botanicalFormNames = {
  anubias: ['横展根茎', '高低叠叶', '双芽分株'],
  crypt: ['弧叶丛', '直立叶丛', '走茎双株'],
  stems: ['高低双梢', '斜生扇丛', '错落双丛'],
  moss: ['伏地枝', '层叠苔丘', '垂枝苔垫'],
  pinnatifida: ['直立轮叶', '匍匐侧枝', '分叉双梢']
};

function botanicalFormName(kind, seed) {
  return botanicalFormNames[kind][(seed >>> 0) % 3];
}

// Crown coordinates are physical drawing units, with positive y growing upward.
// Blade entries specify cell, tip relative to crown, occupied blade width,
// depth, emergence stage, sideways midrib bow, and upward arch.
const botanicalRosettes = {
  anubias: [
    [
      { at:[0,3], leaves:[
        [0,-35,29,15,.08,0,-3,3], [3,9,43,10,-.32,0,-2,1],
        [1,-16,56,23,-.49,1,-4], [5,29,37,20,.22,1,3,2],
        [4,-38,15,19,.50,2,-4,4], [2,3,35,16,.65,2,3,1]
      ]},
      { at:[25,7], age:1, leaves:[
        [3,9,26,9,-.14,1], [2,27,36,17,-.35,2,3], [0,30,17,16,.52,2,2,3]
      ]}
    ],
    [
      { at:[0,3], leaves:[
        [0,-23,29,14,.33,0,-2,1], [3,12,50,11,-.10,0,2],
        [1,-12,71,24,-.54,1,-4], [2,28,58,18,-.26,1,3,2],
        [4,-37,42,24,.08,2,-4,2], [5,34,29,23,.48,2,2,5],
        [0,9,28,16,.66,2,-2]
      ]},
      { at:[-12,5], age:2, leaves:[[3,-17,25,8,.19,2], [0,-24,12,12,.43,2,-2,3]]}
    ],
    [
      { at:[0,4], leaves:[
        [5,-23,31,18,.20,0,-2,3], [3,7,41,9,-.21,0,2],
        [1,-12,58,22,-.48,1,-3], [2,15,39,17,.08,1,1,3],
        [4,-35,19,19,.50,2,-3,3]
      ]},
      { at:[33,9], age:1, leaves:[
        [3,7,25,8,-.25,1], [0,25,19,14,.36,1,2,2],
        [5,14,45,19,-.45,2,2], [1,35,33,22,.06,2,3,2],
        [2,24,11,15,.53,2,3,3]
      ]}
    ]
  ],
  crypt: [
    [
      { at:[0,1], leaves:[
        [1,-27,35,9,-.17,0,-4,3], [4,5,43,5,.16,0,1],
        [0,25,52,10,-.44,1,2], [5,-41,33,11,.29,1,-4,7],
        [2,40,25,13,.34,1,2,9], [3,-12,70,11,-.58,2,-2],
        [0,11,63,8,-.40,2,2], [1,47,12,11,.58,2,4,12],
        [5,-46,10,12,.67,2,-3,13], [4,9,37,5,.72,2]
      ]}
    ],
    [
      { at:[0,1], leaves:[
        [3,-13,47,9,-.34,0,-2], [4,10,40,5,.23,0,1],
        [0,-2,73,10,-.51,1,-1], [1,26,52,9,.08,1,3,1],
        [2,-32,40,12,.33,1,-3,3],
        [1,9,83,10,-.68,2,2], [5,35,31,13,.51,2,4,5],
        [3,-22,63,10,-.20,2,-2], [4,-1,41,5,.72,2,-1]
      ]}
    ],
    [
      { at:[0,1], leaves:[
        [0,-18,45,9,-.29,0,-3], [4,14,32,5,.23,0,2],
        [1,4,62,9,-.49,1,-2], [2,-33,28,12,.35,1,-3,6],
        [5,20,36,11,.33,2,2,5], [3,-2,43,8,.50,2,2]
      ]},
      { at:[35,2], age:1, leaves:[
        [4,3,24,5,-.17,1], [0,17,16,8,.30,1,3,3],
        [1,8,43,8,-.38,2,2], [5,23,21,11,.36,2,4,4],
        [2,-10,32,8,-.04,2,-1]
      ]}
    ]
  ]
};

// Complete shoots already include their own stalk and side branches.
// Each entry starts at a real node on the runner or a branching stem.
const botanicalShootBeds = {
  stems: [
    [
      [0,0,0,-9,107,27,-.35,0,-4], [2,2,1,28,81,24,-.05,1,3],
      [4,-1,0,-31,53,17,.25,1,-2], [1,0,1,2,66,26,.52,2,2],
      [3,2,1,40,49,22,.32,2,4], [2,-5,35,-29,76,16,-.13,2,-2]
    ],
    [
      [2,0,0,28,95,26,-.45,0,5], [4,-1,0,-20,61,19,.18,1,-3],
      [0,9,27,39,80,20,-.15,1,3], [3,1,1,-39,45,24,.42,2,-3],
      [1,1,0,9,62,25,.54,2,2], [4,12,36,53,67,16,.12,2,3],
      [2,-7,25,-29,57,17,-.10,2,-3]
    ],
    [
      [1,0,0,-15,88,26,-.22,0,-3], [0,19,1,33,75,20,-.28,1,3],
      [4,-2,0,-34,45,17,.42,1,-3], [2,1,1,6,57,18,.25,2,1],
      [3,22,2,40,101,26,-.42,2,3], [4,23,2,55,56,18,.41,2,4],
      [0,24,2,31,49,16,.52,2,1], [4,-4,25,-29,60,14,-.09,2,-2]
    ]
  ],
  moss: [
    [
      [4,0,0,-14,15,8,.13,0,-1], [1,0,0,19,15,7,-.13,0,1],
      [2,-4,1,-22,26,12,-.35,1,-2], [3,8,2,34,13,12,.24,1,1,4],
      [0,5,2,13,23,11,-.07,1], [0,-10,1,-37,13,12,.34,2,-2,5],
      [1,-16,2,-43,5,9,.55,2,-2,4], [2,2,1,2,29,14,-.46,2,-2],
      [4,10,2,23,19,10,.31,2,1], [2,20,1,39,18,12,-.19,2,1,3],
      [1,25,1,50,9,8,.44,2,2,3], [0,-2,1,-14,10,10,.64,2,-1,2]
    ],
    [
      [2,0,0,-5,28,14,-.1,0,-1], [4,0,0,12,13,8,.27,0,1],
      [0,-3,1,-18,25,13,-.28,1,-2], [3,3,2,17,24,14,.10,1,1],
      [1,14,1,26,18,8,.22,1,1], [2,-4,1,-7,40,18,-.54,2,-2],
      [2,3,0,7,32,15,-.36,2,1], [3,-7,2,-27,16,14,.42,2,-1,4],
      [0,21,2,25,30,12,-.31,2,1], [2,23,2,36,23,14,.15,2,2],
      [1,24,1,47,12,9,.47,2,2,3], [4,6,1,16,12,10,.62,2,1,2],
      [0,-10,1,-29,7,10,.59,2,-2,3]
    ],
    [
      [3,0,0,19,16,13,-.09,0,1,3], [4,0,0,-12,13,7,.30,0,-1],
      [0,-3,1,-10,26,12,-.37,1,-2], [2,6,2,17,28,14,-.23,1,1],
      [1,13,1,33,6,9,.40,1,2,5], [2,-7,1,-23,24,13,-.27,2,-3],
      [0,-10,1,-32,15,12,.10,2,-2,3], [3,-7,1,-28,5,13,.48,2,-1,5],
      [1,-9,0,-31,-3,8,.64,2,-1,6], [2,8,1,24,18,14,.08,2,1,2],
      [3,12,1,38,11,15,.32,2,3,5], [1,15,1,37,-5,9,.68,2,2,7],
      [4,1,2,8,13,10,.56,2]
    ]
  ]
};

// Upright stems bear opposite, deeply divided leaves. Lateral stems emerge
// at a node or from a short rooted runner. The three outlines have different
// numbers of axes and different elevations at which those axes separate.
const botanicalPinnatifida = [
  [
    { base:[0,1], top:[-6,68], bend:-4, nodes:5, age:0, depth:-.13 },
    { base:[-2,18], top:[27,50], bend:3, nodes:3, age:1, depth:.18 },
    { base:[18,2], top:[41,26], bend:2, nodes:2, age:2, depth:.31 }
  ],
  [
    { base:[0,1], top:[-13,43], bend:-3, nodes:4, age:0, depth:.15 },
    { base:[22,4], top:[30,59], bend:3, nodes:4, age:1, depth:-.25 },
    { base:[44,6], top:[60,34], bend:3, nodes:3, age:2, depth:.26 },
    { base:[-7,20], top:[-28,36], bend:-3, nodes:2, age:2, depth:.33 }
  ],
  [
    { base:[0,1], top:[-24,62], bend:-5, nodes:4, age:0, depth:-.16 },
    { base:[-2,8], top:[27,68], bend:6, nodes:4, age:1, depth:.02 },
    { base:[-12,27], top:[-39,42], bend:-3, nodes:2, age:2, depth:.32 }
  ]
];

function botanicalLayout(kind, stage, seed) {
  seed=seed>>>0;
  stage=Math.max(0,Math.min(2,Math.round(stage)));
  const form=seed%3,parts=[],stems=[];
  let serial=0;
  function noise(index) {
    let value=Math.imul(seed ^ Math.imul(index+1,0x9e3779b9),0x85ebca6b);
    value=Math.imul(value^(value>>>16),0xc2b2ae35);
    return ((value^(value>>>13))>>>0)/4294967296-.5;
  }
  function stem(points,width,color,depth) {
    stems.push({points,width,color,depth});
  }
  function leaf(cell,root,tip,width,depth,curve=0,lift=0,age=0,identity) {
    const n=(identity??serial++)*7;
    if(stage<age)return;
    const dx=tip[0]-root[0],dy=tip[1]-root[1];
    const angle=noise(n)*.085,cs=Math.cos(angle),sn=Math.sin(angle);
    const size=1+noise(n+1)*.125;
    parts.push({cell,root,tip:[root[0]+(dx*cs-dy*sn)*size,root[1]+(dy*cs+dx*sn)*size],
      width:width*(1+noise(n+2)*.15),depth:Math.max(-.92,Math.min(.92,depth+noise(n+3)*.06)),
      curve:curve+noise(n+4)*Math.min(2.5,width*.17),lift});
  }

  if(botanicalRosettes[kind]) {
    const crowns=botanicalRosettes[kind][form];
    for(const [i,crown] of crowns.entries()){
      const [cx,cy]=crown.at;
      if(stage>=(crown.age||0)) {
        if(kind==='anubias'){
          const left=cx-(i?2.8:[2.8,4.6,5.8][stage]),right=cx+[3.7,5.1,6.2][stage];
          const girth=[1.18,1.60,2][stage];
          stem([[left,cy-.5],[cx-2,cy+.1],[cx+.6,cy-.2],[cx+2.5,cy+.6]],girth,'#4a5330',.00);
          stem([[cx+2.5,cy+.6],[right,cy+1.2],[right+.85,cy+1.5]],girth*.67,'#566039',.01);
          for(let j=0;j<=stage+1;j++){
            const x=cx-2.5+j*2.3,lean=(j%2?1:-1)*(1.25+j*.32);
            stem([[x,cy-.35],[x+lean*.30,cy-1.9],[x+lean*.74,cy-3.3],[x+lean*.85-.6,cy-(4.2+j*.52)]],.32,'#71734c',.12);
          }
          if(i){
            stem([[2,3.1],[cx*.30,cy-1.5],[cx*.48,cy-1.2],[cx*.71,cy+.1],[cx,cy]],1.42,'#4b5530',-.03);
            const node=[cx*.54,cy-.9];
            leaf(3,node,[node[0]+3.4,node[1]+(stage===1?5:8)],stage===1?1.7:2.45,-.04,0,.4,0,305+i);
          }
        }else{
          stem([[cx-1.1,cy-.15],[cx,cy+.65],[cx+1.15,cy-.12]],.9,'#67583a',.02);
          for(let j=0;j<2+stage;j++){
            const x=cx+(j%2?1:-1)*j*.22,side=j%2?1:-1;
            stem([[x,cy],[x+side*.58,cy-1.4],[x+side*(1.2+j*.42),cy-(2.8+j*.52)]],.27,'#897853',.08);
          }
          if(i){
            stem([[0,1],[cx*.3,-.3],[cx*.61,-.5],[cx*.83,.7],[cx,cy]],.45,'#5f6340',-.10);
            const node=[cx*.64,-.2];
            leaf(4,node,[node[0]+2.1,node[1]+(stage===1?3.8:6)],1.6,-.01,.28,0,0,329+i);
          }
        }
      }
      for(const [j,entry] of crown.leaves.entries()){
        const [cell,x,y,width,depth,age,bow=0,arch=0]=entry;
        const root=[cx+(j%3-1)*(kind==='crypt'?.46:.92),cy+(j%2)*.45];
        const spread=stage===0?.79:stage===1?.91:1;
        const length=stage===0?.72:stage===1?.86:1;
        leaf(cell,root,[root[0]+x*spread,root[1]+y*length],width*length,depth,bow*spread,arch*length,Math.max(age,crown.age||0));
      }
    }
  }
  if(botanicalShootBeds[kind]) {
    const bed=botanicalShootBeds[kind][form],moss=kind==='moss';
    const active=bed.filter(shoot=>shoot[7]<=stage);
    if(moss){
      const roots=active.map(shoot=>[shoot[1],shoot[2]]).sort((a,b)=>a[0]-b[0]);
      stem(roots,.48,'#435535',-.46);
    }else if(form===2&&stage>=1){
      stem([[0,.1],[7,-.6],[14,.15],[22,.6]],.43,'#626943',-.16);
    }
    for(const entry of bed){
      const [cell,rx,ry,tx,ty,width,depth,age,bow=0,arch=0]=entry;
      if(!moss&&ry>8&&stage>=age){
        stem([[0,0],[rx*.45,ry*.47],[rx,ry]],1.05,'#6b8143',depth-.06);
      }
      const grow=stage===0?.74:stage===1?.87:1,root=[rx,ry];
      const tip=[rx+(tx-rx)*grow,ry+(ty-ry)*grow];
      const growingCell=stage===0&&(moss||form===2)?4:cell;
      leaf(growingCell,root,tip,width*grow,depth,bow*grow,arch*grow,age);
    }
  }
  if(kind==='moss'){
    const variants=[
      [[-9,0,-25,8],[2,0,15,8],[14,1,28,11],[4,1,-7,13],[-2,1,9,17]],
      [[-4,0,-19,9],[2,0,14,11],[15,1,29,12],[8,1,-2,16],[-7,1,-18,16]],
      [[-7,0,-20,6],[4,0,21,8],[15,1,30,5],[5,1,-7,14],[-4,1,6,18]]
    ];
    for(const [j,[x,y,tx,ty]] of variants[form].entries()){
      leaf([0,2,4,3,0][j],[x,y],[tx,ty],[9,10,7,11,9][j],.16+j*.06,j%2?1:-1,1.5,j<2?1:2,410+j);
    }
  }
  if(kind==='pinnatifida'){
    for(const [index,shoot] of botanicalPinnatifida[form].entries()){
      if(stage<shoot.age)continue;
      const [originalX,by]=shoot.base,[targetX,ty]=shoot.top;
      const bx=stage===1&&index&&by<10?originalX*.72:originalX;
      const tx=targetX+(bx-originalX);
      const nodeCount=stage===0?1:stage===1?(shoot.age?1:Math.min(3,shoot.nodes)):shoot.nodes;
      const nodeAt=t=>[bx+(tx-bx)*t+Math.sin(Math.PI*t)*shoot.bend+
        Math.sin(2*Math.PI*t)*(index%2?.85:-1.15),by+(ty-by)*t];
      const parameters=Array.from({length:nodeCount},(_,j)=>(stage===0?.028:.065)+j*.66/Math.max(1,shoot.nodes-1));
      const apex=parameters[nodeCount-1]+(stage===0?.055:.062);
      const joints=[nodeAt(0),...parameters.map(nodeAt),nodeAt(apex)];
      if(index>0){
        if(by<10){
          stem([[0,1],[bx*.33,by*.36-.5],[bx*.65,by*.57-.25],[bx,by]],.68,'#626246',shoot.depth-.1);
          if(Math.abs(bx)>12){
            const bud=[bx*.61,by*.54];
            leaf(4,bud,[bud[0]+2.2,bud[1]+(stage===1?4.0:6.3)],1.75,shoot.depth-.02,.3,.2,0,470+index);
          }
        }else{
          const parent=botanicalPinnatifida[form][0],t=(by-parent.base[1])/(parent.top[1]-parent.base[1]);
          const px=parent.base[0]+(parent.top[0]-parent.base[0])*t+Math.sin(Math.PI*t)*parent.bend;
          stem([[px,by-1.5],[bx,by]],.70,'#655c40',shoot.depth-.08);
        }
      }
      // The tender top tapers through each node and disappears inside the last new leaf.
      for(let j=1;j<joints.length;j++){
        const q=(j-1)/Math.max(1,joints.length-2);
        const girth=(stage===0?.53:stage===1?.88:1.02)*(1-.66*q)*(index?.81:1);
        stem([joints[j-1],joints[j]],girth,q<.5?'#5d613e':'#686746',shoot.depth-.08);
      }
      const axisSize=index?Math.max(.64,Math.min(1,(ty-by)/51)):1;
      for(let j=0;j<nodeCount;j++){
        const node=joints[j+1],rel=j/Math.max(1,shoot.nodes-1);
        const size=axisSize*(stage===0?.78:stage===1?.94:1);
        const reach=(23+7.6*Math.sin(Math.PI*(.12+rel*.73))-4.6*rel)*size;
        const flip=(j+index+form)%2===0?1:-1;
        for(const side of [-1,1]){
          const front=side===flip,span=reach*(front?1:.81);
          const rise=(front?.43:.75)*span+rel*span*.31+(stage===0?2.6:0);
          const cell=front?[0,1,3,5][(j+index+form)%4]:[1,2,5,0][(j+index+form)%4];
          const joint=[node[0]+side*.16,node[1]+(front?-.28:.54)];
          leaf(cell,joint,[joint[0]+side*span,joint[1]+rise],span*(front?.45:.39),
            shoot.depth+(front?.22:-.23),side*2.0,front?2.0:.9,0,500+index*30+j*3+(side>0?1:0));
        }
        if(stage===2&&j===1&&index===0){
          leaf(2,node,[node[0]+flip*11.0,node[1]+14.5],5.9,shoot.depth+.27,flip*.8,.6,0,589);
        }
      }
      const bud=joints[joints.length-1],last=joints[joints.length-2];
      const side=(index+form)%2?-1:1;
      const scale=axisSize*(stage===0?1.06:1);
      leaf(4,bud,[bud[0]+side*4.4*scale,bud[1]+15.5*scale],5.0*scale,shoot.depth+.23,side*.9,.4,0,600+index*3);
      leaf(index%2?3:0,last,[last[0]-side*8.2*scale,last[1]+12.4*scale],4.6*scale,
        shoot.depth+.12,-side*.9,.6,0,601+index*3);
    }
  }
  return frameBotanicalLayout(kind,stage,parts,stems);
}

// Measure the curved blade envelope in the same physical units as its stem.
// A tight common frame keeps the projected planting point independent of the
// tallest tip, with room for the narrow rootlets and the atlas' irregular edge.
function frameBotanicalLayout(kind,stage,parts,stems){
  let left=0,right=0,low=0,high=0;
  function include(x,y,rx=0,ry=rx){
    left=Math.min(left,x-rx);right=Math.max(right,x+rx);
    low=Math.min(low,y-ry);high=Math.max(high,y+ry);
  }
  for(const part of parts){
    const [x,y]=part.root,dx=part.tip[0]-x,dy=part.tip[1]-y,len=Math.max(.01,Math.hypot(dx,dy));
    for(let i=0;i<=10;i++){
      const t=i/10,arc=Math.sin(Math.PI*t);
      const thick=part.width*.56*Math.max(0,Math.sin(Math.PI*t))**.60;
      include(x+dx*t+part.curve*arc,y+dy*t+part.lift*arc,
        thick*Math.abs(dy/len),thick*Math.abs(dx/len));
    }
  }
  for(const s of stems)for(const p of s.points)include(p[0],p[1],s.width*.5);
  const span=Math.max(1,right-left),height=Math.max(1,high-low);
  const margin=Math.max(.9,Math.min(span,height)*.035);
  left-=margin;right+=margin;low-=margin;high+=margin;
  // A lone cutting can be very narrow. Keep its physical height in scale
  // with the neighbouring plants when the tank applies its stage width.
  const minAspect=kind==='stems'?[.42,.54,.58][stage]:
    kind==='pinnatifida'?[.85,.86,.94][stage]:kind==='crypt'?.75:kind==='anubias'?.85:1.30;
  const extra=Math.max(0,(high-low)*minAspect-(right-left))*.5;
  left-=extra;right+=extra;
  const w=right-left,h=high-low;
  const project=([x,y])=>[(x-left)/w,(high-y)/h];
  return {
    aspect:w/h,anchor:project([0,0]),
    parts:parts.map(part=>({...part,root:project(part.root),tip:project(part.tip),width:part.width/w,curve:part.curve/w,lift:part.lift/h})),
    stems:stems.map(s=>({...s,points:s.points.map(project),width:s.width/w}))
  };
}

;
/* stem-fan */
'use strict';

// The dense fan is one photograph. Its numbered mask is used for picking only.
// Both its pose and its movement resample the whole photograph in order along each row.
let fanSource;
async function loadStemFan(){
  const leaf=new Image(),labels=new Image();
  leaf.src='assets/stems.webp';labels.src='assets/foliage/stems.png';
  const [spec]=await Promise.all([fetch('assets/foliage/rig.json').then(r=>{if(!r.ok)throw Error('茎草枝位');return r.json();}),leaf.decode(),labels.decode()]);
  const h=424,w=Math.round(leaf.naturalWidth*h/leaf.naturalHeight);
  const small=herbCanvas(w,h),g=small.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';
  g.drawImage(leaf,0,0,w,h);
  const hits=herbCanvas(w,h),hc=hits.getContext('2d',{willReadFrequently:true});hc.imageSmoothingEnabled=false;hc.drawImage(labels,0,0,w,h);
  fanSource={w,h,photo:g.getImageData(0,0,w,h).data,ids:hc.getImageData(0,0,w,h).data,zones:spec.stems.zones};
}
function blendFanPixel(src,i,next,t,dst,j){
  const left=src[i+3],right=src[next+3];
  if(left===right){
    dst[j+3]=left;
    if(left)for(let k=0;k<3;k++)dst[j+k]=src[i+k]+t*(src[next+k]-src[i+k]);
    return;
  }
  const a=left*(1-t),b=right*t,alpha=a+b;
  dst[j+3]=alpha;
  if(alpha<.5)return;
  for(let k=0;k<3;k++)dst[j+k]=(a*src[i+k]+b*src[next+k])/alpha;
}
function fanFrame(key,seed,yaw){
  const src=fanSource,h=src.h,native=src.w,pad=Math.ceil(native*.17),w=native+2*pad,pivot=.44;
  const angle=yawDegrees[yaw]*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle);
  const lean=((seed%29)/28-.5)*.052;
  const place=(u,v)=>pad+native*(pivot+(u-pivot)*(.18+.82*cs)+(1-v)*(lean+sn*(.09+.045*Math.sin(2.8*u+4.1*v))));
  const im=herbCanvas(w,h),gc=im.getContext('2d',{willReadFrequently:true}),pic=gc.createImageData(w,h);
  const labels=new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    const v=(y+.5)/h;
    let left=place(-.5/native,v);
    for(let sx=-1;sx<native;sx++){
      const right=place((sx+1.5)/native,v),i=4*(y*native+clamp(sx,0,native-1)),next=4*(y*native+clamp(sx+1,0,native-1));
      for(let x=Math.ceil(left-.5);x<right-.5;x++){
        const t=clamp((x+.5-left)/(right-left)),j=4*(y*w+x);
        blendFanPixel(src.photo,i,next,t,pic.data,j);
        labels[j/4]=src.ids[t<.5?i:next];
      }
      left=right;
    }
  }
  gc.putImageData(pic,0,0);
  Object.defineProperties(im,{naturalWidth:{value:w},naturalHeight:{value:h}});
  const pose=([u,v])=>[place(u,v)/w,v];
  const zones=src.zones.map(z=>({...z,root:pose(z.root),tip:pose(z.tip),points:z.points.map(pose)}));
  sprites[key]=im;foliageRigs[key]={w,h,labels,zones};registerSilhouette(key,im);
  const frame={sprite:key,anchor:pose([pivot,.978])[0],foot:.978,widthMultiplier:w/native};
  botanicalFrames.set(key,{frame,fan:true,layers:[herbLayer(0,0,0,0,im)]});
  return frame;
}
function fanAxisAt(zone,v){
  const pts=zone.points;
  if(v>=pts[0][1])return pts[0][0];
  for(let i=1;i<pts.length;i++)if(v>=pts[i][1]){
    const a=pts[i-1],b=pts[i];return mix(a[0],b[0],clamp((a[1]-v)/Math.max(.0001,a[1]-b[1])));
  }
  return zone.tip[0];
}
function fanDeformer(source,rig){
  const w=source.width,h=source.height,cols=24,rows=32,n=rig.zones.length;
  const weights=new Float32Array((cols+1)*(rows+1)*n);
  for(let y=0;y<=rows;y++)for(let x=1;x<cols;x++){
    const u=x/cols,v=y/rows,offset=(y*(cols+1)+x)*n;
    let sum=.30;
    for(const [i,z] of rig.zones.entries()){
      const gap=Math.max(0,z.tip[1]-v),arm=Math.max(.04,z.root[1]-z.tip[1]);
      const flex=clamp((z.root[1]-v)/arm,0,1),side=(u-fanAxisAt(z,v))/.14;
      const influence=Math.exp(-2.8*side*side-360*gap*gap);
      weights[offset+i]=influence*flex**1.7*Math.min(.70*h,arm*h);
      sum+=influence;
    }
    for(let i=0;i<n;i++)weights[offset+i]/=sum;
  }
  const surface=herbCanvas(w,h),ctx=surface.getContext('2d');
  const src=source.getContext('2d').getImageData(0,0,w,h).data,first=new Uint16Array(h),last=new Uint16Array(h);
  for(let y=0;y<h;y++){
    first[y]=w;
    for(let x=0;x<w;x++)if(src[4*(y*w+x)+3]){
      first[y]=Math.min(first[y],x);last[y]=x;
    }
  }
  return {w,h,cols,rows,n,weights,surface,ctx,src,first,last,previousAngles:new Float32Array(n).fill(Infinity),
    out:ctx.createImageData(w,h),grid:new Float32Array((cols+1)*(rows+1)),tick:-1};
}
function restingFanU(warp,u,v){
  if(!warp||u<0||u>=1||v<0||v>=1)return u;
  const {cols,rows,grid,w}=warp,sy=v*rows,y=Math.floor(sy),fy=sy-y,stride=cols+1,x=u*w,step=w/cols;
  let left=0;
  for(let col=0;col<cols;col++){
    const node=y*stride+col+1,right=(col+1)*step+mix(grid[node],grid[node+stride],fy);
    if(x<=right)return (col+clamp((x-left)/(right-left)))/cols;
    left=right;
  }
  return u;
}
function drawFanWarp(item,rig,angles,t){
  const warp=item.warp??=fanDeformer(item.parts[0].canvas,rig);
  const tick=Math.floor(t*26);if(tick===warp.tick)return warp.surface;
  warp.tick=tick;
  if(warp.previousAngles){
    if(angles.every((v,i)=>Math.abs(v-warp.previousAngles[i])<.00065))return warp.surface;
    warp.previousAngles.set(angles);
  }
  const {w,h,cols,rows,n,grid,weights,src,out}=warp,dx=w/cols,stride=cols+1;
  // Limit local compression. Adjacent positions always retain their order,
  // even when two neighbouring stems are pushed in opposite directions.
  for(let y=0;y<=rows;y++){
    let previous=0;grid[y*stride]=0;
    for(let x=1;x<cols;x++){
      const at=y*stride+x;let shift=0;
      for(let i=0;i<n;i++)shift+=weights[at*n+i]*angles[i];
      const edge=(cols-x)*dx*.44;
      previous=clamp(clamp(shift,previous-.44*dx,previous+.44*dx),-edge,edge);
      grid[at]=previous;
    }
  }
  out.data.fill(0);
  for(let y=0;y<h;y++){
    const rowStart=warp.first?.[y]??0,rowEnd=warp.last?.[y]??w-1;
    if(rowStart>rowEnd)continue;
    const base=y*w,v=(y+.5)*rows/h,iy=Math.floor(v),fy=v-iy;
    let from=0;
    for(let col=0;col<cols;col++){
      const node=iy*stride+col+1,to=(col+1)*dx+mix(grid[node],grid[node+stride],fy);
      if((col+1)*dx<rowStart-1||col*dx>rowEnd+1){from=to;continue;}
      const scale=dx/(to-from),end=Math.min(w,Math.ceil(to-.5));
      let x=Math.max(0,Math.ceil(from-.5)),sx=col*dx+(x+.5-from)*scale-.5;
      for(;x<end;x++,sx+=scale){
        const i=clamp(Math.floor(sx),0,w-1),j=4*(base+x),k=4*(base+i);
        blendFanPixel(src,k,i===w-1?k:k+4,clamp(sx-i),out.data,j);
      }
      from=to;
    }
  }
  warp.ctx.putImageData(out,0,0);return warp.surface;
}

;
/* botanical-render */
'use strict';

// Rectify each intact specimen once. Coordinates then run along the root-to-tip axis
// and across its blade, including any curled tissue beyond either landmark.
const botanicalCells={},botanicalFrames=new Map();
function herbCanvas(w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function prepareCell(image,index,count,cell){
  const w=image.naturalWidth/count,h=image.naturalHeight;
  const rx=w*cell.root[0],ry=h*cell.root[1],dx=w*cell.tip[0]-rx,dy=h*cell.tip[1]-ry;
  const length=Math.hypot(dx,dy),ax=dx/length,ay=dy/length,nx=-ay,ny=ax;
  const corners=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>[(x-rx)*nx+(y-ry)*ny,(x-rx)*ax+(y-ry)*ay]);
  const l=Math.floor(Math.min(...corners.map(p=>p[0])))-1,t=Math.floor(Math.min(...corners.map(p=>p[1])))-1;
  const c=herbCanvas(Math.ceil(Math.max(...corners.map(p=>p[0])))-l+2,Math.ceil(Math.max(...corners.map(p=>p[1])))-t+2);
  const g=c.getContext('2d',{willReadFrequently:true});
  g.setTransform(nx,ax,ny,ay,-rx*nx-ry*ny-l,-rx*ax-ry*ay-t);
  g.drawImage(image,index*w,0,w,h,0,0,w,h);
  const data=g.getImageData(0,0,c.width,c.height).data;
  let left=c.width,right=0,top=c.height,bottom=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[4*(y*c.width+x)+3]>8){
    left=Math.min(x,left);right=Math.max(x,right);top=Math.min(y,top);bottom=Math.max(y,bottom);
  }
  const levels=[{data,w:c.width,h:c.height,scale:1}];
  // Minify the full alpha coverage before drawing oblique leaf stalks. A fine
  // petiole can otherwise fall between destination pixels at a small scale.
  let prev=c;
  for(let scale=.5;scale>=.0625;scale*=.5){
    const m=herbCanvas(Math.ceil(c.width*scale),Math.ceil(c.height*scale)),mc=m.getContext('2d',{willReadFrequently:true});
    mc.imageSmoothingQuality='high';mc.drawImage(prev,0,0,prev.width*.5,prev.height*.5);
    levels.push({data:mc.getImageData(0,0,m.width,m.height).data,w:m.width,h:m.height,scale});prev=m;
  }
  return {levels,l,t,length,inkWidth:Math.max(1,right-left),box:[left+l-1,top+t-1,right+l+2,bottom+t+2]};
}
async function loadBotany(kind){
  const im=new Image();im.src='assets/botany/'+kind+'.webp';
  const [meta]=await Promise.all([fetch('assets/botany/'+kind+'.json').then(r=>{if(!r.ok)throw Error(kind);return r.json();}),im.decode()]);
  botanicalCells[kind]=meta.cells.map((cell,i)=>prepareCell(im,i,meta.cells.length,cell));
}
function herbLayer(id,depth,x,y,canvas){return {id,depth,x,y,canvas};}
function drawBlade(cell,root,tip,width,curve,lift,id,depth){
  const vx=tip[0]-root[0],vy=tip[1]-root[1],length=Math.max(.1,Math.hypot(vx,vy));
  const tx=vx/length,ty=vy/length,nx=-ty,ny=tx;
  const along=length/cell.length,across=width/cell.inkWidth,bend=nx*curve-ny*lift;
  const [left,top,right,bottom]=cell.box;
  const pts=[];
  for(const a of [top,bottom])for(const b of [left,right])for(const offset of [0,bend])pts.push([
    root[0]+tx*a*along+nx*(b*across+offset),root[1]+ty*a*along+ny*(b*across+offset)]);
  const x0=Math.floor(Math.min(...pts.map(p=>p[0])))-1,y0=Math.floor(Math.min(...pts.map(p=>p[1])))-1;
  const cw=Math.ceil(Math.max(...pts.map(p=>p[0])))-x0+2,ch=Math.ceil(Math.max(...pts.map(p=>p[1])))-y0+2;
  const canvas=herbCanvas(cw,ch),g=canvas.getContext('2d'),out=g.createImageData(cw,ch);
  const mip=cell.levels[Math.min(4,Math.max(0,Math.floor(-Math.log2(Math.max(along,across))+.25)))],src=mip.data;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    const dx=x+x0+.5-root[0],dy=y+y0+.5-root[1],s=dx*tx+dy*ty;
    const v=(s/along-cell.t)*mip.scale-.5,u=((dx*nx+dy*ny-bend*Math.sin(Math.PI*clamp(s/length)))/across-cell.l)*mip.scale-.5;
    const iu=Math.floor(u),iv=Math.floor(v);
    if(iu<0||iv<0||iu+1>=mip.w||iv+1>=mip.h)continue;
    const k=4*(iv*mip.w+iu),j=4*(y*cw+x),kx=k+4,ky=k+mip.w*4,kxy=ky+4;
    const fx=u-iu,fy=v-iv;
    const a=(1-fx)*(1-fy)*src[k+3],b=fx*(1-fy)*src[kx+3],c=(1-fx)*fy*src[ky+3],d=fx*fy*src[kxy+3],sum=a+b+c+d;
    if(sum<1)continue;
    for(let i=0;i<3;i++)out.data[j+i]=(a*src[k+i]+b*src[kx+i]+c*src[ky+i]+d*src[kxy+i])/sum;
    out.data[j+3]=sum;
  }
  g.putImageData(out,0,0);return herbLayer(id,depth,x0,y0,canvas);
}
function drawPlantStem(stem,project,span){
  const points=stem.points.map(p=>project(p)),weight=Math.max(1,stem.width*span);
  const l=Math.floor(Math.min(...points.map(p=>p[0]))-weight),t=Math.floor(Math.min(...points.map(p=>p[1]))-weight);
  const c=herbCanvas(Math.ceil(Math.max(...points.map(p=>p[0]))-l+weight+1),Math.ceil(Math.max(...points.map(p=>p[1]))-t+weight+1));
  const g=c.getContext('2d');g.translate(-l,-t);g.lineCap=g.lineJoin='round';
  g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
  g.strokeStyle=stem.color||'#626044';g.lineWidth=weight;g.stroke();
  g.translate(-weight*.17,0);g.lineWidth=weight*.20;g.strokeStyle='rgba(184,176,119,.32)';g.stroke();
  return herbLayer(0,stem.depth??-.65,l,t,c);
}
function botanicalFrameFor(p,age=plantAge(p),yaw=p.yaw??2){
  const seed=seedOf(p),key=['plant',p.kind,age,seed,yaw].join('/');
  if(botanicalFrames.has(key)){
    const cached=botanicalFrames.get(key);botanicalFrames.delete(key);botanicalFrames.set(key,cached);return cached.frame;
  }
  if(p.kind==='stems'&&age===2&&seed%3===1)return fanFrame(key,seed,yaw);
  const layout=botanicalLayout(p.kind,age,seed),a=layout.anchor,angle=yawDegrees[yaw]*Math.PI/180;
  const cs=Math.cos(angle),sn=Math.sin(angle),span=Math.round(380*Math.min(1,layout.aspect)),height=span/layout.aspect;
  function project(uv,depth=0){
    const x=uv[0]-a[0],z=depth*.20;
    return [span*(a[0]+x*cs+z*sn),height*uv[1]+span*.14*(z*(cs-1)-x*sn)];
  }
  const zones=[],layers=(layout.stems||[]).map(stem=>drawPlantStem(stem,project,span));
  for(const [i,piece] of layout.parts.entries()){
    const root=project(piece.root),tip=project(piece.tip,piece.depth);
    const depth=piece.depth*cs-(piece.tip[0]-a[0])*sn*1.25,id=i+1;
    const width=piece.width*span*(.72+.28*Math.abs(cs+piece.depth*sn*.65));
    layers.push(drawBlade(botanicalCells[p.kind][piece.cell%botanicalCells[p.kind].length],root,tip,width,(piece.curve||0)*span*cs,(piece.lift||0)*height,id,depth));
    zones.push({id,root,tip});
  }
  layers.sort((a,b)=>a.depth-b.depth);
  const anchor=project(a);
  const l=Math.floor(Math.min(anchor[0],...layers.map(p=>p.x)))-3,t=Math.floor(Math.min(anchor[1],...layers.map(p=>p.y)))-3;
  const w=Math.ceil(Math.max(anchor[0],...layers.map(p=>p.x+p.canvas.width)))-l+4,h=Math.ceil(Math.max(anchor[1],...layers.map(p=>p.y+p.canvas.height)))-t+4;
  const im=herbCanvas(w,h),g=im.getContext('2d',{willReadFrequently:true}),labels=new Uint8Array(w*h);
  Object.defineProperties(im,{naturalWidth:{value:w},naturalHeight:{value:h}});
  for(const part of layers){
    part.x-=l;part.y-=t;
    g.drawImage(part.canvas,part.x,part.y);
    const pw=part.canvas.width,ph=part.canvas.height,data=part.canvas.getContext('2d').getImageData(0,0,pw,ph).data;
    if(part.id)part.coverage=new Uint8Array(Math.ceil(pw*ph/8));
    for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
      const i=y*pw+x,a=data[4*i+3];
      if(a>30)labels[(part.y+y)*w+part.x+x]=part.id;
      if(part.coverage&&a>42)part.coverage[i>>3]|=1<<(i&7);
    }
  }
  const unit=([x,y])=>[(x-l)/w,(y-t)/h];
  for(const z of zones){z.root=unit(z.root);z.tip=unit(z.tip);}
  const pivot=unit(anchor),stages={crypt:[.42,.72],stems:[.33,.68],anubias:[.45,.73],pinnatifida:[.35,.65],moss:[.44,.75]};
  sprites[key]=im;foliageRigs[key]={w,h,zones,labels};registerSilhouette(key,im);
  const frame={sprite:key,anchor:pivot[0],foot:pivot[1],widthMultiplier:w/span*(stages[p.kind][age]||1)};
  botanicalFrames.set(key,{frame,layers});return frame;
}
function trimPlantFrames(){
  while(botanicalFrames.size>64){
    const key=botanicalFrames.keys().next().value;botanicalFrames.delete(key);
    delete sprites[key];delete masks[key];delete shadows[key];delete foliageRigs[key];delete silhouettes[key];
    for(const entry of poseBounds.keys())if(entry.startsWith(key+'/'))poseBounds.delete(entry);
  }
}
function plantThumbnail(p,stage,yaw,max=72){
  const img=sprites[botanicalFrameFor(p,stage,yaw).sprite],s=max/Math.max(img.width,img.height);
  const c=herbCanvas(Math.max(1,Math.round(img.width*s)),Math.max(1,Math.round(img.height*s)));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c;
}

;
/* growth */
'use strict';

const plantLife={
  pinnatifida:{hours:[6,84],names:['雨裂水蓑衣侧芽','展裂叶','侧枝成丛'],hint:'侧芽可以浅植在底砂，也可以贴在沉木或石面。横生侧枝会沿着表面伸展。'},
  stems:{hours:[1,24],names:['茎草插穗','分枝','成丛'],hint:'将插穗下端插进砂里，新枝会从茎节旁长出。'},
  crypt:{hours:[5,72],names:['椒草幼株','抽叶','成株'],hint:'把短根埋进砂里，让叶片从砂面上的株心舒展开。'},
  anubias:{hours:[8,96],names:['水榕分株','展叶','成株'],hint:'让根茎露在外面。放在沉木或石头上，细根会沿表面伸展。'},
  moss:{hours:[3,48],names:['莫丝小丛','分枝','铺开'],hint:'把一小撮莫丝附在木石上，分枝会慢慢铺成一层。'}
};
const foliageRigs={};
function seedOf(p){
  if(Number.isSafeInteger(p.growthSeed)&&p.growthSeed>=0)return p.growthSeed>>>0;
  let hash=2166136261;
  for(const char of p.kind+'/'+p.id)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return hash>>>0;
}
function differentForm(seed,previous){
  return seed%3===previous%3?(seed<4294967295?seed+1:seed-1):seed;
}

// Simulated hours belong to this playtest session. Saved plants retain their
// real planting date, and a new cutting starts at zero even after a time jump.
const trialPlantOffsets=new Map();
function plantClock(p){
  return careNow()-(trialPlantOffsets.get(p.id+'/'+p.plantedAt)||0);
}
function plantAge(p,now=plantClock(p)){
  if(!plantLife[p.kind]||!Number.isFinite(p.plantedAt))return 2;
  const [early,established]=plantLife[p.kind].hours,h=(now-p.plantedAt)/3600000;
  return h<early?0:h<established?1:2;
}
function growthDuration(hours){
  const mins=Math.max(1,Math.ceil(hours*60));
  if(mins<60)return mins+' 分钟';
  const h=Math.ceil(mins/60);
  if(h<24)return h+' 小时';
  const days=Math.floor(h/24),rest=h%24;
  return days+' 天'+(rest===12?'半':rest?' '+rest+' 小时':'');
}
function growthReading(p,now=plantClock(p)){
  const spec=plantLife[p.kind],age=plantAge(p,now);
  if(age===2)return '已成株 · '+spec.names[2];
  const hours=(p.plantedAt+spec.hours[age]*3600000-now)/3600000;
  return (age===0?'幼株':'生长中')+' · '+spec.names[age]+'，约 '+growthDuration(hours)+'后'+spec.names[age+1]+'。';
}
function plantNew(p,at=Date.now(),previous=null){
  if(plantLife[p.kind]){
    delete p.growthSeed;
    const seed=seedOf(p);
    p.growthSeed=previous?differentForm(seed,seedOf(previous)):seed;p.plantedAt=at;
    if(demoOffset)trialPlantOffsets.set(p.id+'/'+at,demoOffset);
  }
  return p;
}
function newGarden(name,rememberStart=false){
  let at=Date.now();
  if(rememberStart)try{
    const key=stateKey+'.started.'+name,old=Number(localStorage.getItem(key));
    if(old>0&&old<=at)at=old;else localStorage.setItem(key,at);
  }catch{}
  return composition(name).map(p=>plantNew(p,at));
}
function showGrowth(p){
  const note=$('#grow-note'),spec=plantLife[p?.kind];
  note.hidden=!spec||compare;if(note.hidden)return;
  const age=plantAge(p),key=p.id+'/'+age+'/'+seedOf(p)+'/'+Math.floor(plantClock(p)/60000);
  if(note.dataset.key===key)return;note.dataset.key=key;
  const title=document.createElement('strong');title.textContent=growthReading(p);
  const desc=document.createElement('span');desc.textContent=spec.hint+' 从种下到成株约 '+growthDuration(spec.hours[1])+'。';
  const stages=document.createElement('div');stages.className='grow-stages';
  spec.names.forEach((name,i)=>{
    const el=document.createElement('span'),im=plantThumbnail(p,i,2);
    if(i===age)el.setAttribute('aria-current','step');el.append(im,name);stages.append(el);
  });
  note.replaceChildren(title,desc,stages);
}

;
/* landscape */
'use strict';

const catalog = {
  arch: { name:'拱桥沉木', sprite:'turn/arch-2', w:478, turns:true, support:true, shadow:.27 },
  terrace: { name:'层叠石', sprite:'turn/terrace-2', w:315, turns:true, support:true, shadow:.43 },
  branch: { turns:true, name:'沉木', sprite:'branch', w:425, anchor:.15, foot:.955, support:true, shadow:.24 },
  stone:  { turns:true, name:'青石', sprite:'stone', w:243, anchor:.50, foot:.94, support:true, shadow:.46 },
  pebble: { turns:true, name:'小石', sprite:'river-pebble', w:108, anchor:.54, foot:.978, attaches:true, shadow:.44 },
  moss:   { name:'莫丝', sprite:'moss', living:true, w:116, anchor:.50, foot:.86, attaches:true, shadow:.39 },
  anubias:{ name:'小水榕', sprite:'anubias', w:160, anchor:.29, foot:.885, attaches:true, living:true, shadow:.15 },
  crypt:  { name:'椒草', sprite:'crypt', w:170, anchor:.50, foot:.98, living:true, shadow:.11 },
  pinnatifida:{ name:'雨裂水蓑衣',sprite:'pinnatifida',w:258,anchor:.3412,foot:.8924,attaches:true,living:true,shadow:.16 },
  stems:  { name:'茎草', sprite:'stems', w:208, anchor:.44, foot:.98, living:true, shadow:.20 }
};
const yawDegrees=[-55,-28,0,28,55],turnViews={};
const stateKey=(globalThis.tankSavePrefix||'')+'aquarium.light-study.layout.1';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
function smooth(a,b,x){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}
function piece(id,kind,x,z,size=1,flip=false,host=null,slot=.5,yaw=2,tilt=0){
  const p={id,kind,x,z,size,flip,host,slot};
  p.yaw=Number.isFinite(yaw)?clamp(Math.round(yaw),0,yawDegrees.length-1):2;
  p.tilt=Number.isFinite(tilt)?clamp(Math.round(tilt),-15,15):0;
  return p;
}
function composition(name){
  if(name==='black-bank')return [
    piece('bk1','branch',.29,.26,1.04,false,null,.5,3,-4),
    piece('bk2','terrace',.25,.42,.72,false,null,.5,1,-3),
    piece('bk3','pinnatifida',.29,.26,1.03,false,'bk1',.44,2),
    piece('bk4','pinnatifida',.36,.20,1.00,false,null,.5,3),
    piece('bk5','crypt',.21,.53,.86),piece('bk6','stems',.21,.08,1.14),
    piece('bk7','stone',.76,.35,.82,true,null,.5,3),
    piece('bk8','anubias',.76,.35,1.08,false,'bk7',.52),
    piece('bk9','moss',.25,.42,.82,false,'bk2',.63),
    piece('bk10','pebble',.63,.66,.54,true),piece('bk11','pebble',.72,.53,.52),
    piece('bk12','crypt',.83,.16,.76,true)
  ];
  if(name==='fern-bank')return [
    piece('b1','branch',.29,.33,1.18,false,null,.5,3,-3),
    piece('b2','stone',.22,.49,.78,false,null,.5,1,3),
    piece('b3','pinnatifida',.29,.33,1.30,false,'b1',.37),
    piece('b4','pinnatifida',.29,.33,.95,true,'b1',.65,1),
    piece('b5','stems',.22,.12,1.07),piece('b6','crypt',.29,.48,.85,true),
    piece('b7','pebble',.47,.62,.59),piece('b8','pebble',.53,.77,.42,true),
    piece('b9','terrace',.76,.33,.68,true,null,.5,1,-4),
    piece('b10','moss',.76,.33,.94,false,'b9',.43),
    piece('b11','pinnatifida',.79,.18,.92,false),
    piece('b12','pebble',.71,.59,.57,false,null,.5,3)
  ];
  if(name==='creek')return [
    piece('c1','stems',.146,.05,1.47),piece('c2','stems',.215,.10,1.11,true),
    piece('c3','crypt',.132,.23,1.00),piece('c4','branch',.145,.39,1.45),
    piece('c5','anubias',.23,.39,1.05,false,'c4',.40),
    piece('c6','moss',.15,.39,.82,false,'c4',.10),
    piece('c7','crypt',.214,.48,.62,true),piece('c8','stone',.135,.58,.47,true),
    piece('c9','moss',.135,.58,.68,true,'c8',.43),piece('c10','pebble',.208,.70,.63),
    piece('c11','moss',.180,.68,.54),piece('c12','pebble',.272,.64,.43,true),
    piece('c13','terrace',.802,.23,.89,true,null,.5,3,-5),
    piece('c14','moss',.80,.23,1.02,true,'c13',.44),
    piece('c15','stone',.719,.54,.68),piece('c16','moss',.715,.54,.61,false,'c15',.54),
    piece('c17','pebble',.656,.64,.49,true),piece('c18','moss',.836,.52,.67),
    piece('c19','anubias',.877,.19,.48,true),piece('c20','pebble',.747,.67,.40)
  ];
  if(name==='archway')return [
    piece('r1','stems',.21,.09,1.42),piece('r2','stems',.15,.19,.85,true),
    piece('r3','arch',.352,.44,1.12,false,null,.5,4),piece('r4','terrace',.743,.42,.94),
    piece('r5','anubias',.32,.44,.71,false,'r3',.18),
    piece('r6','moss',.74,.42,.70,false,'r4',.57),
    piece('r7','crypt',.193,.52,.89,true),piece('r8','pebble',.205,.69,.67),
    piece('r9','pebble',.599,.71,.48,true),piece('r10','pebble',.656,.66,.73),
    piece('r11','crypt',.810,.12,.88),piece('r12','moss',.24,.60,.53,true),
    piece('r13','moss',.799,.58,.63),piece('r14','pebble',.627,.63,.51,true)
  ];
  if(name==='slope')return [
    piece('s1','stems',.70,.05,1.30,true),piece('s2','stems',.81,.15,.85),
    piece('s3','branch',.80,.36,1.12,true),piece('s4','stone',.68,.53,.99,true),
    piece('s5','crypt',.79,.61,.88,true),piece('s6','pebble',.57,.71,.91),
    piece('s7','stone',.38,.55,.51,true),piece('s8','moss',.38,.55,.64,false,'s7',.58),
    piece('s9','moss',.72,.36,.93,true,'s3',.36),piece('s10','moss',.64,.53,.75,true,'s4',.47),
    piece('s11','crypt',.60,.48,.57),piece('s12','pebble',.31,.65,.53,true),
    piece('s13','anubias',.75,.36,.92,true,'s3',.19),piece('s14','moss',.695,.52,.55,false),
    piece('s15','pebble',.548,.58,.50,true)
  ];
  return [
    piece('a1','stems',.215,.04,1.50),piece('a2','stems',.144,.24,.81,true),
    piece('a3','branch',.194,.45,1.18),piece('a4','crypt',.238,.56,.95,true),
    piece('a5','stone',.217,.68,.67,true),piece('a6','pebble',.288,.76,.77),
    piece('a7','stone',.757,.36,.96),piece('a8','pebble',.681,.60,1.02,true),
    piece('a9','moss',.75,.36,.87,false,'a7',.55),piece('a10','moss',.23,.45,.69,false,'a3',.24),
    piece('a11','moss',.21,.68,.50,true,'a5',.53),piece('a12','pebble',.624,.61,.44),
    piece('a13','crypt',.810,.09,.58),
    piece('a14','anubias',.23,.45,.90,false,'a3',.20),piece('a15','anubias',.77,.36,.58,true,'a7',.81),
    piece('a16','moss',.185,.72,.72,true),piece('a17','pebble',.318,.62,.43,true)
  ];
}
function readLayout(){
  let value;try{value=JSON.parse(localStorage.getItem(stateKey));}catch{}
  if(value?.version===2&&Array.isArray(value.items)){
    terrain=activeBed=validBed(value.bed);
    const ids=new Set(),items=[];
    for(const p of value.items.slice(0,40)){
      if(!p||!Object.hasOwn(catalog,p.kind)||typeof p.id!=='string'||ids.has(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
      ids.add(p.id);
      items.push(piece(p.id,p.kind,clamp(p.x),clamp(p.z),clamp(Number.isFinite(p.size)?p.size:1,.4,1.55),p.flip===true,typeof p.host==='string'?p.host:null,clamp(Number.isFinite(p.slot)?p.slot:.5),p.yaw,p.tilt));
      if(plantLife[p.kind])items.at(-1).growthSeed=seedOf(p);
      if(plantLife[p.kind]&&Number.isFinite(p.plantedAt)&&p.plantedAt>0)items.at(-1).plantedAt=p.plantedAt;
    }
    for(const p of items)if(!catalog[p.kind].attaches||!items.some(h=>h.id===p.host&&catalog[h.kind].support))p.host=null;
    return items;
  }
  if(value&&['branch','stone','crypt'].every(k=>Number.isFinite(value[k]?.x)&&Number.isFinite(value[k]?.z))){
    return ['branch','stone','crypt'].map(k=>piece(k,k,clamp(value[k].x),clamp(value[k].z)));
  }
  if(globalThis.tankSavePrefix)return starterLayout();
  return newGarden('islands',true);
}
// Points follow the broad upper ridge of the stone and the solid central limb of the wood.
const ridges={
  branch:[[.13,.65],[.25,.62],[.33,.57],[.44,.51],[.53,.455],[.60,.38],[.66,.285],[.74,.245]],
  stone:[[.24,.085],[.31,.137],[.39,.238],[.48,.315],[.58,.385],[.67,.456],[.78,.535]]
};
function frameFor(p){
  const d=catalog[p.kind],yaw=p.yaw??2;
  if(d.turns)return turnViews[p.kind][yaw];
  return botanicalFrameFor(p);
}
function ridgePoint(line,t){
  const n=clamp(t)*(line.length-1),i=Math.min(line.length-2,Math.floor(n));
  return [mix(line[i][0],line[i+1][0],n-i),mix(line[i][1],line[i+1][1],n-i)];
}
// The same material point drives drawing, attachments, contact shadows and hit testing.
function relativePoint(g,u,v){
  const dx=(u-g.pivotX)*g.width*g.sign,dy=(v-g.pivotY)*g.height;
  return {x:g.cos*dx-g.sin*dy,y:g.sin*dx+g.cos*dy};
}
function worldPointOnSprite(g,u,v){
  const p=relativePoint(g,u,v);return {x:g.x+p.x,y:g.y+p.y};
}
function surfaceAt(g,t){
  const [u,v]=ridgePoint(g.ridge,t);return worldPointOnSprite(g,u,v);
}
function occludedAt(g,t){
  if(!g.behind)return false;
  return g.behind[Math.round(clamp(t)*(g.behind.length-1))]===true;
}
function extents(g){
  const [l,t,r,b]=silhouettes[g.sprite].box;
  const corners=[[l,t],[r,t],[r,b],[l,b]].map(([u,v])=>relativePoint(g,u,v));
  return {left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y))};
}
function geometry(items){
  const map=new Map(),hosts=new Map(items.map(p=>[p.id,p]));
  function place(p){
    if(map.has(p.id))return map.get(p.id);
    const d=catalog[p.kind],frame=frameFor(p),im=sprites[frame.sprite];
    const host=hosts.get(p.host),parent=host&&catalog[host.kind].support&&d.attaches?place(host):null;
    const z=parent?parent.z:p.z,row=sandRow(z);
    const scale=.88*row.ratio*p.size*(frame.widthMultiplier||1)*(parent?parent.sizeScale:1);
    let x=projectLateral(p.x,row),bed=rowY(row,x),y=bed,angle=(p.tilt||0)*Math.PI/180;
    if(parent){
      const point=surfaceAt(parent,p.slot),a=surfaceAt(parent,p.slot-.04),b=surfaceAt(parent,p.slot+.04);
      x=point.x;y=point.y;
      const dir=b.x<a.x?-1:1;
      const slope=Math.atan2((b.y-a.y)*dir,(b.x-a.x)*dir);
      angle+=clamp(slope,-.58,.58)*(p.kind==='moss'?1:p.kind==='anubias'?.33:.55);
    }
    if(!parent&&d.turns){
      const xx=clamp(x,row.left,row.right),ox=xx-12,ex=xx+12;
      angle+=clamp(Math.atan((terrainHeight(ox,z)-terrainHeight(ex,z))/24),-.21,.21)*.67;
    }
    const g={id:p.id,kind:p.kind,x,y,z,bed,angle,cos:Math.cos(angle),sin:Math.sin(angle),sign:p.flip?-1:1,
      pivotX:frame.anchor,pivotY:frame.foot,sprite:frame.sprite,feet:frame.feet,
      ridge:frame.ridge||ridges[p.kind],behind:frame.behind,attached:!!parent,host:parent,slot:p.slot,
      depth:parent?parent.depth+.0001:z,
      width:d.w*scale,height:d.w*scale*im.naturalHeight/im.naturalWidth};
    let drop=0,footDepth=0;
    if(g.feet){
      const lowest=Math.max(...g.feet.map(pt=>pt[1]));
      const points=g.feet.map(([u,v])=>{
        const rel=relativePoint(g,u,v),floorDelta=rowY(row,x+rel.x)-rowY(row,x);
        return {y:rel.y,againstSand:rel.y-(v-lowest)*g.height-floorDelta};
      });
      // Each foot has its own sand depth. A tilted heavy stone settles into the bed.
      const contactHeights=points.map(pt=>pt.againstSand).sort((a,b)=>a-b);
      const index=Math.round((contactHeights.length-1)*(p.kind==='terrace'?.20:.46));
      drop=Math.min(contactHeights[index],Math.max(...points.map(pt=>pt.y)));
      footDepth=(lowest-Math.min(...g.feet.map(pt=>pt[1])))*g.height;
    }
    if(!g.feet)footDepth=g.height*({branch:.11,stone:.075,pebble:.085,moss:.05}[p.kind]||.018);
    const rear=sandRow(0),front=sandRow(1);
    let bounds=parent?extents(g):solidExtents(g,drop),fit=1;
    if(parent){
      if(bounds.top<0)fit=Math.min(fit,(y-.343*H)/-bounds.top);
    }else{
      const availableDepth=rowY(front,x)-rowY(rear,x);
      fit=Math.min(fit,(bed-.348*H)/Math.max(1,drop-bounds.top),
        (row.right-row.left)/(bounds.right-bounds.left),availableDepth*.95/Math.max(.01,footDepth));
    }
    if(fit<1){
      const ratio=Math.max(.01,fit);g.width*=ratio;g.height*=ratio;drop*=ratio;footDepth*=ratio;
      bounds={left:bounds.left*ratio,right:bounds.right*ratio,top:bounds.top*ratio};
    }
    g.min=row.left-bounds.left;g.max=row.right-bounds.right;
    g.sizeScale=p.size*fit;g.row=row;
    if(!parent){
      g.x=clamp(x,g.min,g.max);
      // Rear feet touch the rear seam at the far limit; front feet meet the front seam at the near limit.
      g.bed=rowY(row,g.x)+(1-row.t)*footDepth;
      g.y=g.bed-drop;
    }
    g.left=g.x+bounds.left;g.right=g.x+bounds.right;g.top=g.y+bounds.top;
    map.set(p.id,g);return g;
  }
  items.forEach(place);
  for(const child of map.values())if(child.host)(child.host.attachments??=[]).push(child);
  return map;
}
function saveLayout(items){try{localStorage.setItem(stateKey,JSON.stringify({version:2,items,bed:terrain}));return true;}catch{return false;}}

;
/* materials */
'use strict';

const materials=new Map(),sourcePaint={},surfaceMaps={},lightField=new Float32Array(128*80);
let causticTexture;
function windowField(u,v){
  const d=u+.46*(v-.34)+.012*Math.sin(11*u+7*v),envelope=smooth(.25,.74,d)*(1-smooth(1.12,1.48,d));
  const bands=.56+.18*Math.cos(29*d+1.1)+.072*Math.cos(53*d-.4)+.033*Math.cos(100*d+.5);
  return envelope*bands;
}
function imagePixels(im,w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const s=c.getContext('2d',{willReadFrequently:true});s.drawImage(im,0,0,w,h);
  return s.getImageData(0,0,w,h).data;
}
async function passImage(path){
  const im=new Image();im.src='assets/turn/'+path+'.webp';await im.decode();return im;
}
const surfaceMetadata=new Map(),surfaceRequests=new Map(),surfaceRetryAt=new Map();
function requestSurface(p){
  if(!catalog[p.kind].turns)return;
  const kind=p.kind,index=p.yaw??2,key=turnViews[kind][index].sprite;
  if(surfaceMaps[key]||performance.now()<(surfaceRetryAt.get(key)||0))return;
  if(surfaceRequests.has(key))return surfaceRequests.get(key);
  if(!surfaceMetadata.has(kind)){
    const metadata=fetch('assets/turn/'+kind+'-depth.json').then(r=>{
      if(!r.ok)throw Error('Missing surface points');
      return r.json();
    }).catch(error=>{surfaceMetadata.delete(kind);throw error;});
    surfaceMetadata.set(kind,metadata);
  }
  const task=Promise.all([surfaceMetadata.get(kind),passImage(kind+'-normal-'+index),passImage(kind+'-depth-'+index)])
    .then(([meta,normal,depth])=>{
      const w=normal.naturalWidth,h=normal.naturalHeight;
      surfaceMaps[key]={w,h,normal:imagePixels(normal,w,h),depth:imagePixels(depth,w,h),ridge:meta.views[index].ridgeDepth};
      delete sourcePaint[key];surfaceRetryAt.delete(key);
    }).catch(()=>{surfaceRetryAt.set(key,performance.now()+15000);})
    .finally(()=>surfaceRequests.delete(key));
  surfaceRequests.set(key,task);return task;
}
function leafOcclusion(host,slot){
  if(!host)return null;
  const pass=surfaceMaps[host.sprite],n=pass?clamp(slot)*(pass.ridge.length-1):0,i=Math.floor(n);
  const im=sprites[host.sprite];
  return {host,pass,alpha:masks[host.sprite],w:im.naturalWidth,h:im.naturalHeight,
    near:pass?mix(pass.ridge[i],pass.ridge[Math.min(i+1,pass.ridge.length-1)],n-i):0};
}
function visibility(cover,x,y,above,foot){
  if(!cover)return 1;
  const h=cover.host,dx=x-h.x,dy=y-h.y;
  const u=h.pivotX+(dx*h.cos+dy*h.sin)*h.sign/h.width,v=h.pivotY+(-dx*h.sin+dy*h.cos)/h.height;
  if(u<0||v<0||u>=1||v>=1||(!h.attached&&y>pieceBedAt(h,x)))return 1;
  const alpha=cover.alpha[Math.floor(v*cover.h)*cover.w+Math.floor(u*cover.w)]/255;
  if(!alpha)return 1;
  if(!cover.pass)return 1-alpha*(1-smooth(-.03,.035,above));
  const m=cover.pass,index=4*(Math.floor(v*m.h)*m.w+Math.floor(u*m.w));
  // Leaf tips reach slightly out toward the viewer; the rhizome sits just inside the bark.
  const leafDepth=cover.near-.012+.070*clamp(above/Math.max(.2,foot));
  return 1-alpha*smooth(.003,.024,m.depth[index]/255-leafDepth);
}
function sourceFor(key){
  if(!sourcePaint[key]){
    const im=sprites[key],s=Math.min(1,(surfaceMaps[key]?600:410)/Math.max(im.naturalWidth,im.naturalHeight));
    const w=Math.max(1,Math.round(im.naturalWidth*s)),h=Math.max(1,Math.round(im.naturalHeight*s));
    sourcePaint[key]={w,h,data:imagePixels(im,w,h)};
  }
  return sourcePaint[key];
}
// For single-view art, broad upper planes and the painted local relief approximate a surface normal.
function paintedFacing(data,k,w,i,j,luma,v){
  if(i<2||j<2)return .32;
  const above=k-w*8,left=k-8;
  const ly=(data[above+3]?data[above+1]:luma)-luma,lx=(data[left+3]?data[left+1]:luma)-luma;
  return clamp(.27+.32*(1-v)+.008*(lx-ly)+.003*(luma-72),.13,.92);
}
function attachmentShadows(c,g,w,h,s){
  if(!g.attachments)return;
  c.save();c.globalCompositeOperation='source-atop';
  c.translate(g.pivotX*w,g.pivotY*h);c.scale(w/g.width*g.sign,h/g.height);
  c.rotate(-g.angle);c.translate(-g.x,-g.y);
  for(const child of g.attachments){
    c.save();c.translate(child.x,child.y+1.3);
    if(finishScene?.compact){
      // A rhizome settles on a small patch of bark or stone, even if its
      // outer leaves are long. Keep this shade under the attachment point.
      c.rotate(child.angle);c.scale(1,.24);
      const r=Math.max(2,child.width*.14),shade=c.createRadialGradient(0,0,0,0,0,r);
      shade.addColorStop(0,'rgba(35,42,30,.23)');shade.addColorStop(1,'rgba(35,42,30,0)');
      c.fillStyle=shade;c.fillRect(-r,-r,2*r,2*r);c.restore();continue;
    }
    const sideways=mix(clamp((W*.5-child.x)/W,-.4,.4),.38,s);
    c.transform(1,0,sideways,.32+.11*s,0,0);
    c.rotate(child.angle);c.scale(child.sign,1);c.globalAlpha=.23+.14*s;
    c.drawImage(shadows[child.sprite],-child.pivotX*child.width,-child.pivotY*child.height,child.width,child.height);
    c.restore();
  }
  c.restore();
}
function materialFor(p,g){
  let item=materials.get(p.id);
  if(!item){item={canvas:document.createElement('canvas'),key:''};materials.set(p.id,item);}
  const host=g.host;
  const key=[g.sprite,!!surfaceMaps[g.sprite],!!surfaceMaps[host?.sprite],Boolean(g.attachments&&finishScene?.compact),activeBed.heights.join(','),oldGrade,g.sign,g.x,g.y,g.width,g.height,g.angle,g.bed,p.z,
    host?.sprite,host?.x,host?.y,host?.width,host?.angle,host?.sign,p.slot,
    g.attachments?.map(a=>[a.sprite,a.x,a.y,a.width,a.angle,a.sign].join(',')).join('/')].join('|');
  if(item.key===key)return item;
  // During a drag the transformed sprite follows the finger. Repaint the lighting on release.
  if(item.key&&editing&&(slidingPosition()||drag?.action==='place'&&drag.moved)&&item.sprite===g.sprite)return item;
  item.sprite=g.sprite;
  const paint=sourceFor(g.sprite),{w,h,data}=paint,pass=surfaceMaps[g.sprite],s=sun,l=lamp;
  const side=-.68*mood[0]+.65*mood[1]+.81*mood[2];
  const cover=leafOcclusion(host,p.slot),dirX=g.sign*(g.cos*side-g.sin*.70),dirY=g.sin*side+g.cos*.70;
  const ledX=clamp((W*.5-g.x)/(W*.51),-.68,.68);
  const lampX=g.sign*(g.cos*ledX-g.sin*.92),lampY=g.sin*ledX+g.cos*.92;
  item.canvas.width=w;item.canvas.height=h;const c=item.canvas.getContext('2d');
  const out=c.createImageData(w,h),dst=out.data;
  let receiver=null,maskCtx=null;
  const receives=pass||p.kind==='branch'||p.kind==='stone'||p.kind==='pebble'||p.kind==='anubias';
  if(receives){
    if(!item.receive)item.receive=document.createElement('canvas');
    item.receive.width=Math.min(210,w);item.receive.height=Math.max(1,Math.round(h*item.receive.width/w));
    maskCtx=item.receive.getContext('2d');receiver=maskCtx.createImageData(item.receive.width,item.receive.height);
  }else item.receive=null;
  const far=1-g.z;
  let rootBounce=null;
  if(host){
    const [u,v]=ridgePoint(host.ridge,p.slot),src=sourceFor(host.sprite);
    let rr=0,gg=0,bb=0,n=0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const i=4*(clamp(Math.floor(v*src.h)+dy,0,src.h-1)*src.w+clamp(Math.floor(u*src.w)+dx,0,src.w-1));
      const wt=src.data[i+3]/255;rr+=src.data[i]*wt;gg+=src.data[i+1]*wt;bb+=src.data[i+2]*wt;n+=wt;
    }
    if(n>.01)rootBounce=[rr/n,gg/n,bb/n];
  }
  for(let j=0;j<h;j++){
    const v=(j+.5)/h,above=g.pivotY-v;
    let start=worldPointOnSprite(g,.5/w,v),wx=start.x,wy=start.y;
    const stepX=g.width/w*g.sign*g.cos,stepY=g.width/w*g.sign*g.sin;
    for(let i=0;i<w;i++,wx+=stepX,wy+=stepY){
      const a=4*(j*w+i),alpha=data[a+3];if(!alpha)continue;
      const vis=visibility(cover,wx,wy,above,g.pivotY);if(vis<.004)continue;
      const field=lightField[clamp(Math.floor(wy/H*80),0,79)*128+clamp(Math.floor(wx/W*128),0,127)];
      let dayNormal=paintedFacing(data,a,w,i,j,data[a+1],v),up=.43+.38*(1-v),facing=.65;
      if(pass){
        const b=4*(Math.floor(v*pass.h)*pass.w+Math.floor((i+.5)/w*pass.w));
        const nx=pass.normal[b]/127.5-1,ny=pass.normal[b+1]/127.5-1,nz=pass.normal[b+2]/127.5-1;
        dayNormal=Math.max(0,nx*dirX+ny*dirY+nz*.32);
        up=Math.max(0,nx*lampX+ny*lampY+nz*.30);facing=Math.max(0,nz);
      }
      const daylight=s*(.30+.70*field)*dayNormal;
      const pool=1-Math.min(.66,Math.abs(wx/W-.50)*.95);
      const led=l*up*pool;
      const footShade=cover?(1-smooth(-.02,.16,above))*.18:0;
      const brightness=.78+.04*s+daylight*.51+led*.30-footShade;
      const haze=.035+.052*far,shadow=1-dayNormal;
      let r=data[a]*(brightness+daylight*.16)+daylight*(14+6*facing)+led*8+far*2;
      let green=data[a+1]*(brightness+daylight*.07+led*.035)+daylight*9+led*12+shadow*3;
      let b=data[a+2]*(brightness-daylight*.10+led*.05)+led*13+shadow*5;
      r=mix(r,29,haze);green=mix(green,109,haze);b=mix(b,91,haze);
      if(rootBounce){
        const rootMix=(1-smooth(-.025,.13,above))*.37;
        r=mix(r,rootBounce[0]*.72,rootMix);green=mix(green,rootBounce[1]*.76,rootMix);b=mix(b,rootBounce[2]*.74,rootMix);
      }
      if(p.kind==='moss'||p.kind==='stems'){
        const dim=(.23*mood[0]+.36*mood[2]+.74*mood[3])*(1-.33*led);
        const fringe=(1-alpha/255)*dim,lum=.24*r+.60*green+.16*b;
        r=mix(r,lum*.77,dim*.25+fringe*.35);green=mix(green,lum*.87,dim*.26+fringe*.36);b=mix(b,lum*.76,dim*.34);
      }
      const dist=wy>g.bed-65?pieceBedAt(g,wx)-wy:66;let opacity=alpha*vis;
      if(!host&&dist<5.5){
        const ix=Math.round(wx),iy=Math.round(wy);
        const grain=((Math.imul(ix,1597334677)^Math.imul(iy,3812015801))>>>0)/4294967296;
        // Reveal the actual lit sand and contact shadow through irregular gaps between grains.
        opacity*=smooth(-.7,3.8,dist+2*grain-1.4);
      }
      dst[a]=r;dst[a+1]=green;dst[a+2]=b;dst[a+3]=opacity;
    }
  }
  c.putImageData(out,0,0);attachmentShadows(c,g,w,h,s);
  if(receives){
    const rw=receiver.width,rh=receiver.height;
    for(let j=0;j<rh;j++)for(let i=0;i<rw;i++){
      const u=(i+.5)/rw,v=(j+.5)/rh,col=Math.floor(u*w),row=Math.floor(v*h),at=4*(row*w+col);
      let amount=paintedFacing(data,at,w,col,row,data[at+1],v);
      if(pass){
        const b=4*(Math.floor(v*pass.h)*pass.w+Math.floor(u*pass.w));
        const nx=pass.normal[b]/127.5-1,ny=pass.normal[b+1]/127.5-1,nz=pass.normal[b+2]/127.5-1;
        amount=clamp(nx*dirX+ny*dirY+nz*.20);
      }else amount*=p.kind==='anubias'?.51:.86;
      const wi=worldPointOnSprite(g,u,v),beam=windowField(wi.x/W,wi.y/H);
      const k=4*(j*rw+i),a=dst[4*(Math.floor(v*h)*w+Math.floor(u*w))+3];
      receiver.data[k]=receiver.data[k+1]=receiver.data[k+2]=255;receiver.data[k+3]=a*amount*(.37+.79*beam);
    }
    maskCtx.putImageData(receiver,0,0);
  }
  item.key=key;item.lightTick=-1;return item;
}
function waterTransform(t){return new DOMMatrix().translate(35+13*Math.sin(t*.19),5+18*Math.sin(t*.12)).scale(2.18+.035*Math.sin(t*.22),.74+.014*Math.cos(t*.16));}
function movingHighlights(item,g,t){
  if(!item.receive||sun<.10)return null;
  const tick=Math.floor(t*14);if(item.lightTick===tick)return item.water;
  if(!item.water)item.water=document.createElement('canvas');
  const c=item.water,w=item.receive.width,h=item.receive.height;
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  const a=c.getContext('2d');a.clearRect(0,0,w,h);a.drawImage(item.receive,0,0);a.globalCompositeOperation='source-in';
  if(!item.pattern)item.pattern=a.createPattern(causticTexture,'repeat');
  const toWorld=new DOMMatrix().translate(g.x,g.y).rotate(g.angle*180/Math.PI).scale(g.sign*g.width/w,g.height/h).translate(-g.pivotX*w,-g.pivotY*h);
  item.pattern.setTransform(toWorld.inverse().multiply(waterTransform(tick/14)));
  a.fillStyle=item.pattern;a.fillRect(0,0,w,h);a.globalCompositeOperation='source-over';item.lightTick=tick;return c;
}

;
/* lighting */
'use strict';

// The same local illumination is applied to the assembled tank, including translucent edges.
const lightNames=['dawn','day','dusk','night'];
const clockStops=[[0,3],[5,3],[7,0],[8.3,0],[10,1],[15.8,1],[17.7,2],[18.8,2],[20.7,3],[24,3]];
function lightAt(mode,hour){
  const weights=[0,0,0,0],preset=lightNames.indexOf(mode);
  if(preset>=0)weights[preset]=1;
  else{
    const at=((hour%24)+24)%24,next=clockStops.findIndex(row=>row[0]>at);
    const [a,from]=clockStops[next-1],[b,to]=clockStops[next],t=smooth(a,b,at);
    weights[from]+=1-t;weights[to]+=t;
  }
  return weights;
}
// Shared incident light, sampled by both the aquarium grade and the fish.
function underwaterLight(u,v){
  const depth=clamp((v-.33)/.49);
  const lobe=(center,spread)=>Math.exp(-(((u-center)/spread)**2));
  // The long pendant reaches the planting on its left as well as the open water.
  const broad=lobe(.50,.23+.17*depth)*(.98-.20*depth);
  const warmEnd=lobe(.34+.025*depth,.15+.11*depth)*(.88-.20*depth);
  return {
    morning:lobe(.17+.28*depth,.35+.12*depth)*(.97-.14*depth),
    evening:lobe(.89-.27*depth,.27+.12*depth)*(.99-.18*depth),
    lamp:broad+.44*(1-broad)*warmEnd, warmEnd
  };
}
const toneLayers={};
function prepareTone(weights){
  const [dawn,day,dusk,night]=weights;
  const cols=256,rows=160;
  for(const key of ['multiply','screen'])if(!toneLayers[key]){
    const c=document.createElement('canvas');c.width=cols;c.height=rows;toneLayers[key]=c;
  }
  const mc=toneLayers.multiply.getContext('2d'),ac=toneLayers.screen.getContext('2d');
  const mul=mc.createImageData(cols,rows),add=ac.createImageData(cols,rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const u=(x+.5)/cols,v=(y+.5)/rows;
    const inside=smooth(.052,.063,u)*(1-smooth(.938,.949,u))*smooth(.293,.331,v)*(1-smooth(.854,.867,v));
    const {morning,evening,lamp:pool,warmEnd}=underwaterLight(u,v);
    const under=pool*inside,bed=under*smooth(.63,.79,v);
    const practical=inside*warmEnd;
    const rim=Math.exp(-(((v-.338)/.013)**2))*inside;
    // Colour the incident light independently of the deep-water fill. Keeping
    // low additive values in the shadows preserves bark and mineral contrast.
    const room=1-inside;
    const dawnKey=morning*(inside+.42*room),duskKey=evening*inside;
    const roomAmber=room*(.40+.60*evening);
    const i=4*(y*cols+x);
    mul.data[i]=255*(day+dawn*(.76+.22*dawnKey)+dusk*(.66+.39*duskKey+.32*roomAmber)+night*(.23+.16*inside+.54*under+.12*practical+.09*bed));
    mul.data[i+1]=255*(day+dawn*(.88+.14*dawnKey)+dusk*(.78+.21*duskKey+.095*roomAmber)+night*(.32+.22*inside+.47*under+.07*practical+.05*bed));
    mul.data[i+2]=255*(day+dawn*(.98-.07*dawnKey)+dusk*(.99-.19*duskKey-.19*roomAmber)+night*(.48+.22*inside+.28*under));
    add.data[i]=dawn*(4+24*dawnKey+6*rim)+dusk*(4+42*duskKey+12*rim*evening+17*roomAmber)+night*(1+12*under+7*practical+6*bed);
    add.data[i+1]=dawn*(7+19*dawnKey)+dusk*(4+17*duskKey)+night*(3+13*under+3*practical+6*bed);
    add.data[i+2]=dawn*(11+8*dawnKey)+dusk*(8+4*(1-evening))+night*(8+12*under);
    mul.data[i+3]=add.data[i+3]=255;
  }
  mc.putImageData(mul,0,0);ac.putImageData(add,0,0);
}
function toneScene(target=ctx){
  if(mood[1]>.999)return;
  target.save();
  target.globalCompositeOperation='saturation';target.globalAlpha=.055*mood[0]+.018*mood[2]+.085*mood[3];
  target.fillStyle='#777';target.fillRect(0,0,W,H);target.globalAlpha=1;
  target.globalCompositeOperation='multiply';target.drawImage(toneLayers.multiply,0,0,W,H);
  target.globalCompositeOperation='screen';target.drawImage(toneLayers.screen,0,0,W,H);target.restore();
}

;
/* life */
'use strict';
const surface=270, floor=594, left=76, right=1124;
let worldPerPixel=1, time=0, nextShoalMove=7, lastFeed=-10;
function depth(fraction){return surface+(floor-surface)*fraction;}
const rand = (a,b) => a + (b-a)*Math.random();
const approach = (a,b,rate,dt) => a + (b-a)*(1-Math.exp(-rate*dt));
const swimTraits={
  guppy:{cruise:25,chase:114,tailBeat:1.9,opacity:.96,lips:[.462,-.030]},
  tetra:{cruise:30,chase:100,tailBeat:1.9,opacity:.90,lips:[.460,.012]},
  whiteCloud:{cruise:42,chase:108,tailBeat:2.35,opacity:.96,lips:[.471,-.004]}
};

const school={x:723,y:413};
let plantedCover=null;
function restNearPlants(f){
  if(!plantedCover)return;
  f.goal={x:clamp(plantedCover.x+rand(-13,13),left+55,right-55),
    y:clamp(plantedCover.y+rand(-12,10),surface+35,rowY(sandRow(plantedCover.z),plantedCover.x)-12),z:plantedCover.z};
}
const food=[],ripples=[],tastes=[];
function spawnFish(species,x,y,width,schoolIndex=null) {
  const facing=schoolIndex===null?1:-1;
  return {species,traits:swimTraits[species],x,y,width,schoolIndex,
    z:species==='guppy'?.62:species==='whiteCloud'?.44:.32+.032*(schoolIndex%5),
    vx:facing>0?10:-12,vy:0,facing,yaw:facing,
    pitch:0,phase:rand(0,6.28),roll:rand(0,6.28),goal:{x:x+20,y},
    nextGoal:1.5,restUntil:0,noticeAt:0,target:null,approachSide:1,peckAge:2,lastWake:-8,visitedGrass:false};
}
const fish = [
  spawnFish('guppy',402,361,72),
  spawnFish('tetra',668,424,48,0),spawnFish('tetra',730,398,44,1),spawnFish('tetra',775,439,46,2),
  spawnFish('whiteCloud',643,348,67)
];
function inFeedingWater(point){
  return point.x>=left&&point.x<=right&&point.y>=surface-27&&point.y<=rowY(sandRow(1),point.x);
}
let feedBatch=0;
// All flakes in one pinch are a single encounter. Sensory fatigue decays in
// wall-clock time, including while the tank is closed.
function foodInterest(f,batch){
  const prior=f.cue;
  if(prior&&batch<=prior.batch)return batch===prior.batch?prior.interest:0;
  const now=careNow(),rest=prior?Math.max(0,now-prior.at):0;
  const interest=prior?1-prior.fatigue*Math.exp(-rest/42000):1;
  f.cue={batch,at:now,interest,fatigue:clamp(1-interest+.38)};
  careDirty=true;return interest;
}
function noticeSurface(x,batch){
  // The splash is a cue to orient. Seeing an edible flake is a separate event.
  const listeners=fish.filter(f=>!f.trip?.onPath)
    .map(f=>({f,distance:Math.hypot(f.x-x,(f.y-surface)*.63)}))
    .sort((a,b)=>a.distance-b.distance);
  for(const [index,{f,distance}] of listeners.entries()){
    if(distance>(index===0?500:335))continue;
    const interest=foodInterest(f,batch),wary=fishUnease(f);
    if(f.target||f.depart?.until>time||time<(f.lookAgain??0)||(interest<.24&&hunger(f)<.20))continue;
    const delay=index===0?0:Math.min(.32,.045*index+distance*.00045);
    const hungry=hunger(f)>.01,dx=x-f.x;
    const side=f.facing;
    f.look={x:clamp(f.x+side*Math.min(75,Math.max(14,Math.abs(dx)*.39)),left+32,right-32),
      y:Math.max(surface+12,f.y-Math.min(hungry?37:20,(f.y-surface)*.42)*(.45+.55*interest)),side,
      from:time+delay,until:time+delay+(hungry?1.2:1.55)};
    f.noticeAt=time+delay+(hungry?.22:.38)+wary*1.3;
    f.lookAgain=time+(hungry?1.15:2.4);
  }
}
function scatter(x,viewTop=surface-20) {
  if(typeof openingActive==='function'&&openingActive()&&(openingStep!=='feed'||introduction))return false;
  if(!ready||editing||siphoning||waterChange||food.length>12||time-lastFeed<.6)return;
  advanceCare(careNow());careDirty=true;
  lastFeed=time;lastExchange=false;x=clamp(x,left+18,right-18);
  const batch=feedBatch=Math.max(careNow(),feedBatch+1);
  const teaching=globalThis.tankJournal?.firstMeal()||false;
  const serving=teaching?3:6;
  for(let i=0;i<serving;i++){
    const shape=Array.from({length:6},()=>rand(.66,1));
    // A submerged close-up sees the flakes enter through the top of its frame.
    // Keep their physical depth, sinking and fish targeting on the same path.
    const belowSurface=viewTop>surface+8;
    const startY=belowSurface?Math.max(surface,viewTop-rand(1.5,4)*worldPerPixel):i===0?surface-1:surface-rand(7,15);
    food.push({batch,x:clamp(x+(i-(serving-1)/2)*Math.max(6,worldPerPixel*3.6)+rand(-3,3),left+3,right-3),y:startY,
      z:rand(.42,.69),age:belowSurface?2:0,phase:rand(0,6.28),drift:rand(-1.8,1.8),settle:teaching?rand(9,13):rand(23,30),wet:belowSurface||i===0,
      velocityY:rand(6,18),soak:rand(.32,1.05),shape,scale:rand(.83,1.15),tone:Math.random(),taken:false});
  }
  ripples.push({x,y:surface-H*.009,age:0,strength:.88});
  noticeSurface(x,batch);
  $('#feeding-status').textContent='一撮鱼食落入水中';
  if(teaching){
    const listener=fish.filter(f=>!f.inNet&&hunger(f)>.12&&!f.target).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
    if(listener){
      const flake=food[food.length-serving];
      listener.target=flake;listener.inspect=null;listener.restUntil=time;listener.depart=null;
      approachFlake(listener,flake);
    }
  }
  if(typeof tankNotes!=='undefined')tankNotes.fed(batch);
  return true;
}
function mouth(f){
  // Lip landmarks in each painted profile, with the same projection as the sprite.
  const [u,v]=f.traits.lips,angle=f.pitch*f.yaw;
  const x=u*f.width*f.yaw,y=v*f.width;
  return {x:f.x+x*Math.cos(angle)-y*Math.sin(angle),y:f.y+x*Math.sin(angle)+y*Math.cos(angle)};
}
function atLips(f,p,m,py,radius){
  // Two objects can overlap in the picture and still be in different water.
  return Math.hypot(p.x-m.x,py-m.y,(p.z-f.z)*48)<=radius && Math.abs(f.z-p.z)<.20;
}
function biteReach(f){
  return f.width*.082+Math.min(3.8,Math.max(2.4,worldPerPixel*2));
}
function biteWithinReach(f){
  if(!food.length||waterChange||f.inspect||f.peckAge<.30||hunger(f)<=.01||f.trip?.onPath)return;
  const m=mouth(f),reach=biteReach(f);
  let best=null,closest=Infinity;
  for(const p of food){
    if(!p.wet||p.taken||!atLips(f,p,m,p.y,reach))continue;
    const distance=Math.hypot(p.x-m.x,p.y-m.y);
    if(distance<closest&&foodInSight(f,p)){best=p;closest=distance;}
  }
  if(best)consumeFlake(f,best);
}
function foodInSight(f,p){
  const dx=p.x-f.x,dy=p.y-f.y;
  // Check the actual wood/stone silhouette where the line of sight crosses it.
  // Open spaces between roots remain visible at the appropriate tank depth.
  return !bedSolids.some(({p:piece,g})=>{
    if(Math.max(f.x,p.x)<g.left||Math.min(f.x,p.x)>g.right||
      Math.max(f.y,p.y)<g.top||Math.min(f.y,p.y)>g.bed+3)return false;
    for(const t of [.25,.5,.75,1]){
      const x=f.x+t*dx,y=f.y+t*dy;
      if(Math.abs(mix(f.z,p.z,t)-g.z)<.11&&x>=g.left&&x<=g.right&&y>=g.top&&y<=g.bed+3&&hits(piece,g,{x,y}))return true;
    }
    return false;
  });
}
function inspectPassingFood(f,wary){
  if(!food.length||time<(f.scanAt??0)||wary>.62)return;
  f.scanAt=time+.16;
  const reach=(f.species==='whiteCloud'?160:f.species==='guppy'?148:118)*(.78+.22*sun);
  let chosen=null,nearest=reach;
  for(const p of food){
    const batch=p.batch??0;
    if(!p.wet||p.taken||p.age<p.soak+.10||batch<=(f.examined??-1)||batch<(f.cue?.batch??0)||
      fish.some(other=>other!==f&&other.target===p))continue;
    const dx=p.x-f.x,distance=Math.hypot(dx,p.y-f.y,(p.z-f.z)*110);
    if(distance<nearest && (dx*f.yaw>-f.width||distance<reach*.54)&&foodInSight(f,p)){
      chosen=p;nearest=distance;
    }
  }
  if(!chosen)return;
  const batch=chosen.batch??0,interest=foodInterest(f,batch)*(1-.55*wary);
  f.examined=batch;
  if(interest<.38||interest<.83&&Math.random()>interest)return;
  f.target=chosen;
  f.inspect={touch:Math.random()<.38+.40*interest,until:time+rand(2.9,4.2)};
  approachFlake(f,chosen);
}
function leaveFlake(f,touched=false){
  const p=f.target;
  if(touched){p.kickX=f.facing*22;p.kickY=-8;f.peckAge=0;careDirty=true;}
  f.inspect=null;f.target=null;glidePastFood(f);
}
function approachFlake(f,p){
  const heading=f.facing,dx=(p.x-f.x)*heading;
  const y=p.mass===undefined?p.y:floorPoint(p).y;
  const rise=y-f.y+(p.mass===undefined?p.settle*.52:0);
  const nose=f.width*f.traits.lips[0];
  const runway=Math.min(f.width*2.5,Math.abs(rise)*1.05);
  const tooSteep=Math.abs(rise)>f.width*.34 && dx<nose+runway*.67;
  const behind=dx<nose*.58;
  let side=behind||tooSteep?-heading:heading;
  if(p.x<left+f.width*.85)side=-1;
  else if(p.x>right-f.width*.85)side=1;
  f.approachSide=side;f.striking=false;f.strikePitch=0;f.strikeBlend=0;f.arc=null;
  if(side!==heading||tooSteep||behind){
    // Swim past the flake on the outgoing leg. Leave enough horizontal water
    // to meet it diagonally on the return. Shorten the leg by the glass.
    const out=-side;
    const targetX=p.x+out*(nose+Math.max(f.width*.35,runway));
    const run=Math.max(heading===out?f.width*.28:0,(targetX-f.x)*out);
    const x=clamp(f.x+out*run,left+f.width*.48,right-f.width*.48);
    if((x-f.x)*out>f.width*.12){
      const travel=Math.abs(x-f.x);
      const pace=f.traits.chase*(f.inspect ? .52 : .78);
      const fall=p.mass===undefined?p.settle*clamp((p.age-p.soak)*1.1):0;
      const futureY=Math.min(floorPoint(p).y,y+fall*(travel/pace+.55));
      const dy=clamp((futureY-f.y)*.81,-travel*.81,travel*.81);
      f.arc={x,y:clamp(f.y+dy,surface+7,rowY(sandRow(p.z),x)-f.width*.13),side:out};
    }
  }
  f.retryTurn=time+.85;f.look=null;
}
function feedingPoint(f,p,dt){
  if(f.arc){
    if((f.arc.x-f.x)*f.arc.side>f.width*.10)return f.arc;
    f.arc=null;
  }
  const settled=p.mass!==undefined,ground=floorPoint(p).y,y=settled?ground:p.y;
  const m=mouth(f),gap=Math.hypot(p.x-m.x,y-m.y);
  // Once a flake has slipped past a broadside mouth, circle for a new pass.
  // Keep the current bend until it is complete, even if the flake drifts.
  if(f.striking&&f.yaw*f.approachSide>.84&&time>=f.retryTurn&&
    (p.x-m.x)*f.approachSide < -f.width*.16 && gap>f.width*.19){
    approachFlake(f,p);
    if(f.arc)return f.arc;
  }
  const sink=settled?0:p.settle*clamp((p.age-p.soak)*1.1);
  if(!f.striking&&gap<f.width*1.10+10&&f.yaw*f.approachSide>.55){
    f.striking=true;
    // Keep the pitch of the final approach independent of the moving mouth.
    const slope=Math.atan2(y-f.y,Math.max(f.width*.48,Math.abs(p.x-f.x)));
    f.strikePitch=settled||ground-y<9?.39:y<surface+11?-.28:clamp(slope,-.42,.39);
  }
  if(settled)f.strikePitch=.39;
  const blend=f.strikeBlend=approach(f.strikeBlend??0,f.striking?1:0,5,dt);
  const lead=mix(clamp(gap/f.traits.chase,.22,1.25),.31,blend);
  const nose=f.width*f.traits.lips[0]+(f.inspect&&!f.inspect.touch?11:0),pitch=f.strikePitch??0;
  return {x:p.x+(settled?0:p.drift*lead)-f.approachSide*mix(f.width*.72,nose*Math.cos(pitch),blend),
    y:Math.min(ground-1,y+sink*lead)-mix(0,nose*Math.sin(pitch)+f.width*f.traits.lips[1]*Math.cos(pitch),blend)};
}
function consumeFlake(f,p){
  if(p.mass!==undefined)residue.splice(residue.indexOf(p),1);
  else p.taken=true;
  f.fullness=clamp(f.fullness+(f.species==='tetra'?.11:f.species==='guppy'?.082:.094)*p.scale);
  careDirty=true;f.target=null;f.peckAge=0;
  glidePastFood(f);
  if(typeof tankNotes!=='undefined')tankNotes.ate(f,p);
  globalThis.tankJournal?.record('bite');
  if(typeof finishOpeningFeed==='function')finishOpeningFeed();
}
function glidePastFood(f){
  f.noticeAt=time+rand(.77,1.03);f.arc=null;f.striking=false;
  const exit=Math.abs(f.yaw)>.42?Math.sign(f.yaw):f.facing;
  f.depart={x:clamp(f.x+exit*f.width*.60,left+f.width*.45,right-f.width*.45),
    y:clamp(f.y+f.vy*.24,surface+8,rowY(sandRow(f.z),f.x)-f.width*.16),
    side:exit,until:f.noticeAt};
}
function updateFish(f,dt){
  if(f.inNet)return;
  const wary=fishUnease(f);
  if(f.inspect&&(waterChange||time>f.inspect.until||!f.target||f.target.taken||!food.includes(f.target)||
    fish.some(other=>other!==f&&!other.inspect&&other.target===f.target)))leaveFlake(f);
  biteWithinReach(f);
  const looking=!waterChange&&f.look?.from<=time&&time<f.look.until;
  const departing=!waterChange&&f.depart?.until>time;
  if(wary<.20&&!waterChange&&!f.target&&(food.length||(!looking&&!departing))&&
    (swimByLeaf(f,dt)||travelPassage(f,dt))){f.strokeSpeed=null;return;}
  if(f.target){
    const p=f.target;
    if(p.mass!==undefined){
      if(time>f.bedUntil||!residue.includes(p)||coveredSand(p.x,p.z))f.target=null;
    }else if(p.taken||!food.includes(p))f.target=null;
  }
  if(!f.target&&!waterChange&&!departing&&time>=f.noticeAt&&hunger(f)<.16)inspectPassingFood(f,wary);
  if(!f.target && !waterChange && hunger(f)>.01 && time>=f.restUntil && time>=f.noticeAt){
    let best=Infinity;
    for(const p of food){
      if(p.taken||!p.wet||fish.some(other=>other!==f&&!other.inspect&&other.target===p))continue;
      const dx=p.x-f.x,dist=Math.hypot(dx,p.y-f.y,(p.z-f.z)*90);
      const score=dist+(dx*f.facing<f.width*.28?f.width*.90:0);
      const sinking=clamp((p.age-p.soak)*1.1);
      const sight=Math.min(catchRadius(f),220+185*sun)*(dx*f.yaw<-f.width?.53:1)*(.83+.17*sinking)*(1-.56*wary);
      if(score<best&&dist<=sight&&foodInSight(f,p)){best=score;f.target=p;}
    }
    if(f.target)approachFlake(f,f.target);
  }
  let gx,gy;
  if(f.target){
    const goal=feedingPoint(f,f.target,dt);
    gx=goal.x;gy=goal.y;
  }else if(departing){
    gx=f.depart.x;gy=f.depart.y;
  }else if(looking){
    gx=f.look.x;gy=f.look.y;
  }else if(f.species==='guppy'){
    if(time>=f.nextGoal){
      const active=sun;
      f.goal={x:rand(245,910),y:depth(active<.32?rand(.46,.68):rand(.10,.42))};
      f.visitedGrass=!f.visitedGrass;
      if(plantedCover&&(f.visitedGrass||active<.38)){
        restNearPlants(f);
        if(active>.30){
          const facing=Math.sign(plantedCover.x-f.x)||f.facing;
          f.goal={x:plantedCover.x-facing*f.width*.43,y:plantedCover.y+2,z:plantedCover.z,plant:plantedCover.id,facing};
        }
      }
      if(typeof openingStep!=='undefined'&&openingStep==='feed'&&f.careId===firstFishId){
        const c=camera();
        f.goal.x=clamp(f.goal.x,c.left+c.w*.22,c.left+c.w*.78);
      }
      f.nextGoal=time+rand(7,12)+(1-active)*10;
      if(f.goal.plant)f.nextGoal+=Math.min(24,Math.hypot(f.goal.x-f.x,f.goal.y-f.y)/Math.max(8,f.traits.cruise*(.26+.74*sun)));
    }
    gx=f.goal.x;gy=f.goal.y;
  }else if(f.species==='whiteCloud'){
    if(time>=f.nextGoal){
      const resting=sun<.32;
      // Short runs across open water, with only a small change of depth on each pass.
      const nextX=f.goal.x>520?rand(270,472):rand(625,840);
      f.goal={x:resting?rand(255,495):nextX,y:depth(resting?rand(.42,.64):rand(.14,.38))};
      if(resting)restNearPlants(f);
      f.nextGoal=time+(resting?rand(9,15):rand(4.8,8.5));
    }
    gx=f.goal.x;gy=f.goal.y;
  }else{
    const offsets=[[-47,4],[17,-19],[55,19]],offset=offsets[f.schoolIndex%3],rank=Math.floor(f.schoolIndex/3),spread=.66+.34*sun;
    gx=school.x+(offset[0]-rank*25)*spread+12*Math.sin(time*.28+f.roll);gy=school.y+(offset[1]+(rank%2)*13)*spread+6*Math.sin(time*.39+f.roll);
  }
  const waterTop=surface+waterDrop;
  if(waterChange){
    gy=Math.max(gy,waterTop+f.width*.23);
    if(waterChange.stage==='fill'&&!f.target&&f.y<waterTop+100){
      const dx=f.x-waterChange.x,distance=Math.abs(dx);
      if(distance<80){gx=f.x+(dx<0?-1:1)*(80-distance);gy=Math.max(gy,f.y+12);}
    }
  }
  if(wary>.04&&!f.target&&!departing){
    const inlet=waterChange?.x??lastInlet;
    const quietX=plantedCover&&Math.abs(plantedCover.x-inlet)>100?plantedCover.x:
      inlet>(left+right)/2?left+254:right-254;
    const group=(f.schoolIndex??1)%3-1;
    gx=mix(gx,quietX+group*35,wary);
    gy=mix(gy,depth(.65)+group*13,wary);
  }
  let dx=gx-f.x,dy=gy-f.y;
  {
    for(const other of fish){
      if(other===f)continue;
      const sx=f.x-other.x,sy=f.y-other.y,length=Math.hypot(sx,sy);
      const clearance=f.target?10:34;
      if(length>0 && length<clearance){dx+=sx*(clearance-length)/24;dy+=sy*(clearance-length)/24;}
    }
  }
  const distance=Math.hypot(dx,dy), resting=time<f.restUntil;
  const activity=f.target ? (.67+.33*sun)*(.64+.36*hunger(f)) : .26+.74*sun;
  const glide=(f.species==='whiteCloud' && !f.target) ? .75+.25*Math.sin(time*2.05+f.roll) : 1;
  const maxSpeed=(f.target?f.traits.chase*(f.inspect ? .81 : 1):f.traits.cruise*glide)*activity*(1-.17*wary);
  const striking=f.target&&f.striking;
  const speed=resting?0:Math.min(maxSpeed*(striking?1.18:1),distance*(f.target?3.5:looking?2:.92));
  const normal=Math.max(distance,.01);
  const wantedX=speed*dx/normal;
  let wantedY=speed*dy/normal;
  if(!f.target&&!looking&&!departing&&!resting)wantedY+=.8*Math.sin(time*1.18+f.roll);
  let face=f.facing;
  if(f.target)face=f.arc?.side??f.approachSide;
  else if(departing)face=f.depart.side??f.facing;
  else if(looking)face=f.look.side;
  else if(f.goal.plant&&distance<28)face=f.goal.facing;
  else if(Math.abs(dx)>f.width*.28)face=Math.sign(dx);
  if(face!==f.facing&&time>=(f.turnAfter??0)){
    f.facing=face;f.turnAfter=time+.87;
  }
  const angle=clamp(Math.acos(clamp(f.yaw,-1,1))+(f.facing<0?1:-1)*3.65*dt,0,Math.PI);
  f.yaw=Math.cos(angle);
  // A stroke carries the fish nose-first. Its horizontal projection passes
  // through zero as the fish banks, then grows on the opposite side.
  const slope=f.target ? .88 : .64;
  const forward=Math.max(0,wantedX*f.facing,Math.abs(wantedY)/slope);
  const turning=Math.abs(f.yaw)<.97;
  const desired=Math.min(maxSpeed*(striking?1.18:1),Math.max(forward,turning&&!resting?maxSpeed*.26:0));
  f.strokeSpeed=approach(f.strokeSpeed??Math.abs(f.vx),desired,f.target?4.8:3.4,dt);
  f.vx=f.strokeSpeed*f.yaw;
  const climb=slope*f.strokeSpeed*(.18+.82*Math.abs(f.yaw));
  wantedY=clamp(wantedY,-climb,climb);
  f.vy+=clamp((wantedY-f.vy)*(1-Math.exp(-(f.target?5.8:4.2)*dt)),-175*dt,175*dt);
  const swimPitch=clamp(Math.atan2(f.vy,Math.abs(f.vx)+30),-.46,.44);
  const tilt=striking?mix(swimPitch,f.strikePitch,f.strikeBlend):looking&&!f.target?Math.min(swimPitch,-.24):swimPitch;
  f.pitch+=clamp((tilt-f.pitch)*(1-Math.exp(-4.6*dt)),-1.05*dt,1.05*dt);
  const homeDepth=f.species==='guppy'?.62:f.species==='whiteCloud'?.44:.32+.032*(f.schoolIndex%5);
  f.z=approach(f.z,f.target?.z??f.goal.z??homeDepth,1.35,dt);
  f.x=clamp(f.x+f.vx*dt,left+f.width*.45,right-f.width*.45);
  f.y=clamp(f.y+f.vy*dt,waterTop+5,rowY(sandRow(f.z),f.x)-f.width*.11);
  f.phase+=dt*(f.traits.tailBeat+1.7*sun + Math.min(Math.hypot(f.vx,f.vy),110)*.095);
  f.peckAge+=dt;
  if(!f.target&&f.goal.plant&&plantedCover?.id===f.goal.plant&&distance<9&&Math.abs(f.yaw-f.goal.facing)<.1&&time>=(f.nextBrowse||0)){
    f.peckAge=0;f.restUntil=time+.45;f.nextBrowse=time+rand(3,6);
  }
  if(f.y<surface+f.width*.21 && Math.hypot(f.vx,f.vy)>14 && time-f.lastWake>1.2){
    ripples.push({x:f.x,y:surface-H*.009,age:0,strength:.29});f.lastWake=time;
  }
  biteWithinReach(f);
  if(f.target&&(f.inspect||f.target.mass!==undefined)){
    const m=mouth(f);
    const p=f.target,py=p.mass!==undefined?floorPoint(p).y:p.y;
    const contact=f.inspect&&!f.inspect.touch?17:biteReach(f);
    if(atLips(f,p,m,py,contact)&&foodInSight(f,{x:p.x,y:py,z:p.z})){
      if(f.inspect)leaveFlake(f,f.inspect.touch);
      else consumeFlake(f,p);
    }
  }
}
function stepAquarium(dt){
  time+=dt;
  if(time>=nextShoalMove){
    const resting=sun<.32;
    school.x=resting?rand(466,717):(school.x>640?rand(295,565):rand(720,990));
    school.y=depth(resting?rand(.64,.81):rand(.22,.65));
    if(bankEdges.length&&(resting||Math.random()<.53)){
      const edge=bankEdges[Math.floor(Math.random()*bankEdges.length)];school.x=edge.x;school.y=edge.y;
    }
    nextShoalMove=time+rand(7,11)+(1-sun)*9;
  }
  for(const p of food){
    p.age+=dt;
    if(!p.wet){
      p.velocityY+=dt*260;p.y+=p.velocityY*dt;
      if(p.y>=surface+waterDrop-1){
        p.wet=true;p.y=surface+waterDrop-1;p.age=0;
        ripples.push({x:p.x,y:surface-H*.009,age:0,strength:.73});
      }
    }else{
      const sinking=clamp((p.age-p.soak)*1.1,0,1);
      const flutter=Math.sin(p.age*(1.02+.16*p.scale)+p.phase);
      p.y=Math.max(surface+waterDrop-1,p.y+dt*p.settle*sinking*(.94+.15*flutter));
      p.x=clamp(p.x+dt*(p.drift+(3+4*sinking)*flutter),left+4,right-4);
      if(p.kickX){
        p.x=clamp(p.x+p.kickX*dt,left+4,right-4);
        p.y=Math.max(surface+waterDrop,p.y+p.kickY*dt);
        const drag=Math.exp(-3.4*dt);
        p.kickX*=drag;p.kickY*=drag;
        if(Math.abs(p.kickX)<.25)p.kickX=p.kickY=0;
      }
      const ground=floorPoint(p).y;
      if(p.y>ground-16){
        const landing=openLandingX(p);
        p.x+=clamp(landing-p.x,-dt*18,dt*18);
        if(p.y>=floorPoint(p).y){
          const bed=dropRemnant(p);
          const watcher=fish.find(f=>f.target===p&&!f.inspect);
          if(watcher&&bed&&Math.hypot(watcher.x-p.x,watcher.y-ground)<watcher.width*2.5&&
            !coveredSand(p.x,p.z)&&foodInSight(watcher,p)){
            watcher.target=bed;watcher.bedUntil=time+4.2;
          }
          p.taken=true;
        }
      }
    }
  }
  for(let i=drawnIn.length-1;i>=0;i--){drawnIn[i].age+=dt;if(drawnIn[i].age>=.30)drawnIn.splice(i,1);}
  fish.forEach(f=>updateFish(f,dt));

  for(let i=food.length-1;i>=0;i--)if(food[i].taken)food.splice(i,1);
  for(const items of [ripples,tastes]){
    for(let i=items.length-1;i>=0;i--){items[i].age+=dt;if(items[i].age>2.1)items.splice(i,1);}
  }

}
function paintFish(f,c=ctx){
  const light=fishInSceneLight(sprites[f.species==='whiteCloud'?'white-cloud':f.species],f),img=light.body;
  const w=f.width,h=w*img.height/img.width;
  c.save();
  const peck=f.peckAge<.30?Math.sin(Math.PI*f.peckAge/.30)*Math.exp(-f.peckAge*4):0;
  c.translate(f.x+f.yaw*peck*w*.018,f.y+.30*Math.sin(f.phase*.53));
  c.rotate((f.pitch-peck*.018)*f.yaw);
  // Composite the bent body and scale glint inside a transparent margin,
  // then transform the single silhouette into the tank or bridge stencil.
  const pad=4,pixelScale=img.width/w,marginY=Math.ceil(img.height*.13)+pad;
  const pose=f.poseCanvas??=herbCanvas(img.width+2*pad,img.height+2*marginY);
  const pc=pose.getContext('2d');pc.setTransform(1,0,0,1,0,0);pc.clearRect(0,0,pose.width,pose.height);
  pc.translate(pad+img.width*.52,marginY+img.height*.51);pc.scale(pixelScale,pixelScale);
  const bands=22, sw=img.width/bands;
  function bend(u){return (1-u)*(1-u)*h*.11*Math.sin(f.phase-u*2.8);}
  function along(u){return (u-.52)*w + (1-u)*(1-u)*w*.067*(.5+.5*Math.cos(f.phase-u*1.7));}
  for(let i=0;i<bands;i++){
    const u=i/bands,n=(i+1)/bands;
    const x=along(u),y=-h*.51+bend(u),width=along(n)-x+.4/pixelScale;
    pc.drawImage(img,i*sw,0,sw,img.height,x,y,width,h);
    const angle=(u-light.center)/.24;
    const strength=light.strength*(.26+.74*Math.exp(-angle*angle));
    if(strength>.035){
      pc.globalCompositeOperation='source-atop';pc.globalAlpha=strength;
      pc.drawImage(light.mask,i*sw,0,sw,img.height,x,y,width,h);
      pc.globalCompositeOperation='source-over';pc.globalAlpha=1;
    }
  }
  // Around the end-on view, pass continuously between the two photographic
  // profiles. Both have the same narrow outline at the centre of the turn.
  const broad=Math.sqrt(f.yaw*f.yaw+.035*(1-f.yaw*f.yaw));
  const front=clamp((f.yaw+.15)/.30);
  const origin=pad+img.width*.52,top=-h*.51-marginY/pixelScale;
  let skin=pose,pivot=origin,side=f.yaw<0?-1:1;
  if(front>0&&front<1){
    // Blend on transparent pixels, not over the tank: opacity stays constant
    // as the two profiles coincide, even in front of pale sand.
    pivot=Math.ceil(Math.max(origin,pose.width-origin));side=1;
    skin=f.turnCanvas??=herbCanvas(2*pivot,pose.height);
    const g=skin.getContext('2d');
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,skin.width,skin.height);
    g.translate(pivot,0);g.globalCompositeOperation='source-over';g.globalAlpha=front;
    g.drawImage(pose,-origin,0);g.scale(-1,1);
    g.globalCompositeOperation='lighter';g.globalAlpha=1-front;g.drawImage(pose,-origin,0);
  }
  c.scale(broad*side,.99);c.globalAlpha=f.traits.opacity;
  c.drawImage(skin,-pivot/pixelScale,top,skin.width/pixelScale,skin.height/pixelScale);
  c.restore();
}
function paintFlake(p,c=ctx){
  const radius=Math.max(2.5,worldPerPixel*2.65)*p.scale;
  const roll=p.phase+p.age*(p.wet?1.15:3.8);
  c.save();c.translate(p.x,p.y);c.rotate(.63*Math.sin(roll)+p.phase*.48);
  c.scale(radius,radius*(.34+.47*Math.abs(Math.cos(roll))));
  c.beginPath();
  p.shape.forEach((v,i)=>{
    const angle=i*Math.PI/3,x=Math.cos(angle)*v,y=Math.sin(angle)*v;
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
  });
  c.closePath();
  c.fillStyle=p.tone>.5?'#c68f55':'#d3af76';c.fill();c.clip();
  c.fillStyle=p.tone>.5?'#796449':'#8a745b';
  c.beginPath();c.moveTo(-1,-.25);c.lineTo(.32,.07);c.lineTo(.78,.61);c.lineTo(-.76,.83);c.fill();
  c.restore();
}

function drawDust(){
  for(const d of tastes){
    const fade=clamp(1-d.age/.8);if(!fade)continue;
    ctx.fillStyle='rgba(179,154,111,'+(fade*.55)+')';
    ctx.fillRect(d.x+d.vx*d.age,d.y+d.vy*d.age,d.size*worldPerPixel,d.size*worldPerPixel*.64);
  }
}

;
/* foliage */
'use strict';

const leafMovement=new Map();
const plantFlex={pinnatifida:.084,stems:.097,crypt:.081,anubias:.057,moss:.060};
const maxLeafAngle=.32;
// Work in the specimen's own pixels, including whole leaves that can swing past
// the rest silhouette. The same envelope feeds the host mask and bridge compositor.
function foliageEnvelope(g){
  const frame=botanicalFrames.get(g.sprite);
  if(frame.envelope)return frame.envelope;
  const rig=foliageRigs[g.sprite],w=rig.w,h=rig.h;
  let l=0,t=0,r=w,b=h;
  for(const part of frame.layers){
    if(!part.id||frame.fan)continue;
    const z=rig.zones[part.id-1],x=z.root[0]*w,y=z.root[1]*h;
    const x1=part.x,x2=x1+part.canvas.width,y1=part.y,y2=y1+part.canvas.height;
    const arm=Math.hypot(Math.max(Math.abs(x1-x),Math.abs(x2-x)),Math.max(Math.abs(y1-y),Math.abs(y2-y)));
    const maxTravel=arm*(maxLeafAngle+.025)+2;
    l=Math.min(l,x1-maxTravel);r=Math.max(r,x2+maxTravel);
    t=Math.min(t,y1-maxTravel);b=Math.max(b,y2+maxTravel);
  }
  return frame.envelope={l:Math.floor(l)-1,r:Math.ceil(r)+1,t:Math.floor(t)-1,b:Math.ceil(b)+1};
}
function paintBounds(g,living){
  if(g.paintBox)return g.paintBox;
  const im=sprites[g.sprite],w=im.naturalWidth,h=im.naturalHeight;
  const e=living?foliageEnvelope(g):{l:0,r:w,t:0,b:h};
  const corners=[[e.l,e.t],[e.r,e.t],[e.r,e.b],[e.l,e.b]].map(([x,y])=>worldPointOnSprite(g,x/w,y/h));
  return g.paintBox={l:Math.min(...corners.map(q=>q.x))-2,r:Math.max(...corners.map(q=>q.x))+2,
    t:Math.min(...corners.map(q=>q.y))-2,b:Math.max(...corners.map(q=>q.y))+2};
}
function botanicalMaterialFor(p,g){
  const node=finishScene?.byId.get(p.id);
  const key=[g.sprite,oldGrade,finishKey(node),g.x,g.y,g.width,g.angle,g.sign,g.z,g.host?.sprite,g.host?.angle,g.host?.width,g.host?.x,g.host?.y,g.host?.sign,p.slot,activeBed.heights.join(',')].join('|');
  const previous=materials.get(p.id);if(previous?.key===key)return previous;
  const frame=botanicalFrames.get(g.sprite),im=sprites[g.sprite],w=im.width,h=im.height;
  const cover=leafOcclusion(g.host,p.slot),parts=[];
  for(const part of frame.layers){
    const src=part.canvas,pw=src.width,ph=src.height,world=worldPointOnSprite(g,(part.x+pw/2)/w,(part.y+ph/2)/h);
    const beam=windowField(world.x/W,world.y/H),facing=clamp(.53+part.depth*.25),far=1-g.z;
    const illumination=sun*(.29+.47*beam)+lamp*(.34+.20*(1-Math.abs(world.x/W-.5)));
    const shade=clamp(.23-illumination*.21+.07*(1-facing)+.035*far,.06,.31);
    const lit=herbCanvas(pw,ph),c=lit.getContext('2d');c.drawImage(src,0,0);
    c.globalCompositeOperation='source-atop';
    const gradient=c.createLinearGradient(0,0,pw*.35,ph);
    gradient.addColorStop(0,'rgba(19,49,35,'+shade*.6+')');gradient.addColorStop(1,'rgba(14,36,28,'+shade*1.42+')');
    c.fillStyle=gradient;c.fillRect(0,0,pw,ph);
    c.fillStyle='rgba(82,125,112,'+(.035+far*.035)+')';c.fillRect(0,0,pw,ph);
    if(node)finishSurface(lit,g,node,part.x/w,part.y/h,pw/w,ph/h);
    parts.push({id:part.id,canvas:lit,x:part.x/w,y:part.y/h,w:pw/w,h:ph/h});
  }
  const item={key,parts,fan:frame.fan};materials.set(p.id,item);
  if(cover){
    // Apply the bark/stone silhouette after the leaves move. Uncovered leaves
    // can slide in front of each other without dragging a hole through the host.
    const e=foliageEnvelope(g),cw=e.r-e.l,ch=e.b-e.t;
    const cut=herbCanvas(cw,ch),c=cut.getContext('2d'),mask=c.createImageData(cw,ch);
    const stepX=g.width/w*g.sign*g.cos,stepY=g.width/w*g.sign*g.sin;
    const top=g.host.top-3,bottom=Math.max(g.host.bed,g.host.y+g.host.height)+3;
    for(let j=0;j<ch;j++){
      const v=(j+e.t+.5)/h,first=worldPointOnSprite(g,(e.l+.5)/w,v);let x=first.x,y=first.y;
      for(let i=0;i<cw;i++,x+=stepX,y+=stepY)if(y>=top&&y<=bottom&&x>=g.host.left-2&&x<=g.host.right+2)
        mask.data[4*(j*cw+i)+3]=255*(1-visibility(cover,x,y,g.pivotY-v,g.pivotY));
    }
    c.putImageData(mask,0,0);Object.assign(item,{cut,offsetX:-e.l,offsetY:-e.t,surface:herbCanvas(cw,ch)});
  }
  return item;
}
// Follow the visible blade back to its source pixels for contact, including the
// portion now outside the rest frame. Pick the frontmost painted layer.
function leafHit(g,rig,localU,v,warp){
  const frame=botanicalFrames.get(g.sprite),pose=leafMovement.get(g.id);
  if(pose?.key!==g.sprite||!pose.angles||frame.fan){
    const u=restingFanU(warp,localU,v);
    if(u<0||u>=1||v<0||v>=1)return null;
    const i=Math.floor(v*rig.h)*rig.w+Math.floor(u*rig.w),id=rig.labels[i];
    return id&&masks[g.sprite][i]>42?{id,u,v}:null;
  }
  const x=localU*rig.w,y=v*rig.h;
  for(let i=frame.layers.length-1;i>=0;i--){
    const part=frame.layers[i];if(!part.id)continue;
    const j=part.id-1,z=rig.zones[j],rx=z.root[0]*rig.w,ry=z.root[1]*rig.h;
    const dx=x-rx,dy=y-ry,angle=pose.angles[j],shear=g.kind==='stems';
    const cs=shear?1:Math.cos(angle),sn=shear?angle:Math.sin(angle);
    const px=rx+cs*dx+sn*dy,py=shear?y:ry-sn*dx+cs*dy;
    const ix=Math.floor(px)-part.x,iy=Math.floor(py)-part.y,w=part.canvas.width;
    if(ix<0||ix>=w||iy<0||iy>=part.canvas.height)continue;
    const at=iy*w+ix;
    if(part.coverage[at>>3]&(1<<(at&7)))return {id:part.id,u:px/rig.w,v:py/rig.h};
  }
  return null;
}
function displayedLeafUV(g,rig,id,u,v){
  const pose=leafMovement.get(g.id);
  if(pose?.key!==g.sprite||!pose.angles)return [u,v];
  const frame=botanicalFrames.get(g.sprite);
  if(frame.fan){
    const w=materials.get(g.id)?.warp;if(!w)return [u,v];
    const col=clamp(u*w.cols,0,w.cols-.0001),row=clamp(v*w.rows,0,w.rows-.0001);
    const i=Math.floor(row)*(w.cols+1)+Math.floor(col),fx=col%1,fy=row%1;
    const a=mix(w.grid[i],w.grid[i+1],fx),b=mix(w.grid[i+w.cols+1],w.grid[i+w.cols+2],fx);
    return [u+mix(a,b,fy)/w.w,v];
  }
  const root=rig.zones[id-1].root,dx=(u-root[0])*rig.w,dy=(v-root[1])*rig.h,angle=pose.angles[id-1];
  if(g.kind==='stems')return [u-angle*dy/rig.w,v];
  const cs=Math.cos(angle),sn=Math.sin(angle);
  return [root[0]+(cs*dx-sn*dy)/rig.w,root[1]+(sn*dx+cs*dy)/rig.h];
}
function brushForces(g,rig,forces,warp=null){
  const cover=leafOcclusion(g.host,g.slot),box=paintBounds(g,true);
  for(const f of fish){
    if(Math.abs(f.z-g.z)>.115||f.x<box.l-f.width*.52||f.x>box.r+f.width*.52||f.y<box.t-f.width*.52||f.y>box.b+f.width*.52)continue;
    for(const [pos,offsetY] of [[.42,0],[.30,2],[.30,-2],[.13,0],[-.20,1],[-.34,-1]]){
      const x=f.x+pos*f.width*f.yaw*Math.cos(f.pitch)-g.x,y=f.y+offsetY+pos*f.width*Math.sin(f.pitch)-g.y;
      const localV=g.pivotY+(-x*g.sin+y*g.cos)/g.height;
      if(visibility(cover,g.x+x,g.y+y,g.pivotY-localV,g.pivotY)<.45)continue;
      const hit=leafHit(g,rig,g.pivotX+(x*g.cos+y*g.sin)*g.sign/g.width,localV,warp);
      if(!hit)continue;
      const {id,u,v}=hit;
      const zone=rig.zones[id-1],dx=(u-zone.root[0])*g.width,dy=(v-zone.root[1])*g.height;
      const arm=Math.hypot((zone.tip[0]-zone.root[0])*g.width,(zone.tip[1]-zone.root[1])*g.height);
      const fx=(f.vx*g.cos+f.vy*g.sin)*g.sign,fy=-f.vx*g.sin+f.vy*g.cos;
      const push=clamp((dx*fy-dy*fx)/Math.max(1,arm*23),-1,1);
      if(Math.abs(push)>Math.abs(forces[id]))forces[id]=push;
    }
  }
}
function paintFoliage(target,p,g,material,t){
  const rig=foliageRigs[g.sprite],parts=material.parts;
  const c=material.cut?material.surface.getContext('2d'):target;
  if(material.cut){
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,material.surface.width,material.surface.height);
    c.translate(material.offsetX+g.pivotX*rig.w,material.offsetY+g.pivotY*rig.h);c.scale(rig.w/g.width,rig.h/g.height);
  }
  let state=leafMovement.get(p.id);
  if(state?.key!==g.sprite){
    state={key:g.sprite,last:t,branches:rig.zones.map(()=>({angle:0,v:0,load:0,hold:0,pressure:0}))};leafMovement.set(p.id,state);
  }
  const dt=clamp(t-state.last,0,.12);state.last=t;
  const force=new Float32Array(rig.zones.length+1);if(!editing&&!motion.matches)brushForces(g,rig,force,material.warp);
  if(!editing&&!motion.matches&&typeof shrimp!=='undefined')for(const a of shrimp){
    if(a.resting&&!a.inNet&&a.perch?.type==='leaf'&&a.perch.host===g.id&&a.perch.sprite===g.sprite){
      const i=a.perch.zone,load=g.sign*a.facing*(.32+.065*Math.sin(a.phase));
      if(Math.abs(force[i])<Math.abs(load))force[i]=load;
    }
  }
  if(fingerBrush?.plant===p.id&&fingerBrush.until>time)force[fingerBrush.id]=fingerBrush.sign;
  const flex=plantFlex[p.kind];
  const angles=state.angles??=new Float32Array(rig.zones.length);
  for(const [j,z] of rig.zones.entries()){
    const s=state.branches[j],arm=Math.hypot(g.width*(z.tip[0]-z.root[0]),g.height*(z.tip[1]-z.root[1]));
    const excursion=clamp(flex*1.65+3/Math.max(8,arm),.10,p.kind==='moss'?.29:maxLeafAngle);
    let pressure=force[z.id];
    if(!motion.matches&&waterChange?.stage==='fill'){
      const tip=worldPointOnSprite(g,...z.tip),dx=tip.x-waterChange.x;
      const reach=Math.exp(-((dx/110)**2))*clamp(1-(tip.y-surface-waterDrop)/450);
      const pulse=Math.sin(Math.PI*clamp(waterChange.elapsed/5))*(.76+.24*Math.sin(time*2.7+j*.23));
      pressure=clamp(pressure+g.sign*(dx<0?-1:1)*reach*pulse*.85,-1,1);
    }
    const target=pressure*excursion;
    if(Math.abs(target)>.001){s.pressure=target;s.hold=.32;}
    else s.hold=Math.max(0,s.hold-dt);
    s.load=approach(s.load,s.hold?s.pressure:0,s.hold?11:2.45,dt);
    const steps=Math.ceil(dt/.025);
    for(let i=0;i<steps;i++){const h=dt/steps;s.v+=(44*(s.load-s.angle)-13.4*s.v)*h;s.angle+=s.v*h;}
    const wash=motion.matches?0:flex*.19*(Math.sin(t*.64+p.x*3+j*.49)+.23*Math.sin(t*.33+j*.97));
    angles[j]=s.angle+wash;
  }
  if(material.fan){
    const moving=angles.some(a=>Math.abs(a)>.00015);
    const im=moving?drawFanWarp(material,rig,angles,t):parts[0].canvas;
    c.drawImage(im,-g.pivotX*g.width,-g.pivotY*g.height,g.width,g.height);
  }else for(const part of parts){
    c.save();
    if(part.id){
      const z=rig.zones[part.id-1],angle=angles[part.id-1];
      const x=(z.root[0]-g.pivotX)*g.width,y=(z.root[1]-g.pivotY)*g.height;
      c.translate(x,y);
      // Move each complete shoot in one draw. The base stays pinned under the flow.
      if(p.kind==='stems')c.transform(1,0,-angle,1,0,0);
      else c.rotate(angle);
      c.translate(-x,-y);
    }
    c.drawImage(part.canvas,(part.x-g.pivotX)*g.width,(part.y-g.pivotY)*g.height,part.w*g.width,part.h*g.height);c.restore();
  }
  if(material.cut){
    c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='destination-out';
    c.drawImage(material.cut,0,0);c.globalCompositeOperation='source-over';
    const xUnit=g.width/rig.w,yUnit=g.height/rig.h;
    target.drawImage(material.surface,-g.pivotX*g.width-material.offsetX*xUnit,-g.pivotY*g.height-material.offsetY*yUnit,material.surface.width*xUnit,material.surface.height*yUnit);
  }
}

;
/* habitat */
'use strict';

let archViews=[],bridges=[],bankEdges=[],introduced=false;
const depthStencils=new Map(),subjectLayer=document.createElement('canvas');
async function loadPassages(){
  const r=await fetch('assets/turn/arch-passage.json');if(!r.ok)throw Error('Missing passage geometry');
  archViews=(await r.json()).views;
}
function bridgeDepth(g,n){
  const span=clamp(g.width/1120,.13,.45);
  return mix(Math.max(0,g.z-span*.5),Math.min(1,g.z+span*.5),n);
}
function mapBridge(p,g){
  const data=archViews[p.yaw],points=data.centerline.map(([u,v,n])=>({...worldPointOnSprite(g,u,v),z:bridgeDepth(g,n)}));
  return {p,g,points,clear:g.width*data.suggestedClearance,back:bridgeDepth(g,0),front:bridgeDepth(g,1),
    key:[p.id,g.x,g.y,g.width,g.angle,g.sign,p.yaw,g.z].join('/')};
}
function observeHabitat(items,geo){
  bridges=[];bankEdges=[];seenPlants=[];plantedCover=null;
  let best=0;
  for(const p of items){
    const g=geo.get(p.id);
    if(p.kind==='arch')bridges.push(mapBridge(p,g));
    const side=g.x<600?1:-1;
    if(catalog[p.kind].support)bankEdges.push({x:clamp(g.x+side*g.width*.31,left+100,right-100),y:clamp(g.top+g.height*.26,surface+55,floor-34)});
    if(!plantLife[p.kind])continue;
    seenPlants.push({p,g});
    const score=g.height*(p.kind==='stems'?1.16:1);
    if(score>best){
      const zones=foliageRigs[g.sprite].zones;
      const rim=zones.map(zone=>worldPointOnSprite(g,...zone.tip))
        .filter(pt=>pt.y<g.y-g.height*.22).sort((a,b)=>side*(b.x-a.x));
      const point=rim[0]||{x:g.x,y:g.top+g.height*.32};
      best=score;plantedCover={id:p.id,x:clamp(point.x,left+35,right-35),
        y:clamp(point.y,surface+35,rowY(sandRow(g.z),point.x)-9),z:g.z};
    }
  }
  if(!introduced&&ready){
    introduced=true;
    if(sample==='archway'&&bridges.length){
      const f=fish.find(f=>f.species==='whiteCloud'),b=bridges[0];
      if(f&&fitsPassage(b,f)){const a=b.points[0];Object.assign(f,{x:a.x,y:a.y,z:a.z,vx:0,vy:0});
        f.yaw=f.facing=Math.sign(b.points[1].x-a.x)||1;beginPassage(f,b,false);}
    }
  }
}
function fitsPassage(b,f){
  const margin=f.width*.42;
  return b.clear>=f.width*.15&&b.points.every(p=>p.x>left+margin&&p.x<right-margin&&p.y>surface+10&&p.y<rowY(sandRow(p.z),p.x)-f.width*.12);
}
function beginPassage(f,b,reverse){
  f.trip={key:b.key,index:reverse?b.points.length-1:0,dir:reverse?-1:1,onPath:false};f.target=null;
}
function travelPassage(f,dt){
  if(!f.trip&&f.species==='whiteCloud'&&!food.length&&sun>.15&&time>(f.nextPass??5)&&!editing){
    f.nextPass=time+8;
    const b=bridges.filter(b=>fitsPassage(b,f)).sort((a,b)=>Math.abs(a.g.x-f.x)-Math.abs(b.g.x-f.x))[0];
    if(b){
      const a=b.points[0],e=b.points.at(-1);
      beginPassage(f,b,Math.hypot(e.x-f.x,e.y-f.y)<Math.hypot(a.x-f.x,a.y-f.y));
    }
  }
  if(!f.trip)return false;
  const trip=f.trip,b=bridges.find(b=>b.key===trip.key);
  if(!b||editing||(!trip.onPath&&food.length)){f.trip=null;f.nextGoal=time;f.nextPass=time+10;return false;}
  let budget=(32+23*sun)*dt,ox=f.x,oy=f.y;
  while(budget>0&&f.trip){
    const dest=b.points[trip.index],dx=dest.x-f.x,dy=dest.y-f.y,dz=dest.z-f.z;
    const distance=Math.hypot(dx,dy,210*dz),stride=Math.min(budget,distance);
    if(distance>1e-6){f.x+=dx*stride/distance;f.y+=dy*stride/distance;f.z+=dz*stride/distance;}
    budget-=stride;
    if(distance>stride+.001)break;
    trip.onPath=true;trip.index+=trip.dir;
    if(trip.index<0||trip.index>=b.points.length){f.trip=null;f.nextPass=time+rand(22,42);f.nextGoal=time;break;}
  }
  const vx=(f.x-ox)/dt,vy=(f.y-oy)/dt;
  f.vx=approach(f.vx,vx,5,dt);f.vy=approach(f.vy,vy,5,dt);
  if(Math.abs(vx)>1)f.facing=Math.sign(vx);
  f.yaw=approach(f.yaw,f.facing*(.76+.24*clamp(Math.abs(vx)/25)),4,dt);
  f.pitch=approach(f.pitch,clamp(Math.atan2(vy,Math.abs(vx)+13),-.38,.38),3,dt);
  f.phase+=dt*(4.1+Math.hypot(vx,vy)*.08);f.peckAge+=dt;return true;
}
// A fish inside the depth range sees the wood nearer than itself. Transparent water never masks it.
function depthStencil(g,z){
  const cut=Math.round(96*clamp((z-bridgeDepth(g,0))/(bridgeDepth(g,1)-bridgeDepth(g,0)))),key=g.sprite+'/'+cut;
  if(depthStencils.has(key))return depthStencils.get(key);
  const m=surfaceMaps[g.sprite],canvas=document.createElement('canvas');canvas.width=m.w;canvas.height=m.h;
  const c=canvas.getContext('2d'),out=c.createImageData(m.w,m.h);
  const alpha=masks[g.sprite],im=sprites[g.sprite],w=im.naturalWidth,h=im.naturalHeight;
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
    const i=4*(y*m.w+x),cover=alpha[Math.floor((y+.5)*h/m.h)*w+Math.floor((x+.5)*w/m.w)];
    out.data[i+3]=cover*smooth(-.009,.009,m.depth[i]/255-cut/96);
  }
  c.putImageData(out,0,0);depthStencils.set(key,canvas);
  if(depthStencils.size>40)depthStencils.delete(depthStencils.keys().next().value);
  return canvas;
}
function drawInHabitat(z,box,draw,arches,own=null){
  const overlap=arches.filter(b=>b.g!==own&&surfaceMaps[b.g.sprite]&&z>=b.back&&z<b.front&&box.r>b.g.left&&box.l<b.g.right&&box.b>b.g.top&&box.t<b.g.bed);
  if(!overlap.length){draw(ctx);return;}
  const x=Math.floor(box.l),y=Math.floor(box.t),w=Math.ceil(box.r)-x,h=Math.ceil(box.b)-y;
  const c=subjectLayer.getContext('2d');
  const pad=2;
  if(subjectLayer.width<w+2*pad)subjectLayer.width=w+2*pad;
  if(subjectLayer.height<h+2*pad)subjectLayer.height=h+2*pad;
  // Filtered subrect blits sample neighbouring texels. Keep a clean gutter
  // even when the last subject using this surface was larger than this fish.
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w+2*pad,h+2*pad);
  c.setTransform(1,0,0,1,pad-x,pad-y);draw(c);
  c.globalCompositeOperation='destination-out';
  for(const {g} of overlap){
    c.save();clipPieceAtBed(c,g);
    c.translate(g.x,g.y);c.rotate(g.angle);c.scale(g.sign,1);
    c.drawImage(depthStencil(g,z),-g.pivotX*g.width,-g.pivotY*g.height,g.width,g.height);c.restore();
  }
  c.globalCompositeOperation='source-over';ctx.drawImage(subjectLayer,pad,pad,w,h,x,y,w,h);
}

;
/* water-surface */
'use strict';

// Continuous refraction of the photographed water. Coordinates are registered on the
// 1200 × 800 frontal plate; the camera can move without changing the waves.
const paintSurfaceWater = (() => {
  const left=67, top=242, width=1067, height=44, stepX=8, stepY=3;
  const columns=Math.ceil((width-1)/stepX)+1, rows=Math.ceil((height-1)/stepY)+1;
  const field=new Float32Array(columns*rows*4);
  let strip,painter,source,output,aperture,lightKey,frameKey=-1,dry,waterBand;
  function rearLine(x){return 268.5-19.5*Math.min(1,Math.max(0,Math.min(x-69,1131-x)/45));}
  function prepareDrawdown(){
    // Extend the dry inner pane below its original meniscus, preserving the
    // fixed glass rim and both perspective corners when the water drops.
    const h=height+Math.ceil(exchangeDepth)+5;
    dry=herbCanvas(width,h);
    const g=dry.getContext('2d'),frame=g.createImageData(width,h);
    const wall=base.getContext('2d').getImageData(left,86,width,h).data;
    for(let x=0;x<width;x++){
      const rim=Math.max(1,Math.floor(rearLine(left+x)-top-4));
      for(let y=0;y<h;y++){
        const sy=Math.min(y,rim),i=4*(y*width+x),j=4*(sy*width+x);
        const pane=Math.min(x,width-1-x),farCorner=Math.abs(pane-40);
        const edge=Math.exp(-((pane/4)**2)),reflection=Math.exp(-((farCorner/1.3)**2));
        const reveal=ease(rim,rim+10,y);
        for(let k=0;k<3;k++){
          const tint=[.92,.96,.94][k];
          const through=wall[i+k]*tint*(1-.16*edge-.055*reflection);
          frame.data[i+k]=mix(source[j+k],through,reveal);
        }
        frame.data[i+3]=255;
      }
    }
    g.putImageData(frame,0,0);
    waterBand=new Path2D();waterBand.moveTo(left,top+height);
    for(let i=0;i<=width;i+=1){const x=left+i;waterBand.lineTo(x,rearLine(x)-3);}
    waterBand.lineTo(left+width,top+height);waterBand.closePath();
  }
  const ease=(lo,hi,v)=>{const a=Math.min(1,Math.max(0,(v-lo)/(hi-lo)));return a*a*(3-2*a);};

  function prepare(){
    if(!strip){
      strip=document.createElement('canvas');strip.width=width;strip.height=height;
      painter=strip.getContext('2d');aperture=new Float32Array(width*height);
      for(let x=0;x<width;x++){
        const side=Math.min(left+x-69,1131-left-x);
        // At the sides we see the refracted side panes. The back of the actual
        // water surface angles forward until it meets the two front glass corners.
        const rear=268.5-19.5*Math.min(1,Math.max(0,side/45));
        const front=274+7*Math.min(1,Math.max(0,side/26));
        for(let y=0;y<height;y++){
          const wy=top+y;
          aperture[y*width+x]=ease(0,11,side)*ease(rear-.8,rear+3.2,wy)*(1-ease(front-1,front+2.4,wy));
        }
      }
    }
    // Sample the current photographic exposure before the outer scene grade.
    // This avoids stale gold highlights on switching into night mode.
    source=base.getContext('2d').getImageData(left,top,width,height).data;
    dry=null;
    output=painter.createImageData(width,height);output.data.set(source);
    lightKey=oldGrade;frameKey=-1;
  }

  function surfaceSlopes(t){
    const lampReflection=mood[3]+.27*mood[2]+.08*mood[0];
    const sunReflection=mood[1]+.55*mood[0]+.44*mood[2];
    const disturbances=ripples.filter(r=>r.age>=0 && r.age<2.05).map(r=>({
      x:r.x,y:r.y,radius:2+r.age*89,
      amplitude:r.strength*(1-Math.exp(-r.age*27))*Math.exp(-r.age*1.1),
      spread:12+5*r.age
    }));
    const waveTime=t*.93;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const wx=left+x*stepX,wy=top+y*stepY,depth=(wy-247)*5.7,i=4*(y*columns+x);
      // Three oblique wave trains with unequal speeds. Long waves carry the
      // reflection sideways; the capillary component deforms it on a finer scale.
      const swell=wx*.020-depth*.018-waveTime*1.24+.47*Math.sin(wx*.008+waveTime*.26);
      const cross=wx*.038+depth*.034+waveTime*1.62+.53*Math.sin(wx*.012-waveTime*.48);
      const fine=wx*.091-depth*.064-waveTime*2.03+.76*Math.sin(cross);
      let dx=7.1*Math.sin(swell)+3.8*Math.sin(cross)+1.38*Math.sin(fine);
      let dy=1.54*Math.cos(swell)-.98*Math.cos(cross)+.46*Math.sin(fine);
      let slope=.57*Math.cos(cross)+.38*Math.sin(fine);
      for(const r of disturbances){
        const rx=wx-r.x,ry=(wy-r.y)*6.15;
        if(Math.abs(rx)>r.radius+3*r.spread || Math.abs(ry)>r.radius+3*r.spread)continue;
        const distance=Math.sqrt(rx*rx+ry*ry+.3),delta=distance-r.radius;
        const wave=r.amplitude*Math.exp(-((delta/r.spread)**2))*
          Math.sin(delta*.242+.42*Math.sin(rx*.066+ry*.041))/(1+distance*.006);
        // Impact is visible only where its slope redirects an existing reflection.
        dx+=10.7*wave*rx/distance;dy+=wave*(4.7*ry/distance+1.2);slope+=wave*1.72;
      }
      field[i]=dx;field[i+1]=dy;
      field[i+2]=(.035+.045*sunReflection)*slope;
      // Reflected pendant: interrupted facets facing the light, sampled in water
      // space. Never draw a line or a closed ring on top of the surface.
      const under=ease(326,432,wx)*(1-ease(774,878,wx));
      const lightY=259.8+dy*1.35+1.3*Math.sin(swell);
      const facet=Math.max(0,.37+.60*slope);
      field[i+3]=lampReflection*under*Math.exp(-(((wy-lightY)/2.7)**2))*facet*37;
    }
  }

  function refract(){
    const dst=output.data;
    for(let y=0;y<height;y++){
      const row=Math.floor(y/stepY),blend=(y-row*stepY)/stepY,rowIndex=y*width;
      for(let col=0;col<columns-1;col++){
        const origin=4*(row*columns+col),below=origin+4*columns;
        const start=col*stepX,end=Math.min(width,start+stepX);
        let dx=field[origin]+blend*(field[below]-field[origin]);
        let dy=field[origin+1]+blend*(field[below+1]-field[origin+1]);
        let diffuse=field[origin+2]+blend*(field[below+2]-field[origin+2]);
        let light=field[origin+3]+blend*(field[below+3]-field[origin+3]);
        const ddx=(field[origin+4]+blend*(field[below+4]-field[origin+4])-dx)/stepX;
        const ddy=(field[origin+5]+blend*(field[below+5]-field[origin+5])-dy)/stepX;
        const dDiffuse=(field[origin+6]+blend*(field[below+6]-field[origin+6])-diffuse)/stepX;
        const dLight=(field[origin+7]+blend*(field[below+7]-field[origin+7])-light)/stepX;
        for(let x=start;x<end;x++,dx+=ddx,dy+=ddy,diffuse+=dDiffuse,light+=dLight){
          const point=rowIndex+x,mask=aperture[point];if(mask<=0)continue;
          // Bilinear interpolation of both the continuous field and the real image
          // avoids gaps when adjacent regions move in opposite directions.
          const sx=Math.min(width-1.001,Math.max(0,x+dx*mask)),sy=Math.min(height-1.001,Math.max(0,y+dy*mask));
          const ix=sx|0,iy=sy|0,fx=sx-ix,fy=sy-iy,above=4*(iy*width+ix),below=above+width*4;
          const gain=1+diffuse*mask,spill=light*mask;
          for(let k=0;k<3;k++){
            const a=source[above+k]+fx*(source[above+k+4]-source[above+k]);
            const b=source[below+k]+fx*(source[below+k+4]-source[below+k]);
            dst[4*point+k]=(a+fy*(b-a))*gain+spill*(k===0?.91:k===1?1:1.05);
          }
        }
      }
    }
    painter.putImageData(output,0,0);
  }

  return function paintSurfaceWater(t){
    if(!strip || lightKey!==oldGrade)prepare();
    const tick=Math.floor(t*28);
    if(tick!==frameKey){surfaceSlopes(t);refract();frameKey=tick;}
    if(waterDrop<.08){ctx.drawImage(strip,left,top);return;}
    if(!dry)prepareDrawdown();
    const h=height+waterDrop;
    ctx.drawImage(dry,0,0,width,h,left,top,width,h);
    ctx.save();ctx.translate(0,waterDrop);ctx.clip(waterBand);
    ctx.drawImage(strip,left,top);ctx.restore();
  };
})();

;
/* plant-watch */
'use strict';

// Observation uses the aquarium's existing fish and geometry. The adult specimen is a temporary view.
let watchState=null,brushVisit=null,fingerBrush=null,nextLeafVisit=2;
function watchItems(){
  if(!watchState?.grown)return layout;
  return layout.map(p=>{
    if(p.id!==watchState.id)return p;
    const seed=seedOf(p),form=watchState.form;
    return {...p,plantedAt:null,growthSeed:form==null||form===seed%3?seed:Math.min(4294967292,seed-seed%3)+form};
  });
}
function watchCamera(rect){
  const g=watchState.bounds,ratio=rect.width/Math.max(1,rect.height);
  const e=paintBounds(g,true),h=Math.min(1164/ratio,Math.max(104,(e.r-e.l+18)/ratio,e.b-e.t+20)),w=h*ratio;
  const cx=(e.l+e.r)*.5,cy=(e.t+e.b)*.5;
  return {left:clamp(cx-w/2,18,1182-w),top:h>544?cy-h/2:clamp(cy-h/2,167,711-h),w,h};
}
function trackSpecimen(items,geo){
  const p=items.find(p=>p.id===watchState.id);if(!p)return;
  watchState.bounds=geo.get(p.id);watchState.piece=p;
}
function openWatch(id,grown=false,form=null){
  const p=layout.find(p=>p.id===id&&plantLife[p.kind])||layout.find(p=>p.kind==='pinnatifida')||layout.find(p=>plantLife[p.kind]);
  if(!p)return;
  if(grown)globalThis.tankJournal?.record('plant-portrait');
  else if(Number.isFinite(p.plantedAt)&&plantAge(p)>0)globalThis.tankJournal?.record('new-growth');
  if(observedAnimal)observeAnimal(null);
  watchState={id:p.id,grown,form};brushVisit=null;fingerBrush=null;nextLeafVisit=time+.15;
  const items=watchItems();trackSpecimen(items,geometry(items));refresh();resize();
}
function refreshWatch(){
  const plants=layout.filter(p=>plantLife[p.kind]);
  $('#watch').hidden=!ready||editing||!!watchState||!plants.length;
  $('#watch-tools').hidden=!watchState;
  if(!watchState)return;
  $('#edit').hidden=$('#feed').hidden=$('#watch').hidden=$('#camera').hidden=true;
  options($('#watch-plant'),plants.map(p=>[p.id,nameOf(p)]));$('#watch-plant').value=watchState.id;
  const form=$('#watch-form'),original=layout.find(p=>p.id===watchState.id);
  $('#watch-growth').textContent=(watchState.grown?'成株预览 · 这株目前的状态：':'')+growthReading(original);
  form.hidden=!watchState.grown;
  if(watchState.grown){
    const seed=seedOf(original),own=seed%3;
    options(form,[0,1,2].map(i=>[String(i),botanicalFormName(original.kind,i)+(i===own?' · 本株':'')]));
    form.value=String(watchState.form??own);
  }
  for(const b of $('#watch-age').children)b.setAttribute('aria-pressed',String((b.dataset.age==='grown')===watchState.grown));
}
function bindWatch(){
  $('#watch').addEventListener('click',()=>openWatch(plantLife[chosen()?.kind]?selected:null));
  $('#watch-plant').addEventListener('change',e=>openWatch(e.target.value,watchState.grown));
  $('#watch-age').addEventListener('click',e=>{if(e.target.dataset.age)openWatch(watchState.id,e.target.dataset.age==='grown');});
  $('#watch-form').addEventListener('change',e=>{
    watchState.form=Number(e.target.value);brushVisit=null;fingerBrush=null;nextLeafVisit=time+.25;
    const items=watchItems();trackSpecimen(items,geometry(items));resize();
  });
  $('#close-watch').addEventListener('click',()=>{
    watchState=null;brushVisit=null;fingerBrush=null;nextLeafVisit=time+2;
    refresh();resize();
  });
}
function specimenTip(g){
  const rig=foliageRigs[g.sprite],im=sprites[g.sprite],alpha=masks[g.sprite],cover=leafOcclusion(g.host,g.slot);
  let best=null,score=-Infinity;
  for(const z of rig.zones){
    // Find a solid part just inside the tip; the painted fringe may be a single translucent pixel.
    const steps=[.90,.84,.95,.78,.72,.99];let tip=null;
    for(const u of steps){
      const a=z.points?.at(-2)||z.root;
      const px=mix(a[0],z.tip[0],u),py=mix(a[1],z.tip[1],u);
      const ix=clamp(Math.floor(px*rig.w),0,rig.w-1),iy=clamp(Math.floor(py*rig.h),0,rig.h-1);
      if(rig.labels[iy*rig.w+ix]!==z.id||alpha[Math.floor(py*im.naturalHeight)*im.naturalWidth+Math.floor(px*im.naturalWidth)]<64)continue;
      const [uLive,vLive]=displayedLeafUV(g,rig,z.id,px,py);
      const picked=leafHit(g,rig,uLive,vLive,materials.get(g.id)?.warp);
      if(picked?.id!==z.id)continue;
      const at=worldPointOnSprite(g,uLive,vLive);
      if(visibility(cover,at.x,at.y,g.pivotY-py,g.pivotY)<.48)continue;
      tip={...at,u:px,v:py};break;
    }
    if(!tip)continue;
    const root=worldPointOnSprite(g,...z.root),rise=root.y-tip.y,span=Math.hypot(tip.x-root.x,rise);
    const rank=.68*span+.47*rise+.18*Math.abs(tip.x-g.x);
    if(rank>score&&tip.y<rowY(sandRow(g.z),tip.x)-3){best={...tip,root,z:g.z,id:z.id};score=rank;}
  }
  return best;
}
let seenPlants=[];
function prepareLeafVisit(){
  if(editing||food.length||time<nextLeafVisit||!seenPlants.length||sun<.10&&!watchState)return;
  const aim=watchState?seenPlants.find(o=>o.p.id===watchState.id):seenPlants[Math.floor(rand(0,seenPlants.length))];
  nextLeafVisit=time+(watchState?2:rand(9,16));if(!aim)return;
  const tip=specimenTip(aim.g);if(!tip)return;
  const candidates=fish.filter(f=>!f.target&&!f.trip&&(watchState||f.species==='guppy'));
  const f=candidates.sort((a,b)=>Math.hypot(a.x-tip.x,a.y-tip.y)-Math.hypot(b.x-tip.x,b.y-tip.y))[0];
  if(!f)return;
  let side=tip.x>=f.x?1:-1;
  const pad=f.width*.65;if(tip.x<left+pad*2)side=-1;else if(tip.x>right-pad*2)side=1;
  const slope=clamp((tip.x-tip.root.x)/Math.max(5,tip.root.y-tip.y),-.62,.62);
  const pos=(offset)=>({x:clamp(tip.x+side*offset,left+f.width*.43,right-f.width*.43),
    y:clamp(tip.y+side*offset*slope,surface+9,rowY(sandRow(tip.z),tip.x)-f.width*.12)});
  brushVisit={f,plant:aim.p.id,stage:0,tip,points:[pos(-pad-12),pos(7),pos(pad+22)],side};
}
function swimByLeaf(f,dt){
  if(!brushVisit)prepareLeafVisit();
  const trip=brushVisit;if(!trip||trip.f!==f)return false;
  if(editing||food.length||!seenPlants.some(o=>o.p.id===trip.plant)){
    brushVisit=null;nextLeafVisit=time+4;return false;
  }
  const dest=trip.points[trip.stage],dx=dest.x-f.x,dy=dest.y-f.y,dist=Math.hypot(dx,dy),speed=trip.stage===0?(watchState?70:36):trip.stage===1?26:32;
  const glide=Math.min(speed,Math.max(7,dist*1.6));
  f.vx=approach(f.vx,dx*glide/Math.max(1,dist),4.2,dt);f.vy=approach(f.vy,dy*glide/Math.max(1,dist),4.2,dt);
  if(Math.abs(f.vx)>3)f.facing=Math.sign(f.vx);
  f.yaw=approach(f.yaw,f.facing,4,dt);f.pitch=approach(f.pitch,clamp(Math.atan2(f.vy,Math.abs(f.vx)+12),-.45,.45),4,dt);
  f.x=clamp(f.x+f.vx*dt,left+f.width*.43,right-f.width*.43);
  f.z=approach(f.z,clamp(trip.tip.z+.013),2.5,dt);
  f.y=clamp(f.y+f.vy*dt,surface+5,rowY(sandRow(f.z),f.x)-f.width*.10);
  f.phase+=dt*(f.traits.tailBeat+Math.hypot(f.vx,f.vy)*.09);f.peckAge+=dt;
  if(dist<3||(dist<9&&trip.stage===0)){
    if(trip.stage===0)f.peckAge=0;
    if(++trip.stage===trip.points.length){brushVisit=null;nextLeafVisit=time+(watchState?4.2:rand(11,23));f.nextGoal=time;}
  }
  return true;
}
function touchSpecimen(point,delta=0){
  const g=watchState.bounds,r=foliageRigs[g.sprite],cover=leafOcclusion(g.host,g.slot),range=clamp(worldPerPixel*5,1.6,7);
  const warp=materials.get(watchState.id)?.warp;
  for(const [ox,oy] of [[0,0],[range,0],[-range,0],[0,range],[0,-range]]){
    const dx=point.x+ox-g.x,dy=point.y+oy-g.y;
    const v=g.pivotY+(-dx*g.sin+dy*g.cos)/g.height;
    if(visibility(cover,point.x+ox,point.y+oy,g.pivotY-v,g.pivotY)<.45)continue;
    const hit=leafHit(g,r,g.pivotX+(dx*g.cos+dy*g.sin)*g.sign/g.width,v,warp);
    if(!hit)continue;
    const id=hit.id;
    const sign=(Math.abs(delta)>1?Math.sign(delta):point.x>g.x?1:-1)*g.sign;
    fingerBrush={plant:watchState.id,id,sign,until:time+.38,restAt:performance.now()+3500};return true;
  }
}

;
/* scene-finish */
'use strict';

// The light rig is stable between layout changes. Fish and swaying leaves keep
// their own animation and never become part of a flattened scene.
let finishScene=null;
const compactAquarium=matchMedia('(max-width:700px), (orientation:portrait) and (max-width:850px), (pointer:coarse) and (max-height:540px)');
const finishPreference=(globalThis.tankSavePrefix||'')+'aquarium.light-study.natural-light';
function preferredFinish(){
  try{return localStorage.getItem(finishPreference)!=='off';}catch{return true;}
}
function storeFinish(){
  try{localStorage.setItem(finishPreference,naturalFinish?'on':'off');return true;}catch{return false;}
}
function sameFinishGeometry(items,geo){
  const prev=finishScene;
  if(!prev||prev.compact!==compactAquarium.matches||prev.bed!==activeBed||prev.grade!==oldGrade||prev.nodes.length!==items.length)return false;
  return items.every((p,i)=>{
    const a=geo.get(p.id),node=prev.nodes[i],b=node.g;
    return p.id===node.id&&a.sprite===b.sprite&&a.x===b.x&&a.y===b.y&&a.width===b.width&&a.z===b.z&&a.angle===b.angle&&a.sign===b.sign;
  });
}
function updateFinishScene(items,geo,enabled){
  if(!enabled||!items.length){finishScene=null;return;}
  if(sameFinishGeometry(items,geo))return;
  const nodes=items.map(p=>{
    const g=geo.get(p.id),cx=(g.left+g.right)/2,cy=(g.top+g.y)/2;
    return {id:p.id,g,cx,cy,living:!!catalog[p.kind].living,
      mass:Math.sqrt(Math.max(1,(g.right-g.left)*(g.y-g.top)))*(catalog[p.kind].support?1:.72)};
  });
  // Find the main planting group without pulling the light toward an empty
  // midpoint in a two-island arrangement. An isolated pebble carries little weight.
  let best=nodes[0],bestScore=-1;
  for(const n of nodes){
    let score=0;
    for(const other of nodes)score+=other.mass*Math.exp(-((n.cx-other.cx)**2/41600+(n.g.z-other.g.z)**2/.72));
    if(score>bestScore){bestScore=score;best=n;}
  }
  let weights=0,x=0,y=0;
  for(const n of nodes){
    const w=n.mass*Math.exp(-((best.cx-n.cx)**2/57000));weights+=w;x+=w*n.cx;y+=w*n.cy;
  }
  const focusX=x/weights,focusY=y/weights;
  const [dawn,day,dusk,night]=mood;
  const lightX=W*(.19*dawn+.80*day+.87*dusk+.50*night);
  const aimX=mix(focusX,lightX,.29+.51*night);
  const warmth=.53*day+.46*dawn+.85*dusk+.06*night;
  const scene={nodes,compact:compactAquarium.matches,byId:new Map(),grade:oldGrade,bed:activeBed,focusX,focusY,aimX,lightX,warmth};
  for(const n of nodes){
    let shade=0;
    for(const other of nodes){
      if(other===n)continue;
      const dx=n.cx-other.cx,reach=(other.g.right-other.g.left)*.48+28;
      const taller=smooth(-15,70,n.cy-other.g.top);
      const depth=Math.exp(-((n.g.z-other.g.z)**2/.064));
      shade+=Math.exp(-((dx/reach)**2))*taller*depth*(other.living?.17:.30);
    }
    n.shelter=1-Math.exp(-shade);
    n.keyLight=Math.exp(-(((n.cx-aimX)/310)**2+((n.cy-focusY)/220)**2));
    const row=sandRow(Math.min(1,n.g.z+.12)),x=clamp(Math.round(n.cx),1,W-2),y=clamp(Math.round(rowY(row,x)+3),1,H-2);
    const rgb=[0,0,0],pixels=basePixels.data;
    for(const offset of [-7,-3,0,3,7]){
      const i=4*(y*W+clamp(x+offset,0,W-1));
      for(let c=0;c<3;c++)rgb[c]+=pixels[i+c]/5;
    }
    n.bounce=rgb.map(v=>Math.round(v));
    scene.byId.set(n.id,n);
  }
  scene.plate=finishPlate(scene);
  finishScene=scene;
}
function finishPlate(scene){
  const s=.5,p=herbCanvas(W*s,H*s),c=p.getContext('2d');
  c.scale(s,s);
  const f=sandRow(1),l=f.left,r=f.right;
  c.save();c.beginPath();c.moveTo(l,269);c.bezierCurveTo(325,275,855,274,r,267);
  for(let i=64;i>=0;i--){const x=mix(l,r,i/64);c.lineTo(x,rowY(f,x)-1);}
  c.closePath();c.clip();
  const {aimX,focusY,lightX,warmth}=scene;
  // Low-frequency light scattered in the water picks up the open window or pendant.
  // It is feathered to zero before the glass and waterline.
  function wash(x,y,rx,ry,c0,c1){
    c.save();c.translate(x,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,c0);g.addColorStop(.52,c1);g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  }
  const glow=Math.round(139+67*warmth);
  wash(aimX,focusY-30,490,230,'rgba('+glow+',226,176,.095)','rgba(134,211,175,.050)');
  const openX=scene.focusX<600?845:355;
  wash(openX,475,350,175,'rgba(43,137,138,.105)','rgba(48,145,142,.046)');
  // The day window leaves broad, discontinuous bands of direct light. Surface
  // ripples already animate fine reflections; the much softer shafts stay quiet.
  const window=mood[1]+.54*mood[0]+.34*mood[2];
  if(window>.02){
    c.save();c.translate(aimX,focusY-44);c.rotate(mood[0]>.5?-.36:.38);
    for(const [offset,width,weight] of [[-97,29,.047],[3,54,.084],[91,18,.033]]){
      wash(offset,0,width,235,'rgba(214,237,179,'+window*weight+')','rgba(184,230,181,'+window*weight*.36+')');
    }
    c.restore();
  }
  // On narrow views the pane silhouette reads as a second plant, and a broad
  // bed shadow stacks over the individual feet. Let contact() ground them there.
  if(!scene.compact){
    // Soft silhouettes on the rear pane describe the gap between it and the decor.
    // Increasing distance from the pane spreads the shadow and rapidly reduces its strength.
    for(const n of scene.nodes){
      const g=n.g,z=g.z;
      if(z>.78)continue;
      c.save();
      const dist=9+39*z,dx=clamp((n.cx-lightX)/W,-.6,.6)*dist*1.8;
      c.translate(g.x+dx,g.y+dist*.34);c.rotate(g.angle);c.scale(g.sign,1);
      c.filter='blur('+((3+13*z)*s)+'px)';
      c.globalAlpha=(n.living?.34:.42)*(1-z)**1.8;
      c.drawImage(shadows[g.sprite],-(g.pivotX+.035)*g.width,-g.pivotY*g.height,g.width*1.07,g.height);
      c.restore();
    }
    c.save();clipSand(c);
    for(const n of scene.nodes){
      if(n.g.attached)continue;
      const g=n.g,span=Math.max(9,(g.right-g.left)*.52),dy=4+g.z*6;
      const alpha=(n.living?.16:.24)+n.shelter*.09;
      wash(n.cx,Math.min(g.bed,rowY(f,n.cx))-2,span,dy+span*.085,'rgba(29,40,29,'+alpha+')','rgba(47,49,32,'+alpha*.46+')');
    }
    c.restore();
  }
  c.restore();
  c.globalCompositeOperation='destination-in';
  const side=c.createLinearGradient(l,0,r,0);
  side.addColorStop(0,'transparent');side.addColorStop(.028,'black');side.addColorStop(.972,'black');side.addColorStop(1,'transparent');
  c.fillStyle=side;c.fillRect(0,0,W,H);
  const top=c.createLinearGradient(0,269,0,295);
  top.addColorStop(0,'transparent');top.addColorStop(1,'black');c.fillStyle=top;c.fillRect(0,0,W,H);
  return p;
}
// Apply only inside existing painted alpha. Tip light and root bounce follow the
// aquarium's world coordinates even on mirrored, rotated or individually flexing leaves.
function finishSurface(canvas,g,node,u0=0,v0=0,du=1,dv=1){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const scene=finishScene,far=1-g.z,exposure=node.keyLight,shade=node.shelter;
  const xDir=clamp((scene.lightX-node.cx)/430,-1,1);
  const top=worldPointOnSprite(g,u0,v0),height=Math.max(28,g.height);
  const start=.50+((top.x-node.cx)*xDir*.52-(top.y-node.cy))/height;
  const dx=(g.cos*xDir*.52-g.sin)*g.sign*g.width*du/(height*w);
  const dy=(-g.sin*xDir*.52-g.cos)*g.height*dv/(height*h);
  const data=c.getImageData(0,0,w,h),rgba=data.data,levels=48;
  const gain=new Float32Array(levels*3),lift=new Float32Array(levels*3);
  const water=[37,109,96],haze=.012+.085*far*far,bed=node.bounce;
  for(let level=0;level<levels;level++){
    const t=level/(levels-1),lit=smooth(.36,1,t)*(.32+.68*exposure),root=(1-smooth(.04,.55,t));
    const occlusion=(1-lit)*shade*.24+root*.10,glow=lit*(.13+.11*sun);
    const bounce=root*(.045+.035*sun);
    const balance=[.98+.08*scene.warmth,1.01,1.015-.08*scene.warmth];
    for(let k=0;k<3;k++){
      const idx=level*3+k;
      gain[idx]=(.96-occlusion+glow*balance[k])*(1-haze-bounce);
      lift[idx]=bed[k]*bounce*.89+water[k]*haze+lit*(k===0?5:k===1?5:3);
    }
  }
  for(let y=0;y<h;y++){
    let t=start+dy*(y+.5)+dx*.5;
    for(let x=0,i=y*w*4;x<w;x++,i+=4,t+=dx){
      if(!rgba[i+3])continue;
      const k=3*clamp(Math.round(t*(levels-1)),0,levels-1);
      rgba[i]=rgba[i]*gain[k]+lift[k];rgba[i+1]=rgba[i+1]*gain[k+1]+lift[k+1];rgba[i+2]=rgba[i+2]*gain[k+2]+lift[k+2];
    }
  }
  c.putImageData(data,0,0);
}
function finishKey(node){
  if(!node)return '';
  // Quantisation keeps minute movements from relighting every other specimen.
  return [Math.round(node.keyLight*20),Math.round(node.shelter*22),...node.bounce.map(v=>Math.round(v/7)),
    Math.round((finishScene.lightX-node.cx)/16)].join('/');
}
function finishedHardscape(material,p,g){
  const node=finishScene?.byId.get(p.id);if(!node)return material.canvas;
  const key=material.key+'|'+finishKey(node);
  if(material.finishKey!==key){
    const src=material.canvas,c=material.finished??=herbCanvas(src.width,src.height);
    c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);
    finishSurface(c,g,node);material.finishKey=key;
  }
  return material.finished;
}

// Reflectance masks are sampled from each painted fish. Only the lateral stripe
// or iridescent scales respond to the moving highlight; fins keep their pigment.
const fishMaterials=new WeakMap();
const fishOptics={
  tetra:{exposure:[.88,1,.84,.72],reflection:[.99,.55,.79,1.22],color:[81,241,255]},
  whiteCloud:{exposure:[1.02,1,.99,.87],reflection:[.93,.54,1.06,.77],color:[255,221,180]},
  guppy:{exposure:[.91,.99,1.03,.73],reflection:[.67,.62,1,.57],color:[123,231,216]}
};
function scaleReflectance(kind,u,v,r,g,b){
  const band=(center,width)=>Math.exp(-(((v-center)/width)**2));
  if(kind==='tetra'){
    const stripe=smooth(.19,.32,u)*(1-smooth(.84,.93,u));
    return stripe*band(.425+.20*(u-.5)**2+.12*smooth(.62,.82,u),.11)*smooth(5,66,b-r);
  }
  if(kind==='whiteCloud'){
    const stripe=smooth(.16,.24,u)*(1-smooth(.80,.91,u));
    return stripe*band(.51-.035*Math.sin((u-.25)*Math.PI),.068)*smooth(65,166,r);
  }
  const flank=smooth(.30,.43,u)*(1-smooth(.76,.88,u));
  return flank*band(.47,.18)*smooth(-9,37,g-r)*(.32+.68*smooth(43,146,g));
}
function fishMaterial(img,kind){
  const existing=fishMaterials.get(img);if(existing)return existing;
  const w=Math.min(236,img.naturalWidth),h=Math.round(w*img.naturalHeight/img.naturalWidth);
  const base=herbCanvas(w,h),c=base.getContext('2d');c.drawImage(img,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h),mask=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const k=y*w+x,i=k*4,a=pixels.data;
    // Remove transparent-matte compression specks before extracting either
    // pass. The outer sampling ring must be transparent under magnification.
    if(x===0||y===0||x===w-1||y===h-1||a[i+3]<=5){a.fill(0,i,i+4);continue;}
    mask[k]=scaleReflectance(kind,(x+.5)/w,(y+.5)/h,a[i],a[i+1],a[i+2])*a[i+3]/255;
  }
  const mat={w,h,pixels,mask,body:[],glint:herbCanvas(w,h),grade:null};
  fishMaterials.set(img,mat);return mat;
}
function fishInSceneLight(img,f){
  const {species:kind}=f,optics=fishOptics[kind],mat=fishMaterial(img,kind);
  const [dawn,day,dusk,night]=mood,ux=f.x/W,vy=f.y/H;
  const field=underwaterLight(ux,vy);
  const source=dawn*.20+day*.79+dusk*.86+night*.50;
  const direct=dawn*field.morning+day*(.31+.69*windowField(ux,vy))+dusk*field.evening+night*field.lamp;
  let cover=0;
  for(const n of finishScene?.nodes||[]){
    const g=n.g;
    if(f.x<g.left-18||f.x>g.right+18||f.y<g.top||f.y>g.bed||Math.abs(g.z-f.z)>.29)continue;
    const t=clamp((f.y-g.top)/Math.max(1,g.bed-g.top));
    cover=Math.max(cover,t*(1-Math.abs(g.z-f.z)/.30));
  }
  const exposure=optics.exposure.reduce((a,v,i)=>a+v*mood[i],0);
  const level=Math.round(clamp(exposure*(.36+.43*direct+.13*f.z+.10*day)-.22*cover)*22);
  if(!mat.body[level]){
    const {w,h,pixels}=mat,t=level/22,canvas=herbCanvas(w,h),c=canvas.getContext('2d');
    const frame=c.createImageData(w,h),a=frame.data,b=pixels.data;
    for(let i=0;i<a.length;i+=4){
      a[i]=b[i]*(.60+.46*t)+(1-t)*4;
      a[i+1]=b[i+1]*(.68+.38*t)+(1-t)*8;
      a[i+2]=b[i+2]*(.75+.29*t)+(1-t)*11;a[i+3]=b[i+3];
    }
    c.putImageData(frame,0,0);mat.body[level]=canvas;
  }
  if(mat.grade!==oldGrade){
    const c=mat.glint.getContext('2d'),frame=c.createImageData(mat.w,mat.h),a=frame.data;
    const neutral=optics.color;
    for(let k=0;k<mat.mask.length;k++){
      a[4*k]=neutral[0]+(kind==='whiteCloud'?7:28)*dusk-22*night;
      a[4*k+1]=neutral[1]+10*dawn-9*dusk;
      a[4*k+2]=neutral[2]+32*night-26*dusk;a[4*k+3]=255*mat.mask[k];
    }
    c.putImageData(frame,0,0);mat.grade=oldGrade;
  }
  const alignment=clamp(Math.abs(f.yaw)*.89+Math.sin(f.pitch)*Math.sign(source-ux)*.52+.10*Math.sin(f.phase*.30+f.roll));
  const glancing=smooth(.19,.89,alignment);
  const response=optics.reflection.reduce((a,v,i)=>a+v*mood[i],0);
  return {body:mat.body[level],mask:mat.glint,strength:clamp(response*direct*(1-.8*cover)*(.12+.88*glancing)),
    center:clamp(.53+f.yaw*(source-ux)*.45+f.pitch*.50+.11*Math.sin(f.phase*.36+f.roll),.26,.82)};
}

;
/* glass-algae */
'use strict';

// Each spot is fixed to the front pane in tank coordinates. A clean swipe
// changes its growth age, so an older colony can outlast the first pass.
const algaeHour=3600000,algaeKey=(globalThis.tankSavePrefix||'')+'aquarium.front-glass.1';
let wipingGlass=false,glassStart=0,glassTouched=false,algaeChanged=false;
let glassPlate=null,glassAtlas=null,glassBucket=-1,glassRedraw=true;
const glassSpots=[];
{
  let seed=193704;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  // Overlapping islands seed a broken band at each side. The first group
  // matures earliest, before the fine film reaches the centre.
  const beds=[
    [284,379,75,48,17,3],[245,426,63,41,9,12],[325,354,47,33,8,12],
    [130,505,47,69,10,42],[1021,402,66,81,12,63],[945,494,63,42,8,77]
  ];
  for(const [cx,cy,rx,ry,clusters,lag] of beds){
    for(let j=0;j<clusters;j++){
      const a=random()*2*Math.PI,r=Math.sqrt(random());
      const x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;
      const sx=8+random()*17,sy=7+random()*19,rotation=random()*Math.PI;
      const count=14+Math.floor(random()*28);
      for(let i=0;i<count;i++){
        const theta=random()*2*Math.PI,spread=Math.sqrt(-2*Math.log(Math.max(.012,random())))*.70;
        const u=sx*spread*Math.cos(theta),v=sy*spread*Math.sin(theta);
        const px=x+u*Math.cos(rotation)-v*Math.sin(rotation),py=y+u*Math.sin(rotation)+v*Math.cos(rotation);
        if(px<79||px>1120||py<292||py>605)continue;
        const size=.75+Math.pow(random(),2.35)*4.6;
        glassSpots.push({x:px,y:py,size,tile:Math.floor(random()*20),
          delay:lag+3*r+random()*19+spread*4,grow:16+random()*37,reset:0});
      }
    }
  }
}
// Keep the original spots first: their array positions also identify old wipes.
// Later, a fine continuous film bridges them and spreads across the front pane.
const pane={left:69,top:270,width:1062,height:388};
const cell=9,filmCols=Math.ceil(pane.width/cell)+1,filmRows=Math.ceil(pane.height/cell)+1;
const film=[],bins=new Map(),dirtyTiles=new Set(),tileSize=72,binSize=40;
let grainPlate=null;
function noiseAt(x,y){
  let h=Math.imul(x+71,374761393)+Math.imul(y+37,668265263);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
}
function velvet(x,y,pitch){
  const i=Math.floor(x/pitch),j=Math.floor(y/pitch);
  let u=x/pitch-i,v=y/pitch-j;
  u=u*u*(3-2*u);v=v*v*(3-2*v);
  const a=noiseAt(i,j),b=noiseAt(i+1,j),d=noiseAt(i,j+1),e=noiseAt(i+1,j+1);
  return (a+(b-a)*u)*(1-v)+(d+(e-d)*u)*v;
}
for(let j=0;j<filmRows;j++)for(let i=0;i<filmCols;i++){
  const x=pane.left+cell*i,y=pane.top+cell*j;
  const edge=Math.min(i,filmCols-i-1)/(filmCols*.5);
  const delay=30+73*edge+27*velvet(x,y,85);
  const spot={x,y,film:true,delay,grow:23+20*velvet(x+57,y,49),reset:0};
  film.push(spot);glassSpots.push(spot);
}
for(const s of glassSpots){
  const k=Math.floor(s.x/binSize)+64*Math.floor(s.y/binSize);
  if(!bins.has(k))bins.set(k,[]);
  bins.get(k).push(s);
}
function nearby(x0,y0,x1,y1,visit){
  for(let by=Math.floor(y0/binSize);by<=Math.floor(y1/binSize);by++){
    for(let bx=Math.floor(x0/binSize);bx<=Math.floor(x1/binSize);bx++){
      const group=bins.get(bx+by*64);if(group)for(const s of group)visit(s);
    }
  }
}
function dirtyGlass(s){
  const pad=s.film?cell+1:18;
  for(let y=Math.max(0,Math.floor((s.y-pad-pane.top)/tileSize));y<=Math.floor((s.y+pad-pane.top)/tileSize);y++)
    for(let x=Math.max(0,Math.floor((s.x-pad-pane.left)/tileSize));x<=Math.floor((s.x+pad-pane.left)/tileSize);x++)dirtyTiles.add(x+y*32);
}
function glassStrength(spot,now){
  return clamp(((now-(spot.reset||glassStart))/algaeHour-spot.delay)/spot.grow);
}
function mergeGlass(data,now){
  if(!data||data.v!==1||!Number.isFinite(data.start)||data.start<=0)return;
  const start=Math.min(now,data.start);
  if(start<glassStart){glassStart=start;glassRedraw=true;}
  for(const pair of Array.isArray(data.wiped)?data.wiped:[]){
    if(!Array.isArray(pair))continue;
    const [i,stamp]=pair,s=glassSpots[i];
    if(!Number.isInteger(i)||!s||!Number.isFinite(stamp))continue;
    const at=Math.min(now,stamp);
    if(at>Math.max(s.reset,glassStart)){s.reset=at;dirtyGlass(s);}
  }
}
function saveGlass(){
  if(careDemo||!algaeChanged)return;
  try{mergeGlass(JSON.parse(localStorage.getItem(algaeKey)),careNow());}catch{}
  try{
    const wiped=[];
    glassSpots.forEach((s,i)=>{if(s.reset>glassStart)wiped.push([i,Math.round(s.reset)]);});
    localStorage.setItem(algaeKey,JSON.stringify({v:1,start:glassStart,wiped}));
    algaeChanged=false;
  }catch{}
}
function loadGlass(){
  const now=careNow();
  glassStart=careDemo?now-150*algaeHour:now;
  if(!careDemo){
    let prior;try{prior=JSON.parse(localStorage.getItem(algaeKey));}catch{}
    mergeGlass(prior,now);
    if(!prior||prior.v!==1||!Number.isFinite(prior.start)||prior.start<=0){algaeChanged=true;saveGlass();}
  }
}
// Normalize into the axes of the actual blade. The broad phase uses the
// rotated bounds as well, including the tips of a vertical or diagonal edge.
function glassSweep(from,to,r,ry,angle){
  const cs=Math.cos(angle),sn=Math.sin(angle);
  const moveX=to.x-from.x,moveY=to.y-from.y;
  const dx=(cs*moveX+sn*moveY)/r,dy=(-sn*moveX+cs*moveY)/ry;
  const length=dx*dx+dy*dy;
  const padX=Math.hypot(r*cs,ry*sn),padY=Math.hypot(r*sn,ry*cs);
  function distance(x,y,endOnly=false){
    const ex=(cs*(x-to.x)+sn*(y-to.y))/r,ey=(-sn*(x-to.x)+cs*(y-to.y))/ry;
    const t=!endOnly&&length?clamp(-(ex*dx+ey*dy)/length):0;
    return Math.hypot(ex+dx*t,ey+dy*t);
  }
  return {distance,x0:Math.min(from.x,to.x)-padX,y0:Math.min(from.y,to.y)-padY,
    x1:Math.max(from.x,to.x)+padX,y1:Math.max(from.y,to.y)+padY};
}
function wipePane(from,to,r,pass,now,ry=r,power=.69,byHand=true,angle=0){
  const sweep=glassSweep(from,to,r,ry,angle);
  let changed=false;
  nearby(sweep.x0,sweep.y0,sweep.x1,sweep.y1,s=>{
    const d=sweep.distance(s.x,s.y);
    if(d>=1)return;
    const pressure=power*clamp((1-d)/.25),prior=pass.get(s)||0;
    if(pressure>prior+.001){
      const strength=glassStrength(s,now);
      if(strength>.001){
        const remaining=Math.max(0,strength-pressure+prior);
        s.reset=remaining>0?now-(s.delay+remaining*s.grow)*algaeHour:now;
        dirtyGlass(s);changed=true;
      }
      pass.set(s,pressure);
    }
  });
  for(const s of pass.keys())if(sweep.distance(s.x,s.y,true)>=1)pass.delete(s);
  if(changed){algaeChanged=true;if(byHand)glassTouched=true;}
  return changed;
}
function algaeAtlas(){
  const n=28,atlas=herbCanvas(5*n,4*n),g=atlas.getContext('2d'),im=g.createImageData(atlas.width,atlas.height);
  const tones=[[103,125,64],[124,145,77],[83,110,56],[141,151,84],[107,132,71]];
  for(let tile=0;tile<20;tile++){
    const [red,green,blue]=tones[tile%5],phase=tile*1.71;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const u=(x+.5-n/2)/(n*.46),v=(y+.5-n/2)/(n*.44),angle=Math.atan2(v,u);
      const edge=.83+.085*Math.sin(3*angle+phase)+.070*Math.sin(5*angle-phase)+.047*Math.cos(8*angle+phase);
      const noise=Math.sin((x+1)*78.233+(y+1)*39.425+tile*53.7)*43758.5453;
      const grain=noise-Math.floor(noise),d=Math.hypot(u,v);
      const alpha=clamp((edge-d)*5+.33*(grain-.5))*(.35+.65*grain);
      const m=17*(grain-.5)+5*Math.sin(7*u+phase)*Math.cos(9*v-phase);
      const i=4*((Math.floor(tile/5)*n+y)*atlas.width+tile%5*n+x);
      im.data[i]=red+m;im.data[i+1]=green+m;im.data[i+2]=blue+m*.7;im.data[i+3]=Math.round(alpha*235);
    }
  }
  g.putImageData(im,0,0);return atlas;
}
function grainTexture(){
  const w=Math.ceil(pane.width/2),h=Math.ceil(pane.height/2),g=herbCanvas(w,h).getContext('2d');
  const im=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const X=pane.left+2*x,Y=pane.top+2*y;
    const a=velvet(X,Y,57),b=velvet(X,Y,17),rough=velvet(X,Y,6),grain=noiseAt(x,y);
    const density=.45*a+.29*b+.20*rough+.06*grain;
    const edge=clamp(Math.min(x,w-1-x,y,h-1-y)/(3+5*b));
    const idx=4*(x+y*w);
    im.data[idx]=67+45*b+31*grain;im.data[idx+1]=89+38*b+25*grain;
    im.data[idx+2]=38+32*a+18*grain;
    im.data[idx+3]=Math.round(255*edge*clamp((density-.16)*1.35)*(.62+.38*grain));
  }
  g.putImageData(im,0,0);return g.canvas;
}
let filmOpacity=null;
function drawGlassAlgae(c,now){
  const bucket=Math.floor(now/120000);
  const full=!glassPlate||glassRedraw||bucket!==glassBucket;
  if(full||dirtyTiles.size){
    glassPlate??=herbCanvas(pane.width,pane.height);
    grainPlate??=grainTexture();filmOpacity??=herbCanvas(filmCols,filmRows);glassAtlas??=algaeAtlas();
    const g=glassPlate.getContext('2d'),fg=filmOpacity.getContext('2d');
    const cells=fg.createImageData(filmCols,filmRows);
    for(let i=0;i<film.length;i++)cells.data[i*4+3]=Math.round(255*glassStrength(film[i],now));
    fg.putImageData(cells,0,0);
    function region(x,y,w,h){
      g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.clearRect(x,y,w,h);
      g.drawImage(grainPlate,0,0,pane.width,pane.height);
      g.globalCompositeOperation='destination-in';g.drawImage(filmOpacity,-cell/2,-cell/2,filmCols*cell,filmRows*cell);
      g.globalCompositeOperation='source-over';
      nearby(pane.left+x-17,pane.top+y-17,pane.left+x+w+17,pane.top+y+h+17,s=>{
        if(s.film)return;
        const strength=glassStrength(s,now);if(strength<.015)return;
        const radius=s.size*(.48+.52*Math.sqrt(strength));
        const cx=s.x-pane.left,cy=s.y-pane.top;
        if(s.tile%4===0&&strength>.22){
          const halo=radius*2.8;g.globalAlpha=.13*strength;
          g.drawImage(glassAtlas,s.tile%5*28,Math.floor(s.tile/5)*28,28,28,cx-halo,cy-halo,halo*2,halo*2);
        }
        g.globalAlpha=(.13+.85*strength)*Math.min(1,strength*5);
        g.drawImage(glassAtlas,s.tile%5*28,Math.floor(s.tile/5)*28,28,28,cx-radius,cy-radius,2*radius,2*radius);
      });
      g.restore();
    }
    if(full)region(0,0,pane.width,pane.height);
    else for(const k of dirtyTiles)region((k%32)*tileSize,Math.floor(k/32)*tileSize,tileSize,tileSize);
    glassRedraw=false;dirtyTiles.clear();glassBucket=bucket;
  }
  c.drawImage(glassPlate,pane.left,pane.top);
}

;
/* glass-tools */
'use strict';

let scraper=null,restingBladeAngle=0,nerite=null,snailSavedAt=0;
const snailKey=(globalThis.tankSavePrefix||'')+'aquarium.zebra-nerite.1';
function bladePoint(p,touch,scale,bottom){
  // Keep the cutting edge clear of the pad of the finger, without losing
  // access to the bottom row in a tightly cropped camera.
  const lift=touch?Math.min(35*scale,Math.max(0,bottom-p.y)*.75):0;
  return {x:p.x,y:p.y-lift};
}
// A stroke is a line, not an arrow: reversing along that line keeps both
// the blade and the handle on their existing axis.
function bladeTurn(from,to){
  const d=to-from;
  return .5*Math.atan2(Math.sin(2*d),Math.cos(2*d));
}
function positionBlade(e){
  const c=camera(),touch=e.pointerType==='touch';
  const p=bladePoint(worldPoint(e),touch,worldPerPixel,c.top+c.h);
  scraper??={angle:restingBladeAngle,target:restingBladeAngle};
  Object.assign(scraper,p,{r:clamp((touch?32:30)*worldPerPixel,12,110)});
  return p;
}
// Each pointer (or assisted stroke) owns its own small sample of the glass it crossed.
const scrapeReadings=new WeakMap();
function wipeWithNotes(from,to,r,pass,now,ry,power,angle){
  let reading=scrapeReadings.get(pass);
  if(!reading){
    reading={spots:new Set(),initial:0,lifted:0,travel:0,dirtyTravel:0};
    scrapeReadings.set(pass,reading);
  }
  const contact=glassSweep(from,to,r,ry,angle),samples=[];
  nearby(contact.x0,contact.y0,contact.x1,contact.y1,s=>{
    if(contact.distance(s.x,s.y)>=1)return;
    const before=glassStrength(s,now);
    if(before<.025)return;
    if(!reading.spots.has(s)){reading.spots.add(s);reading.initial+=before;}
    samples.push([s,before]);
  });
  const changed=wipePane(from,to,r,pass,now,ry,power,true,angle);
  let lifted=0;
  if(changed)for(const [s,before] of samples)lifted+=Math.max(0,before-glassStrength(s,now));
  const distance=Math.hypot(to.x-from.x,to.y-from.y);
  reading.travel+=distance;reading.lifted+=lifted;
  if(lifted>.012)reading.dirtyTravel+=distance;
  if(distance&&typeof tankNotes!=='undefined')tankNotes.scraped(reading,false);
  return changed;
}
function finishScrapeNotes(pass,completed){
  const reading=scrapeReadings.get(pass);
  scrapeReadings.delete(pass);
  if(!completed||!reading)return false;
  if(typeof tankNotes!=='undefined')tankNotes.scraped(reading,true);
  const effective=reading.dirtyTravel>=16&&reading.lifted>=1&&reading.lifted>=reading.initial*.65;
  if(effective)globalThis.tankJournal?.record('clean');
  return effective;
}
function brushSegment(from,to,stroke,scale,now){
  const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy);
  if(!distance)return;
  const ax=to.x-stroke.anchor.x,ay=to.y-stroke.anchor.y;
  const travel=Math.hypot(ax,ay);
  if(travel>=4*scale){
    // Average doubled angles: samples on the return stroke reinforce the
    // outgoing direction. Small hooks at the reversal shouldn't steer the tool.
    const axis=2*Math.atan2(-ax,ay),weight=stroke.moving?1-Math.exp(-travel/(11*scale)):1;
    stroke.lineX=(stroke.lineX||0)*(1-weight)+weight*Math.cos(axis);
    stroke.lineY=(stroke.lineY||0)*(1-weight)+weight*Math.sin(axis);
    const turn=bladeTurn(scraper.target,.5*Math.atan2(stroke.lineY,stroke.lineX));
    if(Math.hypot(stroke.lineX,stroke.lineY)>.35&&Math.abs(turn)>.16)scraper.target+=turn;
    stroke.anchor=to;
    stroke.moving=true;
  }
  const steps=Math.max(1,Math.ceil(distance/(6*scale)));
  const follow=1-Math.exp(-distance/(steps*13*scale));
  const thickness=Math.max(4,scraper.r*.19);
  let previous=from;
  for(let i=1;i<=steps;i++){
    const end={x:from.x+dx*i/steps,y:from.y+dy*i/steps};
    const old=scraper.angle;
    scraper.angle+=bladeTurn(old,scraper.target)*follow;
    const angle=(old+scraper.angle)*.5;
    const removed=wipeWithNotes(previous,end,scraper.r,stroke.pass,now,thickness,.75,angle);
    if(removed&&typeof openingStep!=='undefined'&&openingStep==='wipe')wipedDistance+=Math.hypot(end.x-previous.x,end.y-previous.y);
    if(stroke.moving)touchGlassDwellers(previous,end,scraper.r,thickness,angle,now);
    previous=end;
  }
  restingBladeAngle=scraper.angle;
}
function scrapeTo(e,start=false){
  const p=positionBlade(e),now=careNow();
  if(start){
    drag.anchor=p;drag.moving=false;
    wipeWithNotes(p,p,scraper.r,drag.pass,now,Math.max(4,scraper.r*.19),.75,scraper.angle);
  }else brushSegment(drag.point,p,drag,worldPerPixel,now);
  drag.point=p;
}
function drawGlassScraper(c){
  if(!wipingGlass||!scraper)return;
  const im=sprites['glass-scraper'],w=scraper.r*2,h=w*im.naturalHeight/im.naturalWidth;
  c.save();c.translate(scraper.x,scraper.y);c.rotate(scraper.angle);c.globalAlpha=.91;
  c.drawImage(im,-w/2,-h*.026,w,h);c.restore();
}

const glassDwellers=new Set();
function setNerite(n){
  const previous=[...glassDwellers].find(a=>a.careId===n.careId);
  if(previous){Object.assign(previous,n);return previous;}
  glassDwellers.add(n);nerite??=n;return n;
}
function onGlass(n){return !n.release||(n.release.stage==='climb'&&n.release.elapsed>.55);}
function touchGlassDwellers(from,to,r,ry,angle,now){
  const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);
  if(!len)return;
  for(const n of glassDwellers){
    if(n.inNet||!onGlass(n))continue;
    // The centre and shoulder of the shell can both meet the metal edge.
    const body=n.contactRadius??8,sweep=glassSweep(from,to,r+body,ry+body,angle);
    const offset=body*.65;
    const ox=offset*Math.cos(n.angle),oy=offset*Math.sin(n.angle);
    if(Math.min(sweep.distance(n.x-ox,n.y-oy),sweep.distance(n.x+ox,n.y+oy))>=1)continue;
    const side=Math.cos(n.angle)<0?-1:1;
    n.z=.98;n.release={stage:'fall',elapsed:0,wallAngle:n.angle,side,roll:0,
      vx:25*dx/len+side*5,vy:9+12*dy/len,spin:dx/len*.9+side*.28};
    n.lastBite=null;n.pass?.clear();n.rest=0;n.at=now;
    saveSnail(now,n);
  }
}
function snailBedY(n){return rowY(sandRow(n.z??.98),n.x)-8;}
function advanceLooseSnail(n,dt){
  const m=n.release;
  m.elapsed+=dt;
  if(m.stage==='fall'&&m.landing){
    const t=landingPose(n,m.landing,m.elapsed);
    m.roll=m.side*.18*Math.sin(Math.PI*t);
    if(t>=1){m.stage='bed';m.elapsed=0;}
  }else if(m.stage==='fall'){
    m.vx*=Math.exp(-1.25*dt);m.vy=100+(m.vy-100)*Math.exp(-1.6*dt);
    n.x=clamp(n.x+m.vx*dt,90,1110);n.y+=m.vy*dt;
    m.roll+=m.spin*dt;m.spin*=Math.exp(-.85*dt);
    if(n.y>=snailBedY(n)){n.y=snailBedY(n);m.stage='bed';m.elapsed=0;}
  }else if(m.stage==='bed'){
    if(m.landing&&m.elapsed>5){
      const step=dt*Math.min(1,(m.elapsed-5)/1.5);
      n.z=Math.min(.98,n.z+.018*step);
      n.x=clamp(n.x+m.side*1.25*step,90,1110);n.phase+=step;
    }
    n.y=snailBedY(n);m.roll*=Math.exp(-4*dt);
    if(m.elapsed>=3.4&&(!m.landing||n.z>=.98)){m.stage='climb';m.elapsed=0;n.angle=-Math.PI/2+m.side*.20;}
  }else{
    // From the front lip the foot takes hold gradually. It starts a new
    // feeding track after climbing clear of the substrate.
    const step=3.9*dt*Math.min(1,m.elapsed);
    n.x=clamp(n.x+m.side*.19*step,90,1110);n.y=Math.min(n.y,snailBedY(n))-step;
    if(m.elapsed>=5){
      n.release=null;n.course=n.angle;n.chooseIn=2.8;n.rest=0;
    }
  }
}
function canStockSnail(now){return glassSpots.some(s=>!s.film&&glassStrength(s,now)>.35);}
function stockSnail(now){
  if(nerite||!canStockSnail(now))return false;
  const s=glassSpots.find(s=>!s.film&&glassStrength(s,now)>.35);
  createNerite('nerite-0',s.x,s.y,now);saveSnail(now);return true;
}
function createNerite(id,x,y,now){
  return setNerite({careId:id,species:'nerite',x,y,angle:.08,phase:0,distance:0,chooseIn:0,rest:0,course:.08,
    lastBite:null,pass:new Map(),at:now});
}
function snailSaveKey(id){return id==='nerite-0'?snailKey:snailKey+'.'+id;}
function saveSnail(now,only=null){
  if(careDemo)return;
  for(const n of only?[only]:glassDwellers){
    const {careId,x,y,z,angle,phase,distance,course,rest,release}=n;
    try{localStorage.setItem(snailSaveKey(careId),JSON.stringify({careId,x,y,z,angle,phase,distance,course,rest,release,at:now}));}catch{}
  }
  snailSavedAt=now;
}
function restoreSnail(value,expected='nerite-0'){
  if(!value||!['x','y','angle','at'].every(k=>Number.isFinite(value[k]))||(value.careId??'nerite-0')!==expected)return false;
  const old=[...glassDwellers].find(a=>a.careId===expected);
  if(old&&(old.inNet||value.at<old.at))return false;
  const m=value.release;
  const valid=m&&['fall','bed','climb'].includes(m.stage)&&['elapsed','wallAngle','side','roll','vx','vy','spin'].every(k=>Number.isFinite(m[k]));
  const release=valid?{...m}:null;
  if(release?.landing&&(!validLanding(release.landing)||!Number.isFinite(release.elapsed)))delete release.landing;
  setNerite({species:"nerite",careId:expected,x:clamp(value.x,90,1110),y:clamp(value.y,302,pane.top+pane.height),z:Number.isFinite(value.z)?clamp(value.z):.98,release,angle:value.angle,phase:Number(value.phase)||0,
    distance:Number(value.distance)||0,course:Number(value.course)||0,rest:clamp(Number(value.rest)||0,0,8),
    chooseIn:0,lastBite:null,pass:new Map(),at:value.at});
  return true;
}
function steerSnail(n,now){
  let best=-Infinity;
  for(const shift of [-1.4,-.85,-.43,0,.43,.85,1.4]){
    const a=n.angle+shift,x=n.x+32*Math.cos(a),y=n.y+32*Math.sin(a);
    const i=clamp(Math.round((x-pane.left)/cell),0,filmCols-1),j=clamp(Math.round((y-pane.top)/cell),0,filmRows-1);
    let meal=glassStrength(film[i+j*filmCols],now);
    nearby(x-10,y-10,x+10,y+10,s=>{
      if(!s.film&&Math.hypot(s.x-x,s.y-y)<11)meal+=.045*glassStrength(s,now);
    });
    const margin=Math.min(x-91,1108-x,y-302,615-y);
    const score=meal-.09*Math.abs(shift)+.16*Math.cos(n.distance*.032+shift*2.8)+Math.min(0,margin)*.1;
    if(score>best){best=score;n.course=a;}
  }
  n.chooseIn=3.5;
}
function crawlSnail(dt,now,n=nerite){
  if(!n||n.inNet)return;
  n.at=now;
  if(n.release){advanceLooseSnail(n,dt);return;}
  if(n.rest>0){n.rest=Math.max(0,n.rest-dt);return;}
  n.chooseIn-=dt;if(n.chooseIn<=0)steerSnail(n,now);
  const turn=Math.atan2(Math.sin(n.course-n.angle),Math.cos(n.course-n.angle));
  n.angle+=clamp(turn,-.37*dt,.37*dt);
  n.phase+=dt*1.8;
  const stride=dt*(2.55+.56*Math.sin(n.phase));
  n.x=clamp(n.x+Math.cos(n.angle)*stride,90,1110);n.y=clamp(n.y+Math.sin(n.angle)*stride,302,snailBedY(n));
  const before=n.distance;n.distance+=stride;
  if(Math.floor(before/67)!==Math.floor(n.distance/67))n.rest=2.2+.9*Math.sin(n.phase);
  const nose={x:n.x+10*Math.cos(n.angle),y:n.y+10*Math.sin(n.angle)};
  if(!n.lastBite||Math.hypot(nose.x-n.lastBite.x,nose.y-n.lastBite.y)>1.8){
    wipePane(n.lastBite||nose,nose,6.8,n.pass,now,6,.86,false);n.lastBite=nose;
  }
}
function resumeSnail(now,n=nerite){
  if(!n||n.inNet)return;
  let gap=Math.max(0,(now-n.at)/1000);
  // Falling and righting follow wall time even if the tab is suspended.
  while(n.release&&gap>0){
    const step=Math.min(.1,gap);crawlSnail(step,now,n);gap-=step;
  }
  // Long absences include many rests. Bound catch-up to keep reopening fast.
  const active=Math.min(600,gap*.012);
  for(let elapsed=0;elapsed<active;elapsed+=2)crawlSnail(Math.min(2,active-elapsed),now,n);
  n.at=now;
}
function loadSnail(now){
  if(careDemo){
    stockSnail(now);
    if(nerite){for(let i=0;i<22;i++)crawlSnail(.5,now);}
    return;
  }
  try{restoreSnail(JSON.parse(localStorage.getItem(snailKey)));}catch{}
  resumeSnail(now);
}
function drawSnail(c,n=nerite){
  if(!n)return;
  const im=sprites['zebra-nerite'],w=32,h=w*im.naturalHeight/im.naturalWidth;
  const m=n.release;
  const sideView=!m?0:m.stage==='fall'?(m.landing?1:clamp(m.elapsed/.48)):m.stage==='bed'?1:1-clamp(m.elapsed/1.15);
  c.save();c.translate(n.x,n.y);
  if(sideView>0){
    const gap=Math.max(0,snailBedY(n)-n.y),contact=clamp(1-gap/28)*sideView;
    if(contact>0&&!n.inNet){
      c.save();c.translate(0,gap+8);c.scale(1,.18);
      const shadow=c.createRadialGradient(0,0,0,0,0,14);
      shadow.addColorStop(0,'rgba(44,35,19,'+(.27*contact)+')');shadow.addColorStop(1,'rgba(44,35,19,0)');
      c.fillStyle=shadow;c.fillRect(-14,-14,28,28);c.restore();
    }
    const shell=sprites['nerite-side'],sideW=30,sideH=sideW*shell.naturalHeight/shell.naturalWidth;
    c.save();c.rotate(m.roll);c.scale(m.side,1);c.globalAlpha=sideView*.96;
    c.drawImage(shell,-sideW/2,8-sideH,sideW,sideH);c.restore();
  }
  if(sideView>=1){c.restore();return;}
  c.rotate(m?.stage==='fall'?m.wallAngle:n.angle);
  // Only the exposed foot and mouth stretch forward. The shell keeps its size.
  const edge=Math.round(im.naturalWidth*.72),base=w*edge/im.naturalWidth;
  const stretch=n.rest>0?-.95:.40*Math.sin(n.phase)+.21*Math.sin(n.phase*2.1);
  c.globalAlpha=.94*(1-sideView);
  c.drawImage(im,0,0,edge,im.naturalHeight,-w*.5,-h*.5,base+.1,h);
  c.drawImage(im,edge,0,im.naturalWidth-edge,im.naturalHeight,base-w*.5,-h*.5,w-base+stretch,h);
  c.restore();
}

;
/* care */
'use strict';

const careDemo=new URLSearchParams(location.search).get('care')==='trial';
const careKey=(globalThis.tankSavePrefix||'')+'aquarium.care.1';
const residue=[],drawnIn=[];
let demoOffset=0,hiddenAt=null;
function careNow(){return Date.now()+demoOffset;}
let siphoning=false,siphonTip=null,turbidity=0,organicLoad=0,careTime=Date.now(),careDirty=false;
let waterChange=null,waterDrop=0,lastExchange=false;
const fineFilterMs=24000;
let filterUntil=0;
function startFineFilter(){
  const now=careNow();advanceCare(now);
  if(filterUntil>now||turbidity<.045)return false;
  filterUntil=now+fineFilterMs;careDirty=true;saveCare();return true;
}
let recentExchanges=0,lastExchangeAt=0,lastInlet=860;
function exchangeCount(now){
  return recentExchanges*Math.exp(-Math.max(0,now-lastExchangeAt)/115000);
}
function fishUnease(f){
  const load=exchangeCount(careNow())+(waterChange?1:0);
  const sensitivity=f.species==='tetra'?1:f.species==='whiteCloud'?.91:.74;
  return clamp((load-1.20)*.76)*sensitivity;
}
const exchangeShare=.25,exchangeDepth=(floor-surface)*exchangeShare;
function startWaterChange(x){
  if(waterChange)return;
  for(const f of fish){
    f.inspect=null;f.look=null;f.depart=null;f.target=null;f.nextGoal=time;
    f.trip=null;
  }
  const row=sandRow(.81);
  let tipX=x;
  // Leave space for both edges of the bell on the visible sand.
  for(let i=0;i<27;i++){
    const candidate=x+Math.ceil(i/2)*9*(i%2?-1:1);
    if(candidate<row.left+12||candidate>row.right-12)continue;
    const y=rowY(row,candidate)-4;
    const blocked=bedSolids.some(({p,g})=>candidate+12>=g.left&&candidate-12<=g.right&&
      g.top<=y+4&&g.bed+5>=y-15&&[-10,0,10].some(dx=>[-13,2].some(dy=>hits(p,g,{x:candidate+dx,y:y+dy}))));
    if(!blocked){tipX=candidate;break;}
  }
  waterChange={stage:'drain',elapsed:0,x,tipX,tipY:rowY(row,tipX)-4,endX:tipX,endY:surface+12,waveAt:0};lastExchange=false;
}
function startRefill(){
  if(waterChange?.stage!=='low')return;
  waterChange.stage='fill';waterChange.elapsed=0;waterChange.waveAt=.85;
}
// Commit dilution only once, when the replacement water has entered the tank.
// Leaving mid-animation keeps the previously saved, complete aquarium.
function stepWaterChange(dt){
  if(!waterChange||waterChange.stage==='low')return false;
  const w=waterChange,fill=w.stage==='fill';
  w.elapsed+=dt;
  const u=clamp(fill?(w.elapsed-.85)/4.15:w.elapsed/3.8),t=u*u*(3-2*u);
  waterDrop=exchangeDepth*(fill?1-t:t);
  const lift=fill?clamp(w.elapsed/.85):0,ease=lift*lift*(3-2*lift);
  const x=mix(w.tipX,w.x-5,ease),y=mix(w.tipY,surface+waterDrop-12,ease);
  w.endX=approach(w.endX,x,9,dt);w.endY=approach(w.endY,y,fill?11:6,dt);
  if(fill&&w.elapsed>w.waveAt&&u<.98){
    ripples.push({x:w.x+2*Math.sin(time*4),y:surface-H*.009,age:0,strength:.48*Math.sin(Math.PI*u)**.55});
    w.waveAt=w.elapsed+.43;
  }
  if(u<1)return false;
  if(!fill){w.stage='low';w.elapsed=0;return true;}
  advanceCare(careNow());
  organicLoad*=1-exchangeShare;turbidity*=1-exchangeShare;
  const now=careNow();
  recentExchanges=Math.min(4,exchangeCount(now)+1);lastExchangeAt=now;lastInlet=w.x;
  waterChange=null;waterDrop=0;lastExchange=true;careDirty=true;saveCare();
  return true;
}
function waterReading(){
  if(turbidity>.24)return '水体明显浑浊';
  if(turbidity>.095)return '水略浑，远处的草叶开始发蒙';
  if(organicLoad>1.15)return '水面清透，水中仍有残饵分解物';
  return '水体清透';
}
const digestHours=9,waterHours=1.2,staleMinutes=12;
const softeningMs=staleMinutes*60000,halfLifeMs=2*3600000;
function remainingFood(p,at){
  const age=at-p.arrived;
  if(age<0||age>=softeningMs+4*halfLifeMs)return 0;
  return p.mass*2**(-Math.max(0,age-softeningMs)/halfLifeMs);
}
function hunger(f){return clamp((.90-f.fullness)/.72);}
function catchRadius(f){return 45+930*hunger(f)**1.65;}
function floorPoint(p){
  const row=sandRow(p.z),x=clamp(p.x,row.left+2,row.right-2);
  return {x,y:rowY(row,x)-1.1};
}
let bedSolids=[];
function rememberBedSolids(items,geo){
  bedSolids=items.filter(p=>!catalog[p.kind].living).map(p=>({p,g:geo.get(p.id)}));
}
function coveredSand(x,z){
  const y=rowY(sandRow(z),x)-1.1;
  return bedSolids.some(({p,g})=>Math.abs(g.z-z)<.19&&x>=g.left-2&&x<=g.right+2&&
    y>=g.top&&y<=g.bed+3&&hits(p,g,{x,y}));
}
function openLandingX(p){
  if(!coveredSand(p.x,p.z))return p.x;
  const row=sandRow(p.z),sign=p.drift<0?-1:1;
  for(let offset=2;offset<=24;offset+=2)for(const direction of [sign,-sign]){
    const x=p.x+direction*offset;
    if(x>row.left+2&&x<row.right-2&&!coveredSand(x,p.z))return x;
  }
  return p.x;
}
function dropRemnant(p,arrived=careTime){
  // A bounded number of visible deposits can hold multiple flakes.
  const limit=96;
  let deposit=null;
  if(residue.length>=limit){
    const at=floorPoint(p);
    let best=null,distance=Infinity;
    for(const r of residue){
      const pt=floorPoint(r),d=Math.hypot(pt.x-at.x,pt.y-at.y);
      if(d<distance){distance=d;best=r;}
    }
    best.mass=remainingFood(best,arrived)+(p.mass||1);best.arrived=arrived;
  }else{
    deposit={x:p.x,z:p.z,phase:p.phase,tone:p.tone,scale:p.scale,mass:p.mass||1,arrived};
    residue.push(deposit);
  }
  careDirty=true;
  return deposit;
}
function advanceCare(now){
  // Complete a filter cycle at its actual end, including when the tab was
  // asleep. Remaining time then follows the ordinary waste/clarity model.
  if(filterUntil>careTime&&filterUntil<now)advanceCare(filterUntil);
  const dt=Math.max(0,(now-careTime)/1000);
  if(!dt)return;
  for(const f of fish)f.fullness=clamp(f.fullness-dt/(digestHours*3600));
  // Age the flake before it contributes to suspended matter. Integrate in
  // bounded steps after a long absence so the result also works on reopening.
  // An old deposit can release material for about eight hours. After a long
  // absence integrate that interval finely; the unpolluted tail can relax at once.
  const activeSeconds=Math.min(dt,72*3600);
  const steps=Math.max(1,Math.ceil(activeSeconds/300)),seconds=activeSeconds/steps;
  function recover(duration){
    organicLoad*=Math.exp(-duration/(8*3600));
    turbidity=approach(turbidity,1-Math.exp(-organicLoad/22),1/(waterHours*3600),duration);
  }
  const recent=dt-activeSeconds;
  const start=careTime+activeSeconds*1000;
  for(let i=0;i<steps;i++){
    const a=careTime+i*seconds*1000,b=a+seconds*1000;
    let solids=0,released=0;
    for(const p of residue){
      if(b<p.arrived)continue;
      const before=a<p.arrived?p.mass:remainingFood(p,a),after=remainingFood(p,b);
      released+=Math.max(0,before-after);
      solids+=after*clamp((b-p.arrived)/softeningMs);
    }
    organicLoad=organicLoad*Math.exp(-seconds/(8*3600))+released;
    const equilibrium=1-Math.exp(-solids/16-organicLoad/22);
    turbidity=approach(turbidity,equilibrium,1/(waterHours*3600),seconds);
  }
  if(recent>0){
    for(const p of residue)if(p.arrived>start&&p.arrived<=now)
      organicLoad+=Math.max(0,p.mass-remainingFood(p,now))*Math.exp(-Math.max(0,now-p.arrived-4*halfLifeMs)/(8*3600000));
    recover(recent);
  }
  for(let i=residue.length-1;i>=0;i--)if(now>=residue[i].arrived&&!remainingFood(residue[i],now))residue.splice(i,1);
  if(filterUntil>careTime){
    const filtering=Math.min(now,filterUntil)-careTime;
    turbidity*=Math.exp(-3.42*filtering/fineFilterMs);
    if(now>=filterUntil){filterUntil=0;careDirty=true;}
  }
  careTime=now;
}
function saveCare(){
  if(careDemo){careDirty=false;return;}
  if(!careDirty)return;
  const now=Date.now();advanceCare(now);
  try{
    localStorage.setItem(careKey,JSON.stringify({at:now,water:turbidity,organics:organicLoad,filterUntil,
      forage:typeof packForage==='function'?packForage(now):undefined,
      changes:{count:recentExchanges,at:lastExchangeAt,x:lastInlet},
      attention:fish.filter(f=>f.cue).map(f=>[f.careId,f.cue,f.examined??-1]),fish:fish.map(f=>[f.careId,f.fullness]),bed:residue,falling:food.filter(p=>!p.taken)}));
    careDirty=false;
  }catch{}
}
function loadCare(){
  const now=Date.now();
  for(const f of fish){
    f.careId??=f.species+'-'+(f.schoolIndex??0);
    f.fullness??=f.species==='guppy'?.34:f.species==='whiteCloud'?.48:.49+.13*(f.schoolIndex%3);
  }
  if(careDemo){
    for(let i=0;i<7;i++)dropRemnant({x:362+i*12,z:.68+(i%4)*.065,phase:1+i,tone:i/7,scale:.93},now-19*60000);
    const minnow=fish.find(f=>f.species==='whiteCloud');if(minnow)minnow.fullness=.98;
    const cloudy=new URLSearchParams(location.search).get('water')==='cloudy';
    turbidity=cloudy?.61:.025;organicLoad=cloudy?3.2:0;return;
  }
  let s;try{s=JSON.parse(localStorage.getItem(careKey));}catch{}
  if(!s||!Number.isFinite(s.at))return;
  if(typeof restoreForage==='function')restoreForage(s.forage,Math.max(0,now-s.at));
  careTime=Math.min(now,s.at);turbidity=Number.isFinite(s.water)?clamp(s.water):0;
  organicLoad=Number.isFinite(s.organics)?Math.max(0,s.organics):0;
  const levels=new Map(Array.isArray(s.fish)?s.fish.filter(v=>Array.isArray(v)&&v.length===2):[]);
  for(const f of fish)if(Number.isFinite(levels.get(f.careId)))f.fullness=clamp(levels.get(f.careId));
  if(Number.isFinite(s.filterUntil)&&s.filterUntil>careTime)filterUntil=Math.min(careTime+fineFilterMs,s.filterUntil);
  const changes=s.changes;
  if(changes&&Number.isFinite(changes.count)&&Number.isFinite(changes.at)&&Number.isFinite(changes.x)){
    recentExchanges=clamp(changes.count,0,4);lastExchangeAt=Math.min(now,changes.at);lastInlet=clamp(changes.x,left,right);
  }
  for(const row of Array.isArray(s.attention)?s.attention:[]){
    if(!Array.isArray(row))continue;
    const [id,cue,examined]=row,f=fish.find(v=>v.careId===id);
    if(!f||!cue||!['interest','at','batch','fatigue'].every(k=>Number.isFinite(cue[k])))continue;
    f.cue={interest:clamp(cue.interest),fatigue:clamp(cue.fatigue),batch:cue.batch,at:Math.min(now,cue.at)};
    f.examined=Number.isFinite(examined)?examined:-1;feedBatch=Math.max(feedBatch,cue.batch);
  }
  const valid=p=>p&&['x','z','phase','scale','tone'].every(k=>Number.isFinite(p[k]))&&p.z>=0&&p.z<=1&&p.scale>0;
  for(const p of (Array.isArray(s.bed)?s.bed:[]).slice(0,96))if(valid(p)&&Number.isFinite(p.arrived)&&Number.isFinite(p.mass)&&p.mass>0)dropRemnant(p,Math.min(careTime,p.arrived));
  const gap=(now-careTime)/1000;
  for(const p of (Array.isArray(s.falling)?s.falling:[]).slice(0,18)){
    if(!valid(p)||!['y','settle','age','soak','drift','velocityY'].every(k=>Number.isFinite(p[k]))||p.settle<=0||!Array.isArray(p.shape)||p.shape.length!==6||!p.shape.every(Number.isFinite))continue;
    if(!resumeFlake(p,gap,careTime))food.push(p);
  }
  advanceCare(now);careDirty=false;
}
function resumeFlake(p,seconds,start){
  const soak=Math.max(0,p.soak-p.age),remaining=Math.max(0,(floorPoint(p).y-p.y)/p.settle)+soak;
  if(seconds>=remaining){dropRemnant(p,start+remaining*1000);return true;}
  p.y=Math.min(floorPoint(p).y,p.y+p.settle*Math.max(0,seconds-soak));p.age+=seconds;
  if(p.y>=surface)p.wet=true;
  return false;
}
function resumeCare(){
  if(hiddenAt===null)return;
  const now=careNow(),elapsed=Math.max(0,(now-hiddenAt)/1000);
  for(let i=food.length-1;i>=0;i--)if(resumeFlake(food[i],elapsed,hiddenAt))food.splice(i,1);
  advanceCare(now);hiddenAt=null;
}
function vacuumStroke(from,to){
  const before=residue.length;
  const r=clamp(29*worldPerPixel,15,100);
  const dx=to.x-from.x,dy=to.y-from.y,dd=dx*dx+dy*dy;
  for(let i=residue.length-1;i>=0;i--){
    const p=residue[i],q=floorPoint(p);
    const t=dd?clamp(((q.x-from.x)*dx+(q.y-from.y)*dy)/dd):1;
    const ex=from.x+dx*t,ey=from.y+dy*t;
    if(Math.hypot(q.x-ex,q.y-ey)>r)continue;
    drawnIn.push({...p,x:q.x,y:q.y,endX:ex,endY:ey,age:0});residue.splice(i,1);careDirty=true;
  }
  if(before>residue.length&&typeof tankNotes!=='undefined')tankNotes.vacuumed(before-residue.length);
  siphonTip=to;
}
function drawRemnant(p,c,x,y,fade=1){
  const stale=clamp((careTime-p.arrived)/(staleMinutes*60000));
  const fraction=clamp(remainingFood(p,careTime)/p.mass);
  if(fraction<=0)return;
  const r=Math.max(2.9,worldPerPixel*2.8)*p.scale*Math.min(1.45,Math.sqrt(p.mass))*(.38+.62*Math.sqrt(fraction));
  c.save();c.translate(x,y);c.rotate(.29*Math.sin(p.phase));c.scale(r,r*.55);
  c.globalAlpha=fade*(.32+.68*fraction);
  c.fillStyle='rgba(44,34,23,.24)';c.beginPath();c.ellipse(.09,.24,.96,.40,0,0,Math.PI*2);c.fill();
  c.fillStyle=stale>.55?'#977656':'#be8d59';
  c.beginPath();c.moveTo(-.97,-.22);c.quadraticCurveTo(-.63,-.84,.04,-.64);c.lineTo(.79,-.48);c.lineTo(.93,.13);
  c.quadraticCurveTo(.33,.73,-.53,.34);c.closePath();c.fill();
  c.fillStyle=activeBed.style==='soil'?'#d5b389':'#8e6c4d';
  c.beginPath();c.ellipse(-.24,-.35,.49,.115,-.15,0,Math.PI*2);c.fill();
  if(stale>.1){
    c.globalAlpha*=stale*.75;
    for(const [dx,dy] of [[1,.15],[-.95,-.48]]){c.beginPath();c.ellipse(dx,dy,.21,.15,p.phase,0,Math.PI*2);c.fill();}
  }
  c.restore();
}
// Across the visible top of the bed the water path shortens towards the
// viewer. A rear grain and the water just above it have the same transmission.
function waterPathAtBed(y,rear,mid,front){
  const z=y<mid?.5*clamp((y-rear)/Math.max(1,mid-rear)):
    .5+.5*clamp((y-mid)/Math.max(1,front-mid));
  return 1-z*z*(3-2*z);
}
let clarityPlate=null,clarityBed=null,clarityLight=-1;
function waterClarityPlate(){
  const daylight=Math.round(12*sun);
  if(clarityPlate&&clarityBed===activeBed&&clarityLight===daylight)return clarityPlate;
  // Only this small, world-registered texture is recomputed after sculpting.
  // The same field serves every camera, turbidity and water level.
  const scale=3,w=Math.ceil(W/scale),h=Math.ceil((H-surface)/scale);
  const plate=clarityPlate??=herbCanvas(w,h),c=plate.getContext('2d'),im=c.createImageData(w,h);
  const rear=sandRow(0),mid=sandRow(.5),front=sandRow(1);
  const light=daylight/12,r=119+34*light,g=145+14*light,b=140-23*light;
  for(let ix=0;ix<w;ix++){
    const x=(ix+.5)*scale;
    const side=clamp(Math.min((x-front.left)/(rear.left-front.left),(front.right-x)/(front.right-rear.right)));
    if(side<=0)continue;
    const yr=rowY(rear,x),ym=rowY(mid,x),yf=rowY(front,x);
    for(let iy=0;iy<h;iy++){
      const y=surface+(iy+.5)*scale;
      if(y>=yf)break;
      const depth=Math.min(side,waterPathAtBed(y,yr,ym,yf));
      const below=clamp((y-surface-8)/167);
      const vertical=below*below*(3-2*below);
      const i=4*(iy*w+ix);
      im.data[i]=r;im.data[i+1]=g;im.data[i+2]=b;im.data[i+3]=255*vertical*depth;
    }
  }
  c.putImageData(im,0,0);clarityBed=activeBed;clarityLight=daylight;
  return plate;
}
function drawWaterClarity(c,midwater=false){
  if(turbidity<.006)return;
  const replaced=waterChange?.stage==='fill'?exchangeShare*(1-waterDrop/exchangeDepth):0;
  const density=1-Math.exp(-3.4*turbidity*(1-replaced)),plate=waterClarityPlate();
  c.save();c.globalAlpha=density*(midwater?.34:.81);
  if(waterDrop<.05)c.drawImage(plate,0,surface,W,H-surface);
  else{
    // Compress only the uniform upper water during a change. The lower fade
    // stays registered to the bank and its pebbles throughout the drawdown.
    const rows=Math.round(plate.height*.42),split=(H-surface)*rows/plate.height;
    c.drawImage(plate,0,0,plate.width,rows,0,surface+waterDrop,W,split-waterDrop);
    c.drawImage(plate,0,rows,plate.width,plate.height-rows,0,surface+split,W,H-surface-split);
  }
  c.restore();
}
// The clear wall bends the scene behind it. Capture only the local area of
// water and glass so the highlights follow the current light and aquascape.
function hoseRefraction(c,w,leftX,top,rightX,bottom){
  const t=c.getTransform();
  const x=Math.floor(Math.max(leftX,-t.e/t.a)),y=Math.floor(Math.max(top,-t.f/t.d));
  const width=Math.ceil(Math.min(rightX,(c.canvas.width-t.e)/t.a)-x);
  const height=Math.ceil(Math.min(bottom,(c.canvas.height-t.f)/t.d)-y);
  if(width<1||height<1)return null;
  const tile=w.optics??=herbCanvas(width,height);
  if(tile.width<width)tile.width=Math.ceil(width/32)*32;
  if(tile.height<height)tile.height=Math.ceil(height/32)*32;
  const g=tile.getContext('2d');
  g.clearRect(0,0,tile.width,tile.height);
  g.drawImage(c.canvas,t.a*x+t.e,t.d*y+t.f,width*t.a,height*t.d,0,0,width,height);
  const pattern=c.createPattern(tile,'no-repeat');
  pattern.setTransform(new DOMMatrix().translate(x+2.8,y-.85));
  return pattern;
}
let hoseSkin=null;
function siphonSkin(){
  if(hoseSkin)return hoseSkin;
  const photo=sprites['siphon-bell'],w=photo.naturalWidth,h=photo.naturalHeight;
  hoseSkin=herbCanvas(w,h);const g=hoseSkin.getContext('2d');
  g.drawImage(photo,0,0);
  // The submerged acrylic transmits more of the tank than the dry studio cutout.
  const fade=g.createLinearGradient(0,0,w,0);
  for(const [u,a] of [[0,0],[.08,.15],[.21,.72],[.5,.92],[.80,.74],[.94,.20],[1,0]]){
    fade.addColorStop(u,'rgba(0,0,0,'+a+')');
  }
  g.globalCompositeOperation='destination-out';g.fillStyle=fade;g.fillRect(0,h*.365,w,h*.60);
  return hoseSkin;
}
function drawChangeHose(c){
  const w=waterChange;if(!w)return;
  const level=surface+waterDrop-7,y=w.endY;
  const length=59,slant=clamp((w.endX-w.x)*.10-5,-14,10);
  const neckX=w.endX-slant,neckY=y-length;
  const opacity=w.stage==='drain'?clamp(w.elapsed*3):w.stage==='fill'?clamp((5-w.elapsed)*3):1;
  const mount=right+9;
  // The outer length hangs outside the actual right pane; the submerged one
  // carries its slack toward the movable intake, and lifts with it on refill.
  const hose=new Path2D();
  hose.moveTo(right+59,H+9);
  hose.bezierCurveTo(right+44,655,right+70,335,right+42,246);
  hose.bezierCurveTo(right+34,217,right+17,211,mount,232);
  const span=neckX-mount,drop=neckY-232;
  hose.bezierCurveTo(mount+span*.12,242+Math.max(0,drop)*.23,
    neckX-slant*.95,neckY-Math.min(63,Math.max(0,drop)*.37),neckX,neckY);
  const axis=new DOMMatrix().translate(neckX,neckY).rotate(-Math.atan2(slant,length)*180/Math.PI);
  const h=Math.hypot(length,slant),bell=new Path2D(),local=new Path2D();
  local.moveTo(-3.3,h*.26);local.lineTo(-6.6,h*.37);local.lineTo(-6.9,h);
  local.quadraticCurveTo(0,h+1.5,6.9,h);local.lineTo(6.6,h*.37);local.lineTo(3.3,h*.26);local.closePath();
  bell.addPath(local,axis);
  const refracted=hoseRefraction(c,w,Math.min(neckX,w.endX)-19,Math.min(209,neckY)-8,right+78,H);
  c.save();c.lineJoin='round';c.lineCap='round';
  if(refracted){
    c.globalAlpha=opacity*.72;c.strokeStyle=refracted;c.lineWidth=6.5;c.stroke(hose);
    c.fillStyle=refracted;c.fill(bell);
  }
  const light=.42+.58*sun,ambient=.58+.42*sun;
  c.globalAlpha=opacity*ambient;
  c.globalCompositeOperation='multiply';c.strokeStyle='rgba(87,82,65,.33)';c.lineWidth=7;c.stroke(hose);
  // The cylindrical edge catches soft window light only along portions of the curve.
  const sheen=c.createLinearGradient(0,209,0,Math.max(320,y));
  for(const [pos,alpha] of [[0,.43],[.07,.18],[.19,.27],[.35,.035],[.51,.18],[.62,.055],[.81,.13],[1,.035]]){
    sheen.addColorStop(pos,'rgba(246,234,202,'+(alpha*light)+')');
  }
  c.globalCompositeOperation='screen';c.strokeStyle=sheen;c.lineWidth=4.8;c.stroke(hose);
  c.save();c.translate(-1.9,-.4);c.lineWidth=1.25;c.stroke(hose);c.restore();
  // Small patches pick up the surface and lamp; never trace the entire hose.
  const catchLight=c.createLinearGradient(0,level-20,0,level+85);
  for(const [u,a] of [[0,0],[.17,.27],[.28,.07],[.51,.14],[1,0]]){
    catchLight.addColorStop(u,'rgba(223,228,211,'+a*(.64+.55*lamp)+')');
  }
  c.save();c.translate(-2.2,0);c.lineWidth=1.2;c.strokeStyle=catchLight;c.stroke(hose);c.restore();
  c.globalCompositeOperation='source-over';
  c.save();c.translate(neckX,neckY);c.rotate(-Math.atan2(slant,length));
  const nozzle=siphonSkin();
  c.globalAlpha=opacity*(.62+.30*sun+.10*lamp);
  c.drawImage(nozzle,-7.5,-2,15,h+3.5);c.restore();
  if(w.stage==='fill'&&w.elapsed>.85){
    const power=Math.sin(Math.PI*clamp((w.elapsed-.85)/4.15));
    c.globalAlpha=opacity*power*(.38+.25*sun);c.lineWidth=1.4;c.strokeStyle='rgba(223,228,201,.76)';
    c.beginPath();c.moveTo(w.endX+1,y+2);c.quadraticCurveTo(w.endX+3,level-4,w.endX+3,level+1);c.stroke();
  }
  c.restore();
}
function drawCareWater(c){
  if(siphoning&&siphonTip){
    const {x,y}=siphonTip;c.save();c.strokeStyle='rgba(209,232,223,.65)';c.lineWidth=1.5*worldPerPixel;
    c.beginPath();c.ellipse(x,y,8*worldPerPixel,4*worldPerPixel,-.28,0,Math.PI*2);c.stroke();c.restore();
  }
}

;
/* residents */
'use strict';

const residentKey=(globalThis.tankSavePrefix||'')+'aquarium.residents.1',tankCapacity=24;
const speciesCards={
  guppy:{name:'孔雀鱼',sprite:'guppy',space:3,width:72,unit:'条',hint:'橘尾像一小片绸缎，转身时颜色尤其亮。'},
  tetra:{name:'灯鱼',sprite:'tetra',space:2,width:47,unit:'条',hint:'银蓝侧线，尾柄带着一抹红。'},
  whiteCloud:{name:'白云金丝鱼',sprite:'white-cloud',space:3,width:67,unit:'条',hint:'一道金线从眼后一直延伸到尾柄。'},
  nerite:{name:'斑马螺',sprite:'nerite-side',space:2,width:32,unit:'只',hint:'圆润的壳上有深浅相间的斑纹。'},
  shrimp:{name:'樱花虾',sprite:'cherry-shrimp',space:1,width:33,unit:'只',hint:'一只小巧的红虾，在深色沉木上很显眼。'},
  glassShrimp:{name:'玻璃虾',sprite:'glass-shrimp-clear',space:1,width:46,unit:'只',hint:'身体近乎透明，眼睛像两粒小墨点。'}
};
const shrimp=[];
function isShrimp(kind){return kind==='shrimp'||kind==='glassShrimp';}
let populationRevision='',neriteUnlocked=false;
const lastNumber={};
function residents(){return [...fish,...glassDwellers,...shrimp];}
function availableSpace(){return tankCapacity-residents().reduce((total,a)=>total+speciesCards[a.species].space,0);}
function needsAlgaeForSnail(){
  return !neriteUnlocked&&!globalThis.tankJournal?.earnedNerite?.()&&!canStockSnail(careNow());
}
function canAddCount(kind){
  if(globalThis.tankJournal&&!tankJournal.allows(kind))return 0;
  if(!Object.hasOwn(speciesCards,kind)||(kind==='nerite'&&needsAlgaeForSnail()))return 0;
  return Math.min(Math.floor(availableSpace()/speciesCards[kind].space),globalThis.tankJournal?.available?.(kind)??Infinity);
}
function newResident(kind,id,number,x,y,z,schoolSlot,width){
  const size=speciesCards[kind].width;
  let a;
  if(kind==='nerite'){a=createNerite(id,x,y,careNow());a.z=z;}
  else if(isShrimp(kind)){
    a={species:kind,x,y,z,facing:Math.random()<.5?-1:1,phase:rand(0,6.28),size:.94+(number%7)*.02,goal:x,pause:rand(.5,2),resting:true};
    if(kind==='glassShrimp')Object.assign(a,{perch:null,gut:0,tilt:0,peck:0,visit:0});
    shrimp.push(a);
  }else{
    const used=new Set(fish.filter(f=>f.species==='tetra').map(f=>f.schoolIndex));
    let index=0;while(used.has(index))index++;
    a=spawnFish(kind,x,y,width||size,kind==='tetra'?(Number.isInteger(schoolSlot)?schoolSlot:index):null);
    a.fullness=.48;a.nextGoal=time+rand(1,3);fish.push(a);
  }
  a.careId=id;a.number=number;lastNumber[kind]=Math.max(lastNumber[kind]||0,number);return a;
}
function removeResident(a){
  if(!a)return;
  if(a.species==='nerite'){glassDwellers.delete(a);nerite=glassDwellers.values().next().value??null;}
  else{
    const list=isShrimp(a.species)?shrimp:fish,index=list.indexOf(a);
    if(index>=0)list.splice(index,1);
  }
  if(typeof brushVisit!=='undefined'&&brushVisit?.f===a)brushVisit=null;
}
function addResidents(kind,count,area){
  if(!Number.isSafeInteger(count)||count<1||count>canAddCount(kind))return [];
  const start=clamp(area.left+area.w*.22,left+38,right-38),end=clamp(area.left+area.w*.78,left+38,right-38);
  let serial=lastNumber[kind]||0;
  const added=[];
  for(let i=0;i<count;i++){
    const x=mix(start,end,(i+rand(.22,.78))/count),z=rand(.66,.93);
    const y=isShrimp(kind)?rowY(sandRow(z),x)-6:kind==='nerite'?rand(335,490):rand(333,418);
    added.push(newResident(kind,makeId(),++serial,x,y,z,null,speciesCards[kind].width*rand(.92,1.05)));
  }
  if(kind==='nerite')neriteUnlocked=true;
  return added;
}
function readPopulation(){
  try{
    const data=JSON.parse(localStorage.getItem(residentKey));
    if(data?.version===1&&typeof data.rev==='string'&&Array.isArray(data.members))return data;
  }catch{}
  return null;
}
function readSnailPosition(n){
  let restored=false;
  try{restored=restoreSnail(JSON.parse(localStorage.getItem(snailSaveKey(n.careId))),n.careId);}catch{}
  if(!restored){n.at=careNow();return;}
  resumeSnail(careNow(),n);
}
function reconcileResidents(data){
  if(!data||data.rev===populationRevision)return;
  const current=new Map(residents().map(a=>[a.careId,a])),keep=new Set();
  let space=tankCapacity;
  for(const row of data.members){
    if(!row||!Object.hasOwn(speciesCards,row.species)||!Number.isSafeInteger(row.number)||row.number<1||
      typeof row.id!=='string'||!row.id||keep.has(row.id)||![row.x,row.y,row.z].every(v=>Number.isFinite(v)||(v===null&&swimTraits[row.species])))continue;
    const weight=speciesCards[row.species].space;
    if(weight>space)continue;
    keep.add(row.id);space-=weight;
    let a=current.get(row.id);
    if(a&&a.species!==row.species){removeResident(a);a=null;}
    if(!a){
      const kind=row.species,size=speciesCards[kind].width;
      // An older release animation could serialize NaN as null. Keep its identity and use safe water coordinates.
      const x=row.x??(355+(row.number%5)*40),y=row.y??(surface+68),z=row.z??.6;
      a=newResident(kind,row.id,row.number,clamp(x,left+10,right-10),clamp(y,surface+6,660),
        clamp(z),clamp(Math.round(row.slot||0),0,23),Number.isFinite(row.width)?clamp(row.width,size*.82,size*1.16):size);
      if(kind==='nerite'){a.at=0;readSnailPosition(a);}
      else if(isShrimp(kind)&&validLanding(row.arrival)){
        a.arrival={...row.arrival,elapsed:Math.max(0,(careNow()-row.arrival.startAt)/1000)};
        a.facing=a.yaw=a.arrival.side;stepShrimpArrival(a,0);
      }
    }
    a.number=row.number;
  }
  for(const [id,a] of current)if(!keep.has(id))removeResident(a);
  neriteUnlocked=!!data.neriteUnlocked||glassDwellers.size>0;
  for(const [kind,number] of Object.entries(data.lastNumber||{})){
    if(Object.hasOwn(speciesCards,kind)&&Number.isSafeInteger(number)&&number>0&&number<100000000)
      lastNumber[kind]=Math.max(lastNumber[kind]||0,number);
  }
  populationRevision=data.rev;
}
function loadResidents(){
  for(const f of fish){
    f.careId=f.species+'-'+(f.schoolIndex??0);
    f.number=lastNumber[f.species]=(lastNumber[f.species]||0)+1;
  }
  const data=careDemo?null:readPopulation();
  if(data){reconcileResidents(data);return;}
  loadSnail(careNow());
  for(const n of glassDwellers)n.number=lastNumber.nerite=1;
  neriteUnlocked=glassDwellers.size>0;
}
function writeResidents(){
  if(careDemo)return true;
  const rev=makeId(),members=residents().map(a=>({id:a.careId,number:a.number,species:a.species,x:a.x,y:a.y,
    z:a.z??1,slot:a.schoolIndex,width:a.width,arrival:isShrimp(a.species)?a.arrival:undefined}));
  try{
    localStorage.setItem(residentKey,JSON.stringify({version:1,rev,lastNumber,neriteUnlocked,members}));
    populationRevision=rev;saveSnail(careNow());careDirty=true;saveCare();return true;
  }catch{return false;}
}
async function changeResidents(action){
  const run=()=>{
    if(!careDemo)reconcileResidents(readPopulation());
    const result=action();return {result,saved:!result||writeResidents()};
  };
  if(!careDemo&&navigator.locks)return navigator.locks.request(residentKey,run);
  return run();
}
// A released animal meets the upper surface of the actual sand at its own depth.
function validLanding(p){
  return p&&['x','y','endX','z','side','duration','startAt'].every(k=>Number.isFinite(p[k]))&&
    p.duration>=.8&&p.duration<=9&&Math.abs(p.side)===1&&p.z>=0&&p.z<=1;
}
function landingPose(a,p,elapsed){
  const t=clamp(elapsed/p.duration),u=t*t*(3-2*t),arc=Math.sin(Math.PI*t);
  const shrimp=isShrimp(a.species);
  a.z=p.z;a.x=mix(p.x,p.endX,u)+p.side*(shrimp?10:2)*arc;
  const foot=a.species==='nerite'?8:a.species==='glassShrimp'?2.6:6;
  a.y=mix(p.y,rowY(sandRow(a.z),a.x)-foot,u);
  return t;
}
function stepShrimpArrival(a,dt){
  const p=a.arrival,t=landingPose(a,p,p.elapsed+=dt);
  a.phase+=dt*8;a.tilt=p.side*.27*Math.sin(Math.PI*t);
  a.flex=.055+.10*Math.sin(Math.PI*t);a.resting=false;
  if(t<1)return;
  a.arrival=null;a.goal=a.x;a.pause=2.4;a.resting=true;
  if(a.species==='glassShrimp'){
    a.perch={type:'sand',x:a.x,z:a.z,key:'sand/'+Math.round(a.x/90)+'/'+Math.round(a.z*4)};
    a.flight=null;a.visit=5.4;a.peck=1.3;
  }
}
function shrimpStep(a,dt){
  if(a.inNet||a.arriving)return;
  if(a.arrival){stepShrimpArrival(a,dt);return;}
  if(a.species==='glassShrimp'){stepGlassShrimp(a,dt);return;}
  if(a.still>0){a.still-=dt;return;}
  a.phase+=dt*(a.resting?2:7);a.flex=.025+.025*Math.sin(a.phase*.6);
  a.pause-=dt;
  if(a.pause<=0){
    const tidbit=residue.filter(p=>Math.abs(p.z-a.z)<.14&&Math.abs(p.x-a.x)<120)
      .sort((p,q)=>Math.abs(p.x-a.x)-Math.abs(q.x-a.x))[0];
    if(tidbit&&Math.abs(tidbit.x-a.x)<8){
      tidbit.mass=Math.max(0,tidbit.mass-.075);careDirty=true;
      if(tidbit.mass<.06)residue.splice(residue.indexOf(tidbit),1);
      a.goal=a.x;a.pause=rand(5,10);
    }else{
      a.goal=clamp(tidbit?tidbit.x:a.x+rand(-58,58),left+25,right-25);
      a.pause=rand(4.5,10);
    }
  }
  const dx=a.goal-a.x;a.resting=Math.abs(dx)<2;
  if(!a.resting){
    a.facing=Math.sign(dx);a.x+=a.facing*Math.min(Math.abs(dx),dt*4.7);
  }
  a.y=rowY(sandRow(a.z),a.x)-6;
}
function paintShrimp(a,c){
  if(a.species==='glassShrimp'){paintGlassShrimp(a,c);return;}
  paintArticulatedShrimp(a,c);
}

;
/* shrimp-render */
'use strict';

const shrimpSkins=new Map(),shrimpFrames=new Map();
function makeShrimpSkins(){
  for(const kind of ['glassShrimp','shrimp']){
    const im=sprites[speciesCards[kind].sprite],plate=document.createElement('canvas');
    plate.width=280;plate.height=Math.round(280*im.naturalHeight/im.naturalWidth);
    const c=plate.getContext('2d');c.drawImage(im,0,0,plate.width,plate.height);
    if(kind==='glassShrimp'){
      const pixels=c.getImageData(0,0,plate.width,plate.height),data=pixels.data,original=new Uint8ClampedArray(data);
      for(let i=0;i<data.length;i+=4){
        const light=(data[i]*.27+data[i+1]*.58+data[i+2]*.15)/255;
        // High transmission across the shell; dark eyes retain their density.
        const dx=4,dy=plate.width*4;
        const edge=(Math.abs((original[i-dx+3]||0)-(original[i+dx+3]||0))+
          Math.abs((original[i-dy+3]||0)-(original[i+dy+3]||0)))/510;
        data[i+3]*=Math.min(.93,.40+.65*(1-light)**1.55+.58*edge);
        data[i]*=.86;data[i+1]*=.91;data[i+2]*=.87;
      }
      c.putImageData(pixels,0,0);
    }
    shrimpSkins.set(kind,plate);
  }
}
function shrimpMeshPoint(u,v,kind,phase,flex,swimming){
  const im=shrimpSkins.get(kind),w=im.width,h=im.height;
  const joint=kind==='glassShrimp'?.49:.48,axis=kind==='glassShrimp'?.54:.50;
  let x=u*w,y=v*h;
  if(u<joint){
    // Successive abdominal segments turn around their neighbours.
    const length=(joint-u)*w,steps=7,step=length/steps;
    x=joint*w;y=axis*h;
    for(let i=0;i<steps;i++){
      const amount=(i+.5)/steps*(joint-u)/joint,angle=-flex*amount;
      x-=Math.cos(angle)*step;y-=Math.sin(angle)*step;
    }
    const angle=-flex*(joint-u)/joint,offset=(v-axis)*h;
    x-=Math.sin(angle)*offset;y+=Math.cos(angle)*offset;
  }
  const legs=clamp((v-.63)/.30)*clamp((u-.30)/.13)*clamp((.75-u)/.12);
  x+=legs*w*.012*Math.sin(phase+u*37);
  y+=legs*h*.045*Math.cos(phase+u*37);
  const antenna=clamp((u-.68)/.28)*clamp((.58-v)/.19);
  y+=antenna*h*.035*Math.sin(phase*.33+(u-.7)*4);
  if(swimming&&u<.47&&v>.62)y+=h*.018*Math.sin(phase-u*26);
  return {x:x+30,y:y+18};
}
function textureTriangle(c,im,s,p){
  const [a,b,d]=s,[A,B,D]=p;
  const det=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);
  const xx=((B.x-A.x)*(d.y-a.y)-(D.x-A.x)*(b.y-a.y))/det;
  const xy=((D.x-A.x)*(b.x-a.x)-(B.x-A.x)*(d.x-a.x))/det;
  const yx=((B.y-A.y)*(d.y-a.y)-(D.y-A.y)*(b.y-a.y))/det;
  const yy=((D.y-A.y)*(b.x-a.x)-(B.y-A.y)*(d.x-a.x))/det;
  const cx=(A.x+B.x+D.x)/3,cy=(A.y+B.y+D.y)/3;
  c.save();c.beginPath();
  for(const [i,q] of p.entries()){
    const dx=q.x-cx,dy=q.y-cy,len=Math.hypot(dx,dy),x=q.x+dx/len*.35,y=q.y+dy/len*.35;
    if(!i)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.closePath();c.clip();c.transform(xx,yx,xy,yy,A.x-xx*a.x-xy*a.y,A.y-yx*a.x-yy*a.y);
  c.drawImage(im,0,0);c.restore();
}
function posedShrimp(a){
  const phaseIndex=Math.round(a.phase/(Math.PI*2)*16)%16,flexIndex=Math.round((a.flex||0)*14);
  const key=a.species+'/'+phaseIndex+'/'+flexIndex+'/'+a.resting;
  if(shrimpFrames.has(key))return shrimpFrames.get(key);
  const im=shrimpSkins.get(a.species),plate=document.createElement('canvas');
  plate.width=im.width+60;plate.height=im.height+im.width*.50+36;
  const c=plate.getContext('2d'),phase=phaseIndex*Math.PI/8,flex=flexIndex/14,cols=22,rows=7,grid=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)
    grid.push(shrimpMeshPoint(i/cols,j/rows,a.species,phase,flex,!a.resting));
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=i*im.width/cols,y=j*im.height/rows,dx=im.width/cols,dy=im.height/rows,k=j*(cols+1)+i;
    textureTriangle(c,im,[{x,y},{x:x+dx,y},{x,y:y+dy}],[grid[k],grid[k+1],grid[k+cols+1]]);
    textureTriangle(c,im,[{x:x+dx,y},{x:x+dx,y:y+dy},{x,y:y+dy}],[grid[k+1],grid[k+cols+2],grid[k+cols+1]]);
  }
  shrimpFrames.set(key,plate);
  if(shrimpFrames.size>56)shrimpFrames.delete(shrimpFrames.keys().next().value);
  return plate;
}
function paintArticulatedShrimp(a,c){
  const im=shrimpSkins.get(a.species);if(!im)return;
  const w=speciesCards[a.species].width*(a.size||1),scale=w/im.width,h=im.height*scale;
  const yaw=a.yaw??a.facing,side=yaw<0?-1:1;
  c.save();c.translate(a.x,a.y);c.rotate(a.tilt||0);c.scale(side*(.07+.93*Math.abs(yaw)),1);
  const x=-w*.53,y=-h*.89;
  c.drawImage(posedShrimp(a),x-30*scale,y-18*scale,(im.width+60)*scale,(im.height+im.width*.50+36)*scale);
  if(a.species==='glassShrimp'){
    const cx=w*.025,cy=-h*.355,opacity=.08+.22*(a.gut||0);
    const glow=c.createRadialGradient(cx,cy,0,cx,cy,w*.067);
    glow.addColorStop(0,'rgba(99,128,40,'+opacity+')');glow.addColorStop(1,'rgba(99,128,40,0)');
    c.fillStyle=glow;c.beginPath();c.ellipse(cx,cy,w*.068,h*.125,0,0,Math.PI*2);c.fill();
  }
  // Resting pleopods overlap backwards under the abdomen, behind the walking legs.
  const open=a.paddleOpen??0;
  if(open<.025){c.restore();return;}
  c.globalAlpha*=open;
  // Five paired, feathered pleopods power the forward glide in a travelling wave.
  const swimming=!a.resting,beat=a.phase*(swimming?3.3:.42),activity=open;
  c.lineCap='round';c.lineWidth=Math.max(.20,w*.006);
  for(const far of [true,false]){
    c.strokeStyle=a.species==='glassShrimp'?'rgba(157,183,157,'+(far?.26:.57)+')':'rgba(151,74,48,.62)';
    c.fillStyle=a.species==='glassShrimp'?'rgba(167,188,157,'+(far?.12:.23)+')':'rgba(168,87,58,.32)';
    for(let i=0;i<5;i++){
      const u=.18+i*.059,root=shrimpMeshPoint(u,.64,a.species,a.phase,a.flex||0,swimming);
      const px=x+(root.x-30)*scale,py=y+(root.y-18)*scale;
      const stroke=Math.sin(beat-i*.88+(far?.34:0))*activity;
      const power=stroke>0?1:.48,len=h*.22*(far?.86:1);
      const kneeX=px+len*mix(-.77,stroke*.49,open),kneeY=py+len*.48*open;
      const tipX=px+len*mix(-1.12,stroke*.89,open),tipY=py+len*(.86+.14*Math.cos(beat-i*.88))*open;
      c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(kneeX,kneeY,tipX,tipY);c.stroke();
      const fan=len*.28*power;
      c.beginPath();c.moveTo(kneeX,kneeY);
      c.quadraticCurveTo(tipX-fan,tipY-fan*.2,tipX-fan*.58,tipY+fan*.18);
      c.quadraticCurveTo(tipX+fan*.65,tipY+fan*.22,tipX+fan,tipY-fan*.5);
      c.quadraticCurveTo(kneeX+fan*.3,kneeY,kneeX,kneeY);c.fill();
    }
  }
  c.restore();
}

;
/* shrimp-habitat */
'use strict';

let shrimpScenery=new Map(),observedAnimal=null,observationCenter=null;
const visibleForage=new Map(),forageBeds=new Map(),forageRegrow=5*3600000;
function observeAnimal(a){
  observedAnimal=a;observationCenter=a?{x:a.x,y:a.y}:null;
  $('#animal-view').hidden=!a;
  if(a){
    globalThis.tankJournal?.markSeen(a.species);
    const fact={shrimp:'see-shrimp',whiteCloud:'see-whiteCloud',tetra:'stock-tetra'}[a.species];
    if(fact)globalThis.tankJournal?.record(fact);
    $('#animal-caption').textContent='近观 · '+animalLabel(a);
  }
  refresh();resize();
}
function animalCamera(rect){
  const ratio=rect.width/Math.max(1,rect.height),a=observedAnimal;
  const h=Math.max(152,Math.min(295,Math.max(148,speciesCards[a.species].width*2.65)/Math.min(1,ratio)));
  const w=Math.min(1164,h*ratio);
  return {w,h,left:clamp(observationCenter.x-w*.5,18,1182-w),top:clamp(observationCenter.y-h*.52,166,712-h)};
}
function followAnimal(dt){
  if(!observedAnimal)return;
  if(!residents().includes(observedAnimal)){observeAnimal(null);return;}
  observationCenter.x=approach(observationCenter.x,observedAnimal.x,3.2,dt);
  observationCenter.y=approach(observationCenter.y,observedAnimal.y,3.2,dt);
}
function patchLevel(p,now){return clamp(p.amount+Math.max(0,now-p.at)/forageRegrow);}
function forageBed(key){
  if(!forageBeds.has(key))forageBeds.set(key,{amount:1,at:careNow()});
  return forageBeds.get(key);
}
function packForage(now){
  const beds=[...forageBeds].filter(([,p])=>patchLevel(p,now)<.999).slice(-240);
  return {beds,guts:shrimp.filter(a=>a.gut>.005).map(a=>[a.careId,a.gut])};
}
function restoreForage(data,elapsed){
  if(!data)return;
  for(const v of (Array.isArray(data.beds)?data.beds:[]).slice(-240)){
    if(!Array.isArray(v))continue;
    const [key,p]=v;
    if(typeof key==='string'&&Number.isFinite(p?.at)&&Number.isFinite(p?.amount))
      forageBeds.set(key,{at:Math.min(careNow(),p.at),amount:clamp(p.amount)});
  }
  const old=new Map((Array.isArray(data.guts)?data.guts:[]).filter(Array.isArray));
  for(const a of shrimp)if(a.species==='glassShrimp'&&Number.isFinite(old.get(a.careId)))
    a.gut=clamp(old.get(a.careId))*Math.exp(-elapsed/600000);
}
function perchPoint(p){
  if(p.type==='sand')return {x:p.x,y:rowY(sandRow(p.z),p.x)-1,z:p.z,angle:0};
  const g=shrimpScenery.get(p.host);
  if(!g||g.sprite!==p.sprite)return null;
  if(p.type==='leaf'){
    const rig=foliageRigs[g.sprite],uv=displayedLeafUV(g,rig,p.zone,p.u,p.v);
    const at=worldPointOnSprite(g,...uv);
    const root=worldPointOnSprite(g,...rig.zones[p.zone-1].root);
    return {...at,z:p.drawZ,angle:clamp(Math.atan((at.y-root.y)/((at.x-root.x)||1)),-.65,.65)};
  }
  const at=surfaceAt(g,p.slot),before=surfaceAt(g,p.slot-.035),after=surfaceAt(g,p.slot+.035);
  return {...at,z:p.drawZ,angle:clamp(Math.atan((after.y-before.y)/((after.x-before.x)||1)),-.76,.76)};
}
function localPerches(a){
  const list=[];
  for(const g of shrimpScenery.values()){
    const drawZ=g.host?.kind==='arch'?bridgeDepth(g.host,leafOcclusion(g.host,g.slot).near)+.005:g.depth+.0015;
    const base={host:g.id,sprite:g.sprite,drawZ};
    if(g.kind==='arch')continue;
    if(g.ridge&&!catalog[g.kind].living){
      for(const [i,slot] of [.25,.51,.79].entries())if(!occludedAt(g,slot))
        list.push({...base,type:'hard',slot,key:g.id+'/ridge/'+i});
    }else if(catalog[g.kind].living){
      const tip=specimenTip(g);
      if(tip)list.push({...base,type:'leaf',soft:g.kind!=='moss'&&(g.id.length+tip.id)%3!==0,
        zone:tip.id,u:tip.u,v:tip.v,key:g.id+'/leaf/'+tip.id});
    }
  }
  if(!list.length){
    // Bare substrate can carry a thin biofilm too.
    const z=clamp(a.z,.15,.9),i=Math.round(a.x/90);
    for(const j of [i-1,i,i+1]){
      const x=clamp(j*90,left+32,right-32);list.push({type:'sand',x,z,key:'sand/'+j+'/'+Math.round(z*4)});
    }
  }
  return list;
}
function choosePerch(a){
  const old=a.perch,list=localPerches(a),now=careNow();
  let best=null,score=Infinity;
  for(const p of list){
    const at=perchPoint(p);if(!at||at.y<surface+10||at.x<left+14||at.x>right-14)continue;
    const bed=forageBeds.get(p.key),amount=bed?patchLevel(bed,now):1;
    const busy=shrimp.some(b=>b!==a&&b.perch?.key===p.key);
    const preferLeaf=old?.type==='hard'||old?.type==='sand';
    const value=Math.hypot(at.x-a.x,at.y-a.y)*.64+(1-amount)*260+(busy?145:0)+
      (old?.key===p.key?210:0)+(preferLeaf&&p.type!=='leaf'?94:0)+
      (a.showcaseStart&&shrimpScenery.get(p.host)?.kind!=='branch'?350:0)+rand(0,17);
    if(value<score){best=p;score=value;}
  }
  if(best){forageBed(best.key);visibleForage.set(best.key,best);}
  a.perch=best;a.resting=false;a.visit=rand(8,15);a.peck=rand(.3,.8);return best;
}
function grazePerch(a){
  const p=forageBed(a.perch.key),now=careNow(),bite=Math.min(.077,patchLevel(p,now));
  if(bite<.01){a.visit=0;return;}
  p.amount=patchLevel(p,now)-bite;p.at=now;
  a.gut=clamp(a.gut+bite*(1.25-a.gut)*2.65);careDirty=true;
}
function touchShrimp(a,point){
  if(!a||a.inNet||!isShrimp(a.species))return false;
  if(a.arrival)return true;
  if(a.species==='shrimp'){a.still=2.7;a.resting=true;return true;}
  if(a.escape||a.shy>0)return true;
  const dir=Math.abs(point.x-a.x)>2?Math.sign(a.x-point.x):-a.facing;
  a.escape={x:a.x,y:a.y,dx:clamp(a.x+dir*29,left+20,right-20)-a.x,elapsed:0};
  a.facing=-dir;a.flight=null;a.resting=false;a.shy=2.6;return true;
}
function shrimpFlight(a,dest){
  const dx=dest.x-a.x,dy=dest.y-a.y,distance=Math.hypot(dx,dy);
  const direction=Math.abs(dx)>8?Math.sign(dx):a.facing;
  const lead=Math.min(44,distance*.32);
  a.flight={elapsed:0,duration:clamp(distance/32,1.35,7),start:{x:a.x,y:a.y,z:a.z},
    c1:{x:a.x+a.facing*lead,y:a.y-Math.min(22,distance*.22)},
    c2:{x:dest.x-direction*lead,y:dest.y-Math.min(28,distance*.25)}};
  a.resting=false;
}
function stepGlassShrimp(a,dt){
  a.phase+=dt*(a.resting?3.2:9.5);
  a.shy=Math.max(0,(a.shy||0)-dt);a.gut*=Math.exp(-dt/600);
  a.yaw??=a.facing;a.flex??=0;
  if(a.escape){
    const e=a.escape,t=clamp((e.elapsed+=dt)/.8),k=1-(1-t)**3;
    a.x=e.x+e.dx*k;a.y=e.y-12*Math.sin(t*Math.PI*.77);
    a.flex=1.65*Math.sin(Math.PI*clamp(t/.62))**2;
    a.tilt=approach(a.tilt,-a.facing*.17*Math.sin(t*Math.PI),7,dt);
    if(t>=1){a.escape=null;a.flight=null;}return;
  }
  a.flex=approach(a.flex,a.resting?.035:.13+.065*Math.sin(a.phase*.7),5,dt);
  if(a.shy>1.65)return;
  let dest=a.perch&&perchPoint(a.perch);
  if(!dest||a.visit<=0){
    choosePerch(a);dest=a.perch&&perchPoint(a.perch);
    a.flight=null;if(!dest)return;
  }
  dest={...dest,y:dest.y-1.6};
  if(a.showcaseStart){a.x=dest.x;a.y=dest.y;a.z=dest.z;a.showcaseStart=false;a.resting=true;}
  if(!a.resting||Math.hypot(dest.x-a.x,dest.y-a.y)>11){
    if(!a.flight)shrimpFlight(a,dest);
    const f=a.flight,t=clamp((f.elapsed+=dt)/f.duration),u=t*t*(3-2*t),v=1-u;
    const x=v*v*v*f.start.x+3*v*v*u*f.c1.x+3*v*u*u*f.c2.x+u*u*u*dest.x;
    const y=v*v*v*f.start.y+3*v*v*u*f.c1.y+3*v*u*u*f.c2.y+u*u*u*dest.y;
    const dx=x-a.x,dy=y-a.y;
    if(Math.abs(dx)>.025)a.facing=Math.sign(dx);
    a.yaw=approach(a.yaw,a.facing,3.4,dt);
    a.tilt=approach(a.tilt,clamp(Math.atan2(dy,Math.abs(dx)+.16)*a.facing,-.48,.48),3,dt);
    a.x=x;a.y=y;a.z=mix(f.start.z,dest.z,u);
    if(t>=1){a.flight=null;a.resting=true;}
    return;
  }
  a.x=dest.x;a.y=dest.y;a.z=dest.z;
  a.yaw=approach(a.yaw,a.facing,4,dt);
  a.tilt=approach(a.tilt,dest.angle,4,dt);a.visit-=dt;a.peck-=dt;
  if(a.peck<=0){grazePerch(a);a.peck=rand(.75,1.4);}
}
function paintGlassShrimp(a,c){paintArticulatedShrimp(a,c);}
function drawForageBeds(all){
  for(const p of visibleForage.values()){
    const at=perchPoint(p);
    if(!at){visibleForage.delete(p.key);continue;}
    const amount=patchLevel(forageBed(p.key),careNow());
    all.push([at.z-.0002,()=>{
      ctx.save();ctx.translate(at.x,at.y+.55);ctx.rotate(at.angle);
      if(p.soft&&amount>.045){
        // A softened leaf fragment snags on the blade. Mouthfuls shorten its free edge.
        const len=7.6*amount,width=1.35*Math.sqrt(amount);
        ctx.globalAlpha=.79;ctx.fillStyle='#9e9756';ctx.beginPath();ctx.moveTo(-2.8,0);
        ctx.bezierCurveTo(-2,-width*1.3,len*.35,-width,len-.7,-width*.42);
        ctx.lineTo(len-.95,0);ctx.lineTo(len,.24);
        ctx.quadraticCurveTo(len*.3,width,-2.8,0);ctx.fill();
      }
      ctx.fillStyle=p.soft?'#897b48':'#75804a';
      for(let i=0;i<8;i++){
        ctx.globalAlpha=clamp(amount*9-i)*.52;
        ctx.beginPath();ctx.ellipse((i%4-1.5)*2.85+i%2,(i%3)*.48,1.2+(i%3)*.55,.48+i%2*.42,-.25,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }]);
  }
}

;
/* resident-tools */
'use strict';

let introduction=null,netTexture=null;
let managing=false,stockMode='add',stockKind='guppy',stockTarget=null,landingNet=null,stockBusy=false;
function animalLabel(a){return speciesCards[a.species].name+' · '+String(a.number).padStart(2,'0')+'号';}
function stockMessage(text){
  const note=$('#stock-feedback');note.hidden=!text;note.textContent=text;
}
function updateStockPanel(){
  $('#residents-panel').hidden=!managing;$('#residents-open').setAttribute('aria-expanded',String(managing));
  if(!managing)return;
  if(globalThis.tankJournal&&!tankJournal.allows(stockKind))stockKind='guppy';
  const netMode=stockMode==='net',locked=!!landingNet||!!introduction||stockBusy;
  const used=tankCapacity-availableSpace();
  $('#stock-capacity').textContent='容量 '+used+' / '+tankCapacity;$('#stock-meter').value=used;
  $('#residents-close').disabled=stockBusy||!!introduction;
  $('#residents-close').textContent=landingNet&&!stockBusy?'取消捞取':'收起';
  $('#stock-mode-add').setAttribute('aria-pressed',String(!netMode));
  $('#stock-mode-net').setAttribute('aria-pressed',String(netMode));
  for(const id of ['stock-mode-add','stock-mode-net'])$('#'+id).disabled=locked;
  $('#stock-add-pane').hidden=netMode;$('#stock-net-pane').hidden=!netMode;
  if(netMode){
    const list=residents();
    if(!list.includes(stockTarget))stockTarget=null;
    options($('#net-id'),[['',list.length?'选择个体':'缸中暂无生物'],...list.map(a=>[a.careId,animalLabel(a)])]);
    $('#net-id').value=stockTarget?.careId||'';$('#net-id').disabled=locked||!list.length;
    $('#net-go').disabled=locked||!stockTarget;
    return;
  }
  const available=canAddCount(stockKind),card=speciesCards[stockKind],list=residents();
  for(const b of $('#stock-species').children)b.setAttribute('aria-pressed',String(b.dataset.kind===stockKind));
  const onHand=list.filter(a=>a.species===stockKind).length;
  const needsAlgae=stockKind==='nerite'&&needsAlgaeForSnail();
  $('#stock-detail').textContent=card.hint;
  $('#stock-observe').disabled=!onHand||locked;
  $('#stock-occupancy').textContent='缸中 '+onHand+' '+card.unit+'，每'+card.unit+'占 '+card.space+' 格。'+
    (needsAlgae?'玻璃长出藻后可引入。':available?'还能放 '+available+' '+card.unit+'。':
      globalThis.tankJournal?.available(stockKind)===0?'这一种的名额已用完。':'剩余容量不足。');
  const input=$('#stock-quantity'),count=input.valueAsNumber;
  input.max=String(available);input.disabled=!available||locked;
  $('#stock-minus').disabled=!available||locked||!(count>1);
  $('#stock-plus').disabled=!available||locked||count>=available;
  $('#stock-add').disabled=locked||!Number.isSafeInteger(count)||count<1||count>available;
  $('#stock-add').textContent='放入缸中';
}
function selectResident(a,bringIntoView){
  stockTarget=a||null;
  if(a&&bringIntoView&&view==='near'){
    const c=camera();
    if(a.x<c.left+c.w*.18||a.x>c.left+c.w*.82){
      pan=clamp((a.x-c.w*.5-18)/Math.max(1,1164-c.w));$('#pan').value=Math.round(pan*1000);
    }
  }
  stockMessage('');updateStockPanel();render();
}
function pickResident(point){
  let best=null,score=Infinity;
  const padding=clamp(worldPerPixel*10,5,23);
  for(const a of residents()){
    const isFish=!!swimTraits[a.species],w=speciesCards[a.species].width;
    const rx=(isFish?a.width*(.23+.27*Math.abs(a.yaw)):w*.45)+padding,ry=w*(a.species==='nerite'?.33:.19)+padding;
    const angle=a.tilt||0,bodyOffset=isShrimp(a.species)?w*.105:0;
    const cx=a.x+Math.sin(angle)*bodyOffset,cy=a.y-Math.cos(angle)*bodyOffset;
    const dx=point.x-cx,dy=point.y-cy;
    const distance=Math.hypot((dx*Math.cos(angle)+dy*Math.sin(angle))/rx,(-dx*Math.sin(angle)+dy*Math.cos(angle))/ry);
    const rank=distance-.045*(a.z??1);
    if(distance<=1&&rank<score){best=a;score=rank;}
  }
  return best;
}
function showResidents(open){
  if(stockBusy||introduction||open&&(editing||watchState||waterChange))return;
  if(landingNet){landingNet.a.inNet=false;landingNet=null;}
  if(observedAnimal)observeAnimal(null);
  managing=open;stockTarget=null;stockMode='add';drag=null;wipingGlass=false;siphoning=false;siphonTip=null;
  document.body.classList.toggle('managing',open);stockMessage('');updateStockPanel();refresh();render();

  if(open)$('#residents-panel').scrollIntoView({block:'nearest'});
}
function startNet(a){
  if(!a||landingNet||introduction||!residents().includes(a))return;
  selectResident(a,true);
  const side=a.x>600?-1:1;
  landingNet={a,age:0,side,startX:clamp(a.x+side*72,left+25,right-25),x:a.x,y:surface-25,
    rx:Math.max(31,speciesCards[a.species].width*.66+10),held:false,finishing:false};
  stockMessage('');updateStockPanel();
  stage.scrollIntoView({block:'nearest'});
}
function easeNet(t){t=clamp(t);return t*t*(3-2*t);}
function stepNet(dt){
  const n=landingNet;if(!n||n.finishing)return;
  const a=n.a;
  if(!residents().includes(a)){a.inNet=false;landingNet=null;stockTarget=null;updateStockPanel();return;}
  const before=n.age;n.age+=dt;
  const reach=1.7,lift=2.15,endY=surface-95;
  if(!n.held){
    const t=easeNet(n.age/reach);
    n.x=mix(n.startX,a.x,t)+n.side*15*Math.sin(Math.PI*t);
    n.y=mix(surface-40,a.y-10,t);
    if(n.age>=reach){
      n.held=true;a.inNet=true;n.gripX=a.x;n.gripY=a.y;
      if(a.traits){a.target=null;a.inspect=null;}
    }
  }
  if(n.held){
    const t=easeNet((n.age-reach-.45)/lift);
    n.x=n.gripX+n.side*42*t;n.y=mix(n.gripY-10,endY,t);
    a.phase+=dt*4.2;if(isShrimp(a.species))a.flex=.17+.11*Math.sin(n.age*3);
  }
  if(before<.23&&n.age>=.23)ripples.push({x:n.x,y:surface-6,age:0,strength:.38});
  if(n.held&&!n.surfaced&&n.y<surface){
    n.surfaced=true;ripples.push({x:n.x,y:surface-6,age:0,strength:.64});
  }
  if(n.age<reach+.45+lift)return;
  n.finishing=true;stockBusy=true;
  changeResidents(()=>{
    const same=residents().find(b=>b.careId===a.careId);
    if(!same)return false;
    removeResident(same);return true;
  }).then(({result,saved})=>{
    if(saved&&result&&!careDemo&&a.species==='nerite')try{localStorage.removeItem(snailSaveKey(a.careId));}catch{}
    stockMessage(!result?'这只生物已经离缸。':animalLabel(a)+' 已捞出。'+(saved?'':'当前浏览器未能保存。'));
  }).catch(()=>stockMessage('未能完成捞出，可以重试。')).finally(()=>{
    a.inNet=false;landingNet=null;stockTarget=null;stockBusy=false;updateStockPanel();render();
  });
}
function drawSelectedResident(c){
  const a=stockTarget;
  if(!managing||stockMode!=='net'||!a||landingNet)return;
  c.save();c.translate(a.x,a.y);
  const r=speciesCards[a.species].width*.62+3;
  c.lineWidth=Math.max(1,worldPerPixel*1.35);c.strokeStyle='rgba(248,250,216,.8)';
  c.beginPath();c.ellipse(0,0,r,r*.65,0,-.66,.66);c.stroke();
  c.beginPath();c.ellipse(0,0,r,r*.65,0,Math.PI-.66,Math.PI+.66);c.stroke();c.restore();
}
function prepareLandingNet(){
  const im=sprites['landing-net'],plate=document.createElement('canvas');
  plate.width=im.naturalWidth;plate.height=im.naturalHeight;
  const c=plate.getContext('2d');c.drawImage(im,0,0);
  const pixels=c.getImageData(0,0,plate.width,plate.height),d=pixels.data;
  for(let y=0;y<plate.height;y++)for(let x=0;x<plate.width;x++){
    const i=(y*plate.width+x)*4,u=x/plate.width,v=y/plate.height;
    const rim=Math.hypot((u-.302)/.286,(v-.722)/.060);
    const mesh=v>.665&&rim<.95||v>.785;
    if(mesh)d[i+3]*=.31;
    d[i]*=.72;d[i+1]*=.77;d[i+2]*=.73;
  }
  c.putImageData(pixels,0,0);netTexture=plate;
}
function paintNetAnimal(a,c,x,y,phase){
  c.save();c.translate(x-a.x,y-a.y);
  if(isShrimp(a.species))paintShrimp(a,c);
  else if(a.species==='nerite')drawSnail(c,a);
  else paintFish(a,c);
  c.restore();
}
function paintRealNet(c,n,animals,rotation=0){
  if(!netTexture)prepareLandingNet();
  const w=n.rx*2/.575,h=w*netTexture.height/netTexture.width;
  const originX=-w*.302,originY=-h*.722,side=n.side||1;
  c.save();c.translate(n.x,n.y);c.rotate(rotation);
  // Back of the bag and the metal handle.
  c.save();c.scale(side,1);c.globalAlpha=.86;
  c.drawImage(netTexture,0,netTexture.height*.10,netTexture.width,netTexture.height*.90,originX,originY+h*.10,w,h*.90);
  const shaftX=w*.627,shaftY=-h*.622,top=Math.min(shaftY-12,camera().top-n.y-35);
  const endX=shaftX+(shaftY-top)*.52;
  c.lineCap='round';c.lineWidth=w*.009;c.strokeStyle='#68746e';
  c.beginPath();c.moveTo(shaftX,shaftY+2);c.lineTo(endX,top);c.stroke();
  c.lineWidth=w*.0035;c.strokeStyle='#c0c9ba';c.stroke();
  c.restore();
  for(const [i,a] of animals.entries()){
    let offset=animals.length===1?0:(i%2-.5)*n.rx*.65;
    if(n.animals&&i===0)offset=mix(offset,n.side*n.rx*.43,easeNet(clamp((n.age-2.25)/.38-n.released)));
    paintNetAnimal(a,c,offset,10+Math.floor(i/2)*5,n.age);
  }
  // Fine front mesh lies over the animal, with the same curved rim as the photo.
  c.save();c.beginPath();c.moveTo(-n.rx,0);
  c.bezierCurveTo(-n.rx*.64,n.rx*.40,n.rx*.65,n.rx*.40,n.rx,0);
  c.lineTo(n.rx,h);c.lineTo(-n.rx,h);c.closePath();c.clip();
  c.scale(side,1);c.globalAlpha=.92;c.drawImage(netTexture,originX,originY,w,h);c.restore();
  c.restore();
}
function drawLandingNet(c){
  const n=landingNet;
  if(n){
    const fade=clamp((n.y-(surface-95))/25);
    c.save();c.globalAlpha=fade;
    paintRealNet(c,n,n.held?[n.a]:[],Math.sin(n.age*.9)*.045);c.restore();
    if(n.surfaced&&n.y<surface-5){
      c.save();c.strokeStyle='rgba(192,215,203,.32)';c.lineWidth=.6;
      for(let i=0;i<3;i++){
        const y=n.y+28+((n.age*63+i*11)%24);
        if(y<surface){c.beginPath();c.moveTo(n.x+(i-1)*9,y);c.lineTo(n.x+(i-1)*9,y+3);c.stroke();}
      }
      c.restore();
    }
  }
  if(introduction){
    const m=introduction,remaining=m.animals.filter(a=>a.inNet);
    c.save();c.globalAlpha=clamp((m.y-(surface-100))/25);
    paintRealNet(c,m,remaining.slice(0,4),m.tip||0);c.restore();
  }
}
function netMouth(n){
  return {x:n.x+Math.cos(n.tip)*n.side*n.rx*.43-Math.sin(n.tip)*10,
    y:n.y+Math.sin(n.tip)*n.side*n.rx*.43+Math.cos(n.tip)*10};
}
function planLandings(n){
  const mouth=netMouth({...n,y:n.depthY,tip:-n.side*.24});
  for(const [i,a] of n.animals.entries()){
    const shell=a.species==='nerite';
    let z=.42+.07*(i%4),side=i%2?-n.side:n.side;
    const spread=Math.min(4,Math.floor(i/2)),base=mouth.x+side*((shell?12:37)+spread*13);
    let endX=clamp(base,left+25,right-25);
    // Prefer an open sand pocket to dropping through a rock at the same depth.
    for(let probe=0;probe<18;probe++){
      const depth=clamp(z+.10*Math.floor(probe/6),.30,.83);
      const offset=Math.ceil((probe%6)/2)*14*(probe%2?1:-1);
      const x=clamp(base+offset,left+25,right-25);
      if(!coveredSand(x,depth)){z=depth;endX=x;break;}
    }
    const plan={...mouth,side,z,endX,elapsed:0,duration:(shell?2.8:3.7)+.18*(i%3),
      startAt:careNow()+1000*(2.25+.38*(i+1))};
    a.x=plan.x;a.y=plan.y;a.z=z;a.facing=a.yaw=side;
    if(shell){
      a.release={stage:'fall',elapsed:0,wallAngle:0,side,roll:0,vx:0,vy:0,spin:0,landing:plan};
      a.angle=0;a.lastBite=null;a.pass?.clear();
    }else a.arrival=plan;
  }
}
function startIntroduction(animals,area){
  if(!animals.length)return;
  const x=clamp(area.left+area.w*.51,left+75,right-75);
  const benthic=!animals[0].traits;
  introduction={animals,age:0,x,y:surface-100,side:x>600?-1:1,rx:Math.max(36,speciesCards[animals[0].species].width*.68+10),
    depthY:benthic?mix(surface,rowY(sandRow(.55),x),.53):surface+44,released:0,tip:0};
  if(benthic)planLandings(introduction);
  for(const a of animals)a.inNet=true;
  stage.scrollIntoView({block:'nearest'});updateStockPanel();
}
function stepIntroduction(dt){
  const n=introduction;if(!n)return;
  n.age+=dt;
  const entryTime=1.85,spacing=.38,last=entryTime+.55+n.animals.length*spacing;
  const lower=easeNet(n.age/entryTime);
  n.y=mix(surface-100,n.depthY,lower);
  if(n.age>entryTime){
    n.tip=approach(n.tip,-n.side*.27,2,dt);
    const count=Math.min(n.animals.length,Math.max(0,Math.floor((n.age-entryTime-.4)/spacing)));
    while(n.released<count){
      const a=n.animals[n.released++],dir=n.side;
      a.inNet=false;
      const mouth=netMouth(n);
      a.x=mouth.x;a.y=mouth.y;a.phase+=.5;
      if(a.traits){
        a.facing=dir;a.z=.78;
        a.yaw=dir;a.vx=dir*18;a.vy=5;a.target=null;a.inspect=null;
        a.depart={side:dir,x:clamp(a.x+dir*83,left+30,right-30),y:a.y+22,until:time+2.1};
        a.nextGoal=time+2.1;
      }else{
        const shell=a.species==='nerite',plan=shell?a.release.landing:a.arrival;
        Object.assign(plan,mouth,{startAt:careNow(),elapsed:0});
        if(shell){a.rest=0;a.at=careNow();saveSnail(a.at,a);}
        else{a.resting=false;a.tilt=0;}
      }
    }
  }
  for(const a of n.animals)if(a.inNet)a.phase+=dt*3.4;
  if(n.age>last){
    n.tip=approach(n.tip,0,3,dt);
    n.y=mix(n.depthY,surface-100,easeNet((n.age-last)/1.45));
  }
  if(!n.splashed&&n.y>surface){n.splashed=true;ripples.push({x:n.x,y:surface-6,age:0,strength:.37});}
  if(n.age>=last+1.45){
    for(const a of n.animals)a.inNet=false;
    introduction=null;if(n.animals.some(a=>a.species==='tetra'))globalThis.tankJournal?.record('stock-tetra');globalThis.tankJournal?.sync();if(typeof refreshOpening==='function')refreshOpening();careDirty=true;stockMessage(n.animals.length+' '+speciesCards[n.animals[0].species].unit+speciesCards[n.animals[0].species].name+'已入缸。');
    updateStockPanel();
  }
}
function bindResidents(){
  for(const [kind,card] of Object.entries(speciesCards)){
    const b=document.createElement('button'),img=new Image();b.type='button';b.dataset.kind=kind;
    img.alt='';img.src='assets/'+card.sprite+'.webp';b.append(img,card.name);$('#stock-species').append(b);
  }
  $('#residents-open').addEventListener('click',()=>showResidents(!managing));
  $('#stock-observe').addEventListener('click',()=>{
    const candidates=residents().filter(a=>a.species===stockKind);
    const c=camera();candidates.sort((a,b)=>Math.abs(a.x-c.left-c.w*.5)-Math.abs(b.x-c.left-c.w*.5));
    if(candidates.length){showResidents(false);observeAnimal(candidates[0]);}
  });
  $('#animal-exit').addEventListener('click',()=>observeAnimal(null));
  $('#residents-close').addEventListener('click',()=>showResidents(false));
  for(const mode of ['add','net'])$('#stock-mode-'+mode).addEventListener('click',()=>{
    stockMode=mode;stockTarget=null;stockMessage('');updateStockPanel();render();
  });
  $('#stock-species').addEventListener('click',e=>{
    const kind=e.target.closest('button')?.dataset.kind;if(!kind||globalThis.tankJournal&&!tankJournal.allows(kind))return;
    globalThis.tankJournal?.markSeen(kind);stockKind=kind;$('#stock-quantity').value='1';stockMessage('');updateStockPanel();
  });
  const input=$('#stock-quantity');
  for(const [id,delta] of [['stock-minus',-1],['stock-plus',1]])$('#'+id).addEventListener('click',()=>{
    input.value=clamp((input.valueAsNumber||0)+delta,1,Math.max(1,canAddCount(stockKind)));stockMessage('');updateStockPanel();
  });
  input.addEventListener('input',()=>{stockMessage('');updateStockPanel();});
  $('#stock-add').addEventListener('click',async()=>{
    if(stockBusy||introduction||landingNet)return;
    const kind=stockKind,count=input.valueAsNumber;stockBusy=true;updateStockPanel();
    try{
      const area=camera();
      const {result,saved}=await changeResidents(()=>{
        const animals=addResidents(kind,count,area);
        startIntroduction(animals,area);
        return animals.length;
      });

      if(result)globalThis.tankJournal?.markSeen(kind);
      const card=speciesCards[kind];
      stockMessage(result?'正在放入 '+result+' '+card.unit+card.name+'…'+(saved?'':'当前浏览器未能保存。'):'当前容量或数量已变化，请重新选择。');
      input.value='1';
    }catch{stockMessage('未能完成投放，可以重试。');}
    finally{stockBusy=false;updateStockPanel();render();}
  });
  $('#net-id').addEventListener('change',e=>selectResident(residents().find(a=>a.careId===e.target.value),true));
  $('#net-go').addEventListener('click',()=>startNet(stockTarget));
}

;
/* arrival-art */
'use strict';

// In the frontal plate the left pane lies between x=64 (front) and x=106 (back).
// Both cup rims share x=97 on that pane, with the motor projecting into open water.
const filterMount={x:96,y:270,w:57,h:103};
function pumpHit(point){
  const u=(point.x-filterMount.x)/filterMount.w,v=(point.y-filterMount.y)/filterMount.h;
  return (u>=.16&&u<=.79&&v>=0&&v<=1)
    || (u>=.65&&u<=1.03&&v>=.035&&v<=.145)
    || (u>=-.04&&u<.17&&((v>.14&&v<.39)||(v>.48&&v<.73)));
}

const drawResidentFilter=(()=>{
  const photo=new Image();
  photo.src='assets/glass-mounted-filter.webp';
  let wet;
  function wetPhoto(){
    // Keep the photographic seams and pore texture visible in transmitted green light.
    const plate=document.createElement('canvas');
    plate.width=photo.naturalWidth;plate.height=photo.naturalHeight;
    const g=plate.getContext('2d');
    g.drawImage(photo,0,0);g.globalCompositeOperation='source-atop';
    g.fillStyle='rgba(36,103,90,.18)';g.fillRect(0,0,plate.width,plate.height);
    return plate;
  }
  function cable(c,waterY){
    c.lineCap='round';
    // The double bend crosses the actual rear glass lip at (103,230).
    c.strokeStyle='rgba(40,51,45,.46)';c.lineWidth=1.35;
    c.beginPath();c.moveTo(99.4,waterY+.7);c.bezierCurveTo(99.6,246,100.2,233,102.3,230);
    c.bezierCurveTo(104.7,225.2,106.4,227.7,107.1,230.5);
    c.bezierCurveTo(108.2,238.4,106.3,247,106.1,waterY-.4);c.stroke();
    c.lineWidth=1.85;c.strokeStyle='rgba(45,61,55,.83)';
    c.beginPath();c.moveTo(106.2,waterY-.8);c.bezierCurveTo(106.6,waterY+7,107.6,272,106.3,278.7);c.stroke();
    c.lineWidth=.48;c.strokeStyle='rgba(151,165,142,.60)';c.beginPath();
    c.moveTo(107.2,waterY+1);c.quadraticCurveTo(108.1,270.5,107,276);c.stroke();
  }
  return function drawResidentFilter(c,t,drop,still){
    if(!photo.naturalWidth||!photo.complete)return;
    wet??=wetPhoto();
    const {x,y,w,h}=filterMount;
    const waterY=255+drop;
    c.save();c.imageSmoothingEnabled=true;
    cable(c,Math.min(waterY,273));

    // The side pane returns a faint, foreshortened image on the far side of the contact.
    c.save();c.translate(97,0);c.scale(-.40,1);c.globalAlpha=.085;
    c.drawImage(wet,0,y+.6,w,h);c.restore();
    for(const cupY of [y+27,y+63]){
      c.save();c.translate(96.9,cupY+.5);c.scale(2.4,11.8);
      const shade=c.createRadialGradient(0,0,.12,0,0,1);
      shade.addColorStop(0,'rgba(17,44,37,.39)');shade.addColorStop(1,'rgba(17,44,37,0)');
      c.fillStyle=shade;c.fillRect(-1,-1,2,2);c.restore();
    }
    c.drawImage(wet,x,y,w,h);
    if(waterY>y){
      // Drawdown exposes the upper housing. Follow the waterline across the same
      // fixed unit without raising the pump or moving its cups.
      c.save();c.beginPath();c.rect(x,y,w,Math.min(h,waterY-y));c.clip();
      c.drawImage(photo,x,y,w,h);c.restore();
    }
    const exitX=x+w*.988,exitY=y+h*.084;
    if(!still&&waterY<exitY){
      const filtering=typeof filterUntil!=='undefined'&&filterUntil>careTime;
      const fade=Math.min(1,(exitY-waterY)/8);
      c.lineCap='round';
      for(let i=0;i<4;i++){
        const u=(t*(filtering?.66:.43)+i*.265)%1;
        const dx=u*(filtering?44:35),py=exitY-.19*dx+.85*Math.sin(u*6+i);
        const opacity=fade*Math.sin(Math.PI*u)**2*(filtering?.31:.17);
        c.strokeStyle='rgba(183,209,183,'+opacity+')';c.lineWidth=.62;
        c.beginPath();c.moveTo(exitX+1+dx,py);c.quadraticCurveTo(exitX+4+dx,py-.9,exitX+7+dx,py-1.1);c.stroke();
      }
    }
    c.restore();
  };
})();

(()=>{
  const note=document.getElementById('opening-note');
  if(!note)return;
  const cover=document.createElement('button');
  cover.type='button';cover.className='mail-cover';cover.setAttribute('aria-label','拆信');cover.setAttribute('aria-expanded','false');cover.setAttribute('aria-controls','opening-copy');
  cover.innerHTML='<span class="mail-flap" aria-hidden="true"></span><span class="mail-address">给照看鱼缸的你</span><span class="mail-postage" aria-hidden="true"><img src="assets/white-cloud.webp" alt=""></span><span class="mail-open">拆信</span><span class="mail-sender">阿禾 寄</span>';
  note.prepend(cover);note.classList.add('has-envelope');
  const signature=document.createElement('span');signature.className='mail-signature';signature.textContent='阿禾';
  note.querySelector('.letter').append(signature);
  const key=(globalThis.tankSavePrefix||'')+'aquarium.arrival.envelope-read';
  let read=false;
  try{read=sessionStorage.getItem(key)==='1';}catch{}
  if(read)note.classList.add('mail-read');
  cover.addEventListener('click',()=>{
    note.classList.add('mail-read');cover.setAttribute('aria-expanded','true');
    try{sessionStorage.setItem(key,'1');}catch{}
    note.querySelector('#opening-action').focus({preventScroll:true});
  });
})();

;
/* field-journal */
'use strict';

const tankJournal=(()=>{
  const params=new URLSearchParams(location.search);
  const guided=!['care','scene','animal','watch','edit'].some(k=>params.has(k));
  const key=(globalThis.tankSavePrefix||'')+'aquarium.discoveries.1';
  const base={guppy:1,pebble:2,branch:1,anubias:1};
  // One observation opens one new species or material. Completed pages also refill familiar supplies.
  const pages=[
    ['bite','moss','第一餐','拿起饵瓶，在鱼前方的水里投一小撮，等它吃到第一口。','去投喂'],
    ['plant-moss','shrimp','给沉木添一点绿','放一小株莫丝，选好位置后保存造景。','种莫丝'],
    ['see-shrimp','stone','沙上的小住客','接来一只樱花虾，等它游出网兜，再近看它。','看樱花虾'],
    ['place-stone','crypt','给石头找个位置','把青石摆上沙面，或挪一挪缸里的青石，再保存。','摆青石'],
    ['clean','nerite','擦亮一小片玻璃','拿起刮片，顺着一块藻斑来回擦，看看擦过和没擦过的地方。','去擦玻璃'],
    ['plant-portrait','tetra','从小苗看到成株','在水草近观里，看看一株水草的成株预览。','近观水草'],
    ['stock-tetra','stems','一线银蓝','接一条灯鱼入缸，等它游出网兜。','去接灯鱼'],
    ['shape-bed','terrace','整理沙岸','在造景台选「底床」，堆起或压低一处沙面，然后保存。','整理底床'],
    ['attach','whiteCloud','让水草攀上石台','把一株水草附在层叠石上，再保存这处小景。','布置石台'],
    ['see-whiteCloud','glassShrimp','水里的金线','接来白云金丝鱼，近看它侧身时的一线金光。','看金丝鱼'],
    ['new-growth','pinnatifida','等一株水草长大','等亲手种下的水草进入下一生长阶段，再近看它的原株。','看生长进度'],
    ['plant-pinnatifida','arch','溪岸的新叶','给雨裂水蓑衣选个位置，种下后保存造景。','种雨裂水蓑衣']
  ];
  const names={guppy:'孔雀鱼',pebble:'小石',branch:'沉木',anubias:'小水榕',moss:'莫丝',shrimp:'樱花虾',stone:'青石',crypt:'椒草',nerite:'斑马螺',tetra:'灯鱼',stems:'茎草',terrace:'层叠石',whiteCloud:'白云金丝鱼',glassShrimp:'玻璃虾',pinnatifida:'雨裂水蓑衣',arch:'拱桥沉木'};
  const animalKinds=['guppy','shrimp','nerite','tetra','whiteCloud','glassShrimp'];
  const caps={guppy:4,pebble:6,branch:3,anubias:5,moss:7,shrimp:5,stone:4,crypt:5,nerite:2,tetra:6,stems:4,terrace:3,whiteCloud:4,glassShrimp:3,pinnatifida:4,arch:1};
  const data={version:2,level:0,read:[],legacy:{},cleanedPatch:false};
  let initialized=false,dialogStamp='';
  function merge(){
    let old;try{old=JSON.parse(localStorage.getItem(key));}catch{}
    if(!old)return;
    if(old.version===2){
      data.cleanedPatch||=old.cleanedPatch===true;
      data.level=Math.max(data.level,Math.min(pages.length,Math.max(0,Math.floor(Number(old.level)||0))));
      if(Array.isArray(old.read))data.read=[...new Set([...data.read,...old.read.filter(k=>Object.hasOwn(names,k))])];
      for(const [k,n] of Object.entries(old.legacy||{}))if(Object.hasOwn(names,k)&&Number.isSafeInteger(n))
        data.legacy[k]=Math.max(data.legacy[k]||0,n);
      return;
    }
    // Carry forward the old journal's actual unlocks, including stock a player did not put in the tank.
    const oldRows=[['guppy','pebble','branch','anubias'],['shrimp','moss'],['tetra','stone','crypt'],['whiteCloud','stems','terrace'],['glassShrimp','nerite','pinnatifida','arch']];
    const facts=Array.isArray(old.facts)?old.facts:[];
    let count=0;for(const f of ['bite','plant','welcome','observe']){if(!facts.includes(f))break;count++;}
    for(const k of [...oldRows.slice(0,count+1).flat(),...(Array.isArray(old.owned)?old.owned:[])]){
      if(Object.hasOwn(names,k)){data.legacy[k]=Math.max(1,data.legacy[k]||0);if(!data.read.includes(k))data.read.push(k);}
    }
    while(data.level<pages.length&&data.legacy[pages[data.level][1]])data.level++;
  }
  function save(){try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
  function init(){
    merge();
    if(guided){
      const counts={};
      for(const k of [...residents().map(a=>a.species),...layout.map(p=>p.kind)])counts[k]=(counts[k]||0)+1;
      for(const [k,n] of Object.entries(counts))data.legacy[k]=Math.max(n,data.legacy[k]||0);
      save();
    }
    initialized=true;sync();
  }
  function amount(kind){
    if(!guided)return Infinity;
    const row=pages.findIndex(p=>p[1]===kind),start=Object.hasOwn(base,kind)?0:row+1;
    const owned=data.legacy[kind]||0;
    if(!Object.hasOwn(names,kind)||data.level<start)return owned;
    const gift=base[kind]||1,age=data.level-start;
    // A completed collection supplies enough of each material to use every reference composition.
    const stock=data.level===pages.length?caps[kind]:Math.min(caps[kind],gift+Math.floor(age/2));
    return Math.max(stock,owned);
  }
  function allows(k){return amount(k)>0;}
  function available(kind,items=layout){
    const count=animalKinds.includes(kind)?residents().filter(a=>a.species===kind).length:items.filter(p=>p.kind===kind).length;
    return Math.max(0,amount(kind)-count);
  }
  function markSeen(kind){
    if(!guided||!initialized||!Object.hasOwn(names,kind)||!allows(kind)||data.read.includes(kind))return;
    merge();data.read.push(kind);save();sync();
  }
  function record(fact){
    if(!guided||!initialized)return;
    merge();
    const facts=Array.isArray(fact)?fact:[fact];
    if(facts.includes('clean')&&!data.cleanedPatch){data.cleanedPatch=true;save();}
    if(!facts.includes(pages[data.level]?.[0]))return;
    ++data.level;
    // Previously collected items keep their place when upgrading an older tank.
    while(data.level<pages.length&&data.legacy[pages[data.level][1]]&&data.read.includes(pages[data.level][1]))data.level++;
    save();sync();
  }
  function countsFor(items){const counts={};for(const p of items)counts[p.kind]=(counts[p.kind]||0)+1;return counts;}
  function layoutReason(items){
    if(!guided)return '';
    for(const [k,n] of Object.entries(countsFor(items))){
      if(!allows(k))return '手记还未解锁'+names[k]+'。';
      if(n>amount(k))return names[k]+'需要 '+n+' 份，现有 '+amount(k)+' 份。继续写手记可补充。';
    }
    return '';
  }
  const presetCounts=new Map();
  function presetReason(name){
    if(!guided)return '';
    if(!presetCounts.has(name))presetCounts.set(name,composition(name));
    return layoutReason(presetCounts.get(name));
  }
  function fresh(kind){return !Object.hasOwn(base,kind)&&allows(kind)&&!data.read.includes(kind);}
  function pageHint(page){
    if(page[0]==='clean'&&data.cleanedPatch)return '先前已经擦亮过一小片玻璃了。看看那道擦痕，把它记进手记。';
    return page[3];
  }
  function showBook(){
    const dialog=document.getElementById('discovery-book');if(!dialog?.open)return;
    const stamp=data.level+'/'+data.read.join(',');if(dialogStamp===stamp)return;dialogStamp=stamp;
    const page=pages[data.level],list=dialog.querySelector('ol');
    dialog.querySelector('.book-count').textContent='已记下 '+data.level+' / '+pages.length+' 项发现';
    dialog.querySelector('.book-next').textContent=page?pageHint(page)+' 这页完成后可领取'+names[page[1]]+'。':'这一册收齐了。鱼、草和缸边的日常仍在继续。';
    list.replaceChildren();
    for(let i=0;i<pages.length;i++){
      const row=document.createElement('li'),state=document.createElement('small'),title=document.createElement('span');
      title.textContent=i<=data.level?pages[i][2]:'尚未翻开的记录';
      state.textContent=i<data.level?names[pages[i][1]]+' · 已领':i===data.level?'下一页 · '+names[pages[i][1]]:'未发现';
      row.className=i===data.level?'current':i<data.level?'done':'later';row.append(title,state);list.append(row);
    }
  }
  function sync(){
    if(!initialized)return;
    const page=pages[data.level],guide=document.querySelector('#next-discovery'),book=document.querySelector('#journal-open');
    book.hidden=!guided||openingActive();book.querySelector('span').textContent=data.level+' / '+pages.length;
    guide.hidden=!guided||!page||openingActive()||editing||managing||!!watchState||!!observedAnimal||!!introduction||feedingArmed||wipingGlass||siphoning;
    if(!guide.hidden){
      guide.querySelector('strong').textContent=page[2];
      guide.querySelector('span').textContent=data.level===0&&!fish.length?'先接来一条孔雀鱼，再看看它怎样吃第一餐。':pageHint(page);
      guide.querySelector('button').textContent=data.level===0&&!fish.length?'去挑生物':page[0]==='clean'&&data.cleanedPatch?'记下擦痕':page[4];
    }
    for(const [animals,id] of [[true,'residents-open'],[false,'edit']]){
      const b=document.getElementById(id),hasNew=guided&&pages.some(([,k])=>animalKinds.includes(k)===animals&&fresh(k));
      b.classList.toggle('has-discovery',hasNew);
      b.setAttribute('aria-label',b.textContent.trim()+(hasNew?'，有新解锁':''));
    }
    for(const b of document.querySelectorAll('#stock-species button,#palette button')){
      const k=b.dataset.kind,palette=b.parentElement.id==='palette';
      b.hidden=!allows(k);
      const unread=guided&&fresh(k);
      b.classList.toggle('unread-item',unread);
      if(guided&&!b.hidden){
        const left=available(k),max=amount(k),label='余 '+left+' / '+max;
        if(b.dataset.stock!==label)b.dataset.stock=label;
        b.setAttribute('aria-label',(palette?'添加':'')+names[k]+(unread?'，新解锁':'')+'，'+label);
      }
    }
    for(const option of document.querySelector('#presets').options){
      if(!option.value)continue;
      const reason=presetReason(option.value);
      if(option.disabled!==!!reason)option.disabled=!!reason;
      if(option.dataset.lockReason!==reason)option.dataset.lockReason=reason;
    }
    showBook();
  }
  function taskAction(){
    const fact=pages[data.level]?.[0];if(!fact)return;
    if(fact==='bite'&&fish.length){setFeedingTool(true);return;}
    if(['see-shrimp','stock-tetra','see-whiteCloud','bite'].includes(fact)){
      const kind={'see-shrimp':'shrimp','stock-tetra':'tetra','see-whiteCloud':'whiteCloud',bite:'guppy'}[fact];
      const a=residents().find(a=>a.species===kind);
      if(a&&fact!=='bite'){observeAnimal(a);return;}
      stockKind=kind;showResidents(true);return;
    }
    if(fact==='clean'&&data.cleanedPatch){record('clean');return;}
    if(fact==='clean'){roomDrawer('care');if(!wipingGlass)$('#wipe-glass').click();return;}
    if(fact==='plant-portrait'||fact==='new-growth'){
      const candidates=layout.filter(p=>plantLife[p.kind]);
      if(candidates.length){
        const own=candidates.filter(p=>Number.isFinite(p.plantedAt)).sort((a,b)=>a.plantedAt-b.plantedAt);
        if(fact==='plant-portrait'||own.length){openWatch((own[0]||candidates[0]).id);return;}
      }
    }
    beginEdit(fact==='shape-bed'?'bed':'objects');
  }
  function bind(){
    $('#next-discovery button').addEventListener('click',taskAction);
    const book=$('#discovery-book');
    $('#journal-open').addEventListener('click',()=>{book.showModal();dialogStamp='';showBook();});
    book.querySelector('button').addEventListener('click',()=>book.close());
    window.addEventListener('storage',e=>{if(e.key===key&&initialized){merge();sync();if(managing)updateStockPanel();}});
  }
  return {init,bind,sync,record,markSeen,allows,available,amount,earnedNerite:()=>guided&&allows('nerite'),layoutReason,presetAllowed:name=>!presetReason(name),firstMeal:()=>guided&&data.level===0};
})();
globalThis.tankJournal=tankJournal;

;
/* observations */
'use strict';

// These describe the simulation's separate suspended and dissolved waste pools.
function waterClues({cloud,load,crumbs,soft,filtering,exchange,unsettled}){
  if(exchange==='low')return ['refill',['水位已经停在这里了。去「养护」点一下补水，水就会慢慢回来。']];
  if(exchange==='fill')return ['filling',['沿缸边有一小股新水，水位正一点点升回去。']];
  if(exchange==='drain')return ['draining',['水位在往下走。现在顺着沙面划一下，也能捎走残饵。']];
  if(filtering)return ['polishing',crumbs?['细滤棉在收水里的细屑。沙上那几片残饵，还可以用吸底管带走。','水泵正忙着过滤。底砂上那几片饵，还得用吸底管带走。']:['细滤棉正在收细屑。等这一轮结束，再看远处的叶缘清楚了没有。','沙面已经干净了。水还在走细滤，先让它慢慢透起来。']];
  if(unsettled)return ['rest',['刚连着换过水。让鱼在安静的水里缓一会儿。','进水口附近刚有过几次水流变化，先让缸里安定下来。']];
  if(soft&&cloud>.095)return ['old-food',['沙上那几片饵已经泡软了，水也有些发蒙。用「养护」里的吸底管沿沙面划一下吧。','剩饵在水里慢慢散开，远处的草叶都模糊了。先吸走残饵，下一餐少撒一点。']];
  if(crumbs&&cloud>.095)return ['crumbs',['水已经有些蒙了，沙面上又留了碎饵。先把看得见的几片吸走吧。','这几片食物还在沙上。「养护」里的吸底管，正好够得着它们。']];
  if(cloud>.095&&load>1.15)return ['both',['沙上看不见饵了，细屑还浮在水里。开一轮精滤，先看看水色。','先前的残饵已有一部分溶进水里。换四分之一的水，可以慢慢稀释它。']];
  if(cloud>.095)return ['haze',['沙面已经干净，远处却还有点雾。「养护」里的精滤可以收走悬浮的细屑。','这层雾还浮在水里。让细滤走一轮，再看后面那片叶子。']];
  if(load>1.15)return ['dissolved',['水看着清了，之前的剩饵还有一部分溶在水里。换四分之一的水有帮助。','沙上找不到那些碎饵了，水里却还留着分解物。下回可以趁它们完整时吸走。']];
  if(soft)return ['soft',['残饵的边缘已经泡软了。趁还看得见，用吸底管把它带走吧。','鱼没吃完的碎饵正慢慢散开。下一餐可以少撒一点。']];
  if(crumbs)return ['fresh',['刚落下的几片饵还很完整。等鱼游开，再看看有没有剩在沙上的。','有一小片饵停在底砂上，这时候最容易找到它。']];
  return ['',[]];
}
function scrapedGlassState(r,final){
  if(r.travel<12)return null;
  if(r.lifted<.25)return final||r.travel>35?'clear-area':null;
  if(r.dirtyTravel<12)return 'started';
  const remaining=1-r.lifted/Math.max(.01,r.initial);
  if(remaining<.10)return final?'clean':'nearly-clean';
  if(remaining<.32)return 'thin';
  return 'started';
}
function feedingResponse(batch,swimmers,flakes){
  if(!swimmers.length)return 'empty';
  if(swimmers.some(f=>f.target?.batch===batch&&!f.inspect))return 'following';
  // Use the same stop-eating threshold as biteWithinReach(), including near-satiated fish.
  if(swimmers.every(f=>hunger(f)<=.01))return 'full';
  if(swimmers.some(f=>f.examined===batch||f.target?.batch===batch&&f.inspect))return 'curious';
  return flakes.some(p=>p.batch===batch&&!p.taken)?'unnoticed':'ended';
}
const tankNotes=(()=>{
  const strip=document.querySelector('#tank-notes'),subject=strip.querySelector('strong'),phrase=strip.querySelector('span');
  const recent=[];
  let until=0,details=null,checkedAt=-Infinity,waterState='',careTurn=false;
  let action=null,meal=null,usingWiper=false;
  const lastAction=new Map();
  const wipePhrases={
    'clear-area':['刮片从透明的地方滑过去了。试试旁边那点绿。','这一道原本就很清，往有藻斑的地方挪一点。'],
    started:['刮片带走了一道绿，厚的地方还有一点留在玻璃上。','玻璃先透出一道窄缝，顺着刚才的方向再来一下。'],
    thin:['这道藻印变薄了，再沿原路轻轻刮一遍。','还剩一层淡绿，来回擦一下就好。'],
    'nearly-clean':['这一小道快擦透了，边上只剩零星几粒绿。','刮过的地方透亮了起来，手可以放轻一点。'],
    clean:['这一小片擦透了。透过刚才的藻斑，能看见后面的水了。','刚刮过的这一道干净了，松手看看吧。']
  };
  const mealPhrases={
    empty:['这一撮在水里慢慢沉。缸里还没有游过来接食的鱼。'],
    following:['有条鱼已经朝这撮食物游过去了，先等等它。','鱼头已经调了个方向，食物还在慢慢往下落。'],
    full:['这一撮迟迟没鱼来吃。它们肚子已经饱了，先收起饵瓶吧。','鱼已经吃饱了。剩下的几粒要是落了底，可以用吸底管带走。'],
    curious:['有鱼凑近看过了，还没有咬这一口。先让饵再漂一会儿。'],
    unnoticed:['这撮饵还在下沉，暂时没见鱼追过去。等一等，下回可以撒在鱼头前面。'],
    ended:['鱼食落下去了。看看沙面上还剩几粒，下一撮可以晚些再给。']
  };
  function say(key,name,lines,context,hold=6100){
    const now=performance.now(),previous=lastAction.get(key);
    if(key===action?.key&&now<action.until)return;
    if(previous!==undefined&&now-previous<1450)return;
    lastAction.set(key,now);
    action={key,context,until:now+hold};
    details=null;show(name,lines,true);
  }
  function scraped(r,final){
    const state=scrapedGlassState(r,final);
    if(!state)return;
    // At normal touch sampling a swipe can progress through several stages in one frame.
    if(!final&&action?.context==='wipe'&&performance.now()-(lastAction.get(action.key)??0)<850)return;
    say('wipe-'+state,'刮片',wipePhrases[state],'wipe');
  }
  function planted(p){
    if(!p||!plantLife[p.kind]||!Number.isFinite(p.plantedAt))return;
    const spec=plantLife[p.kind],age=plantAge(p),name=catalog[p.kind].name;
    const hours=(plantClock(p)-p.plantedAt)/3600000;
    const anchored=p.host?'这株苗已安在木石上':'这株苗已落在底床上';
    const line=age>=2?'这株已长成，枝叶正好在这里舒展开来。':
      anchored+'。约 '+growthDuration(spec.hours[age]-hours)+'后能看到'+spec.names[age+1]+'。';
    say('plant-'+p.id,name,[line],'plant',8200);
  }
  function fed(batch){
    meal={batch,start:time,reported:false};
    say('feed-cast','鱼食',['一小撮饵散开了，看看哪一粒先被发现。'],'feed',2750);
  }
  function ate(f,p){
    if(!meal||p.batch!==meal.batch)return;
    meal=null;
    if(editing||managing||wipingGlass||siphoning||waterChange||watchState||(details&&performance.now()<until))return;
    const name=speciesCards[f.species].name;
    say('first-bite',name,['它的嘴尖轻轻一合，这一粒已经吃到了。','有一粒在它嘴边不见了，尾鳍轻轻一摆，又游开了。'],'feed',5600);
  }
  function vacuumed(count){
    if(!count)return;
    const clear=!residue.length;
    const lines=clear?(turbidity>.095?['沙上最后几片饵已经吸走，水里的细屑还要慢慢滤。']:['最后几粒残饵离开了砂面，吸底管可以收起来了。']):
      ['管口掠过的那几粒已经被吸走。慢慢沿着沙面找，还有一些。'];
    say(clear?'vacuum-finished':'vacuum-started','吸底管',lines,'vacuum');
  }
  function advanceActions(now){
    if(wipingGlass&&!usingWiper){
      say('wipe-tool','刮片',['找玻璃上的绿藻，贴着它来回划一小段。'],'wipe',6000);
    }
    usingWiper=wipingGlass;
    if(meal&&!meal.reported&&time-meal.start>=3.2){
      meal.reported=true;
      if(!editing&&!managing&&!wipingGlass&&!siphoning&&!waterChange&&!watchState){
        const swimmers=fish.filter(f=>!f.inNet);
        const state=feedingResponse(meal.batch,swimmers,food);
        // A player may have already tapped another subject while the first flakes were falling.
        const lines=state==='full'&&swimmers.length===1?['这条鱼已经吃饱了。先把饵瓶收起来，看它自在地游一会儿。']:mealPhrases[state];
        if(!details||now>=until)say('feeding-'+state,'投喂',lines,'feed');
      }
    }
    if(meal&&time-meal.start>24)meal=null;
    if(!action)return false;
    const permitted=ready&&!managing&&!watchState&&(!editing||action.context==='plant')&&
      (!openingActive()||['wipe','feed','fish'].includes(openingStep));
    if(now<action.until&&permitted){strip.hidden=false;return true;}
    action=null;until=0;return false;
  }
  function currentClues(){
    const at=careNow();
    return waterClues({cloud:turbidity,load:organicLoad,crumbs:residue.length,
      soft:residue.some(p=>at-p.arrived>=softeningMs),filtering:filterUntil>at,
      exchange:waterChange?.stage,unsettled:fish.some(f=>fishUnease(f)>.2)});
  }
  function pick(lines){
    const fresh=lines.filter(line=>!recent.includes(line));
    const pool=fresh.length?fresh:lines.filter(line=>line!==recent.at(-1));
    const choices=pool.length?pool:lines;
    const chosen=choices[Math.floor(Math.random()*choices.length)];
    recent.push(chosen);if(recent.length>9)recent.shift();
    return chosen;
  }
  const readyToRead=()=>ready&&(!openingActive()||openingStep==='feed'&&!introduction&&!feedingArmed)&&!editing&&!managing&&!watchState;
  function show(name,lines,personal){
    subject.textContent=name;phrase.textContent=pick(lines);strip.hidden=false;
    strip.classList.toggle('inspected',personal);
    // Only a player-requested observation is announced by a screen reader.
    if(personal)$('#spoken-observation').textContent=name+'。'+phrase.textContent;
  }
  function animal(a){
    if(isShrimp(a.species)){
      if(a.escape)return ['尾巴一弹，原来的位置只剩下一点水纹。','刚才还在这里，眨眼就往后退了一截。'];
      if(a.gut>.28)return ['朝着光看，透明的头胸部里透出一点绿。','两根触须下面，有一小团淡绿的颜色。'];
      if(!a.resting)return ['身体轻轻一弯，腹下细小的划动连成了一片。','看尾尖，比看它整只更容易看出它在动。'];
      return ['触须先朝外探了探，身体还留在原处。','趴下来以后，小小的腹足都贴在肚子下面。','隔着玻璃，它的细须比身子还难找。'];
    }
    if(a.species==='nerite'){
      if(a.release?.stage==='fall')return ['小壳正缓缓往下沉，底砂上的影子和它越来越近。'];
      if(a.release?.stage==='bed')return a.release.landing&&a.release.elapsed>5?['把旁边的砂粒作个记号，它正贴着砂面往前挪。']:['小壳停在底砂上，壳口下方慢慢探出柔软的腹足。'];
      if(a.release?.stage==='climb')return ['腹足攀上了前玻璃，小壳正慢慢离开砂面。'];
      return a.rest>.1?['它停在玻璃上，壳上的条纹正好能数一数。','刚刚经过这里的小壳歇了下来。']:['别盯着壳，拿旁边那粒藻作记号，再看它挪了多远。','玻璃上的条纹小壳，过一会儿再看就换了位置。'];
    }
    if(a.peckAge<1.8)return ['嘴尖刚轻轻一合，一粒鱼食就不见了。','它刚啄了一口，又留出一点距离转身。'];
    if(a.target)return a.inspect?['它凑近了，像要弄清那粒东西是什么。','鱼嘴和食物之间，还留着一点距离。']:['它的头转过去了，正盯着那一小粒鱼食。','鱼食慢慢往下落，它也在调整靠近的角度。'];
    if(hunger(a)<=.01)return ['肚子已经饱了，这会儿可以慢慢看它游。','这一餐吃得挺足，饵瓶可以在桌上歇会儿。'];
    if(a.depart?.until>time)return ['刚游开一小段，尾巴还顺着那个方向摆。','看尾鳍，它正把身体送往前方。'];
    if(fishUnease(a)>.2)return ['它在避开刚补水的那一侧。','离开进水口后，它游得更谨慎了。'];
    if(a.species==='guppy')return ['薄薄的尾缘透着光，转身时才看清那抹橘。','它转到侧面的时候，尾巴像一片摊开的橘皮。','黑眼睛很稳，身后的尾鳍却一刻也没停。'];
    if(a.species==='whiteCloud')return ['身体稍稍一侧，那道金线就亮了。','从眼后看到尾柄，有一条很细的亮线。'];
    return ['银蓝的小亮线转个角度，又藏回水里。','侧身的一瞬，比迎面游过来时显眼多了。'];
  }
  function object(p){
    if(plantLife[p.kind]){
      const stage=plantAge(p);
      if(stage===0)return ['还是一小株，叶尖和沙面挨得很近。',growthReading(p),'眼前这点绿才刚开始长，留点空位给它。'];
      if(stage===1)return ['已经过了幼株期，枝叶还会继续铺开。',growthReading(p)];
      const byKind={moss:'沉木上这一小簇绿，细看才分得出一根根枝尖。',anubias:'厚叶把灯光托住了，叶柄下面留着一小片阴影。',crypt:'叶片从基部散开，叶缘一明一暗。',pinnatifida:'从叶柄往外看，裂开的叶缘像细小的羽片。',stems:'顺着茎往上看，最上面的叶尖先碰到光。'};
      return [byKind[p.kind]||'叶尖轻轻摇着，根部仍留在原处。','已经长成了，这株水草现在的轮廓就是它的株形。'];
    }
    const lines={arch:['拱洞中间透着水色，木头前后各有一层影子。','顺着弧形木脊往下看，底下还留了一条路。'],branch:['木纹拐了个弯，细枝从那里伸出去。','枝条之间的空隙，也成了这片造景的一部分。'],terrace:['一层薄石沿着另一层伸出来，下面留了道窄缝。','迎着灯的一面，石层边缘显得格外细。'],stone:['青石贴着底砂，石脚边的颜色深了一点。','同一块石头，棱角比凹处先接到光。'],pebble:['这粒小石子圆圆的，边缘贴着一圈细砂。','轮廓很低，把旁边的木头衬得更高了。']};
    return lines[p.kind];
  }
  function ambient(){
    const name=document.body.dataset.tone;
    const pool={day:['水面接住了窗边的光，又把碎光送到底砂上。','沙面比木头亮，鱼游过去时轮廓格外清楚。','水面轻轻晃一下，倒影就跟着挪了一点。'],dawn:['清晨的水色很浅，背光的一侧还带着凉意。','先亮起来的是水面，然后才是下面的细砂。','窗边的天光正柔，叶尖的影子也很淡。'],dusk:['窗边的余光斜了一点，木纹的明暗也跟着变了。','余晖落在水面，缸底的颜色却安静些。','水里还留着一点暖色，缸灯已经微微亮起。'],night:['缸灯下面亮着一小片水，四周慢慢暗下去。','房间暗下来，沙粒上的亮点倒比白天好找。','灯管的倒影在水面抖了抖，又连成一条。']}[name]||[];
    const lines=[...pool,'仔细看水泵的出口，有一缕很轻的水流。','玻璃把水留在里面，也把房间的一点光留在水面。'];
    if(turbidity>.2)lines.push('隔着这层水看，后面的轮廓有些发软。','水里细小的悬浮物，让远处像隔了一层雾。');
    else if(turbidity<.08)lines.push('今天的水挺清，连底砂的颗粒都能分出来。');
    if(filterUntil>careNow())lines.push('细滤正在工作，水里的细屑会慢慢少下来。');
    if(residue.length)lines.push('底床上留了几粒碎饵，和沙粒的颜色很接近。');
    if(layout.some(p=>plantLife[p.kind]&&plantAge(p)<2))lines.push('缸里还有幼株，今天看到的轮廓往后还会变。');
    const nearby=camera(),visible=a=>a.x>nearby.left&&a.x<nearby.left+nearby.w&&a.y>nearby.top&&a.y<nearby.top+nearby.h&&!a.inNet;
    const browsing=shrimp.find(a=>visible(a)&&a.resting&&a.perch);
    if(browsing?.perch.type==='leaf')lines.push('那片叶子上多了两根细须。仔细看，是一只小虾。');
    if(browsing?.perch.type==='hard')lines.push('木石表面有个小身影停住了，只有细须还在动。');
    if(fish.some(f=>visible(f)&&f.target))lines.push('有条鱼悄悄改了方向，它跟前正飘着一粒饵。');
    if([...glassDwellers].some(n=>visible(n)&&onGlass(n)))lines.push('玻璃上的小壳挪得很慢，隔一会儿再看更容易发现。');
    if(fish.length===1)lines.push('缸里只有一条鱼，下一次转身很容易认出它。');
    if(!fish.length)lines.push('缸里还没有鱼，水泵依然轻轻推着水。');
    return lines;
  }
  function inspect(point){
    if(!readyToRead())return;
    action=null;
    const a=pickResident(point),geo=geometry(layout);
    const p=sorted(layout,geo).reverse().find(p=>hits(p,geo.get(p.id),point));
    if(a&&!a.inNet&&(!p||a.species==='nerite'&&onGlass(a)||(a.z??1)>=geo.get(p.id).depth))details=[speciesCards[a.species].name,animal(a)];
    else if(p)details=[catalog[p.kind].name,object(p)];
    else if(pumpHit(point))details=['水泵',filterUntil>careNow()?['细滤正在运行，出口旁有一股更紧的水流。','水正穿过细滤棉，悬浮的小颗粒会留在里面。']:['看出水口前面的水纹，一圈还没散，下一圈就来了。','这只小水泵一直开着，水从下方那排窄缝进去。']];
    else if(Math.abs(point.y-surface)<16&&currentClues()[0])details=['水面',currentClues()[1]];
    else if(Math.abs(point.y-surface)<16)details=['水面',['刚碰过的地方泛起水纹，旁边的倒影轻轻晃了一下。','一圈波纹刚散开，水面又慢慢接了起来。']];
    else if(residue.some(f=>{const p=floorPoint(f);return Math.hypot(point.x-p.x,point.y-p.y)<14*worldPerPixel;}))details=['沉底的鱼食',['鱼食落稳了，仔细看，和旁边的沙粒不太一样。','一小片饵歇在砂面上，可以用吸底管带走。']];
    else if(sandContains(point.x,point.y,1))details=[bedStyleNames[terrain.style],terrain.style==='soil'?['深色的颗粒把上面的绿叶衬得很清楚。','泥粒之间留着细小空隙，近看更明显。']:['仔细看，紧挨着的几粒砂也各有各的颜色。','贴近沙面看，亮处和背光处只隔着几粒砂。']];
    else if(glassSpots.some(s=>Math.abs(point.x-s.x)<5&&Math.abs(point.y-s.y)<5&&glassStrength(s,careNow())>.22))details=['前玻璃',['这一点绿贴在玻璃上，后面的水还看得清。','小小的藻斑聚在一起，边缘比中间薄。']];
    else if(inFeedingWater(point)&&currentClues()[0])details=['水体',currentClues()[1]];
    else{details=null;until=0;tick(performance.now());return;}
    if(details[0]==='沉底的鱼食'&&currentClues()[0])details[1]=currentClues()[1];
    if(details[0]==='水泵'&&turbidity>.095)details[1]=currentClues()[1];
    show(details[0],details[1],true);until=performance.now()+7600;
  }
  function tick(now){
    if(advanceActions(now))return;
    if(!readyToRead()){strip.hidden=true;return;}
    if(details&&now<until&&!strip.hidden)return;
    if(!strip.hidden&&now<until&&now-checkedAt<1500)return;
    checkedAt=now;
    const [state,clues]=currentClues(),changed=state!==waterState;
    if(!strip.hidden&&now<until&&!changed)return;
    details=null;waterState=state;
    careTurn=!!state&&(changed||!careTurn);
    show(careTurn?'水体':'缸边',careTurn?clues:ambient(),false);
    until=now+14000+Math.random()*4000;
  }
  return {tick,inspect,scraped,planted,fed,ate,vacuumed};
})();

;
/* window-room */
'use strict';

function inRoom(){return !editing&&!managing&&!watchState&&!observedAnimal;}

function roomCamera(rect,lens,position){
  const aspect=rect.width/Math.max(1,rect.height);
  const h=lens==='full'?Math.max(685,1220/aspect):Math.max(518,Math.min(595,920/aspect));
  const w=h*aspect;
  // The counter has a fixed depth in the room, even when seen through a tall phone.
  // Stepping back reveals the cabinet doors beneath the slim stone counter.
  const below=lens==='full'?Math.min(525,Math.max(0,(h-730)*.46)):0;
  return {h,w,left:w>=1164?(1200-w)/2:18+(1164-w)*position,top:733+below-h};
}

function tankOutline(c){
  c.beginPath();c.moveTo(59,239);c.lineTo(112,226);c.lineTo(1086,226);
  c.lineTo(1140,239);c.lineTo(1140,692);c.lineTo(59,692);c.closePath();
}

let alcovePlate=null,alcoveKey='',rimMatte=null,rimPhoto=null,rimGrade='';
function glassRim(){
  // The strip of air between glass and water transmits the new wall colour.
  // Keep the photographed specular edges and waves where they differ from plaster.
  const y0=225,h=53;
  if(!rimMatte){
    rimMatte=document.createElement('canvas');rimMatte.width=W;rimMatte.height=h;
    const m=rimMatte.getContext('2d'),out=m.createImageData(W,h),p=originalPixels.data;
    for(let y=0;y<h;y++)for(let x=0;x<W;x++){
      const i=4*(y*W+x),a=4*((y+y0)*W+x),b=4*(215*W+x);
      const diff=Math.max(Math.abs(p[a]-p[b]),Math.abs(p[a+1]-p[b+1]),Math.abs(p[a+2]-p[b+2]));
      out.data[i+3]=255*Math.max(.12,smooth(9,37,diff),smooth(258,275,y+y0));
    }
    m.putImageData(out,0,0);
    rimPhoto=document.createElement('canvas');rimPhoto.width=W;rimPhoto.height=h;
  }
  if(rimGrade!==oldGrade){
    const c=rimPhoto.getContext('2d');c.clearRect(0,0,W,h);c.drawImage(base,0,-y0);
    c.globalCompositeOperation='destination-in';c.drawImage(rimMatte,0,0);c.globalCompositeOperation='source-over';rimGrade=oldGrade;
  }
  return rimPhoto;
}
function drawAlcove(target,cam){
  if(cam.left>=61&&cam.left+cam.w<=1138&&cam.top>=279&&cam.top+cam.h<=690)return;
  const pw=Math.min(canvas.width,1440),ph=Math.max(1,Math.round(pw*cam.h/cam.w));
  const key=[pw,ph,cam.left,cam.top,cam.h,oldGrade].join('/');
  if(key!==alcoveKey){
    alcoveKey=key;alcovePlate??=document.createElement('canvas');
    if(alcovePlate.width!==pw||alcovePlate.height!==ph){alcovePlate.width=pw;alcovePlate.height=ph;}
    const c=alcovePlate.getContext('2d'),scale=pw/cam.w,bottom=cam.top+cam.h,right=cam.left+cam.w;
    c.setTransform(scale,0,0,scale,-cam.left*scale,-cam.top*scale);
    const wall=sprites['window-alcove'],stone=sprites['limestone-surface'];
    const full=roomCamera({width:pw,height:ph},'full',.5);
    const top=Math.min(-210,full.top-72),edge=639,ww=Math.max((edge-top)*1.5,full.w+170);
    const wx=Math.min(full.left-35,78-ww*.115);
    c.drawImage(wall,wx,top,ww,edge-top+1);
    if(wx+ww<right)c.drawImage(wall,wall.width-10,0,10,wall.height,wx+ww-.5,top,right-wx-ww+1,edge-top+1);
    if(bottom>edge){
      c.save();c.beginPath();c.rect(cam.left,edge,cam.w,bottom-edge+1);c.clip();
      c.translate(0,edge);c.scale(.86,.22);
      c.fillStyle=c.createPattern(stone,'repeat');c.fillRect(cam.left/.86,-1,cam.w/.86,(bottom-edge+1)/.22+1);
      c.restore();
      const seam=c.createLinearGradient(0,edge,0,edge+14);
      seam.addColorStop(0,'rgba(52,54,43,.17)');seam.addColorStop(1,'rgba(52,54,43,0)');
      c.fillStyle=seam;c.fillRect(cam.left,edge,cam.w,15);
      c.save();c.translate(600,691);c.scale(581,12);
      const contact=c.createRadialGradient(0,0,.12,0,0,1);
      contact.addColorStop(0,'rgba(31,42,33,.48)');contact.addColorStop(.86,'rgba(31,42,33,.30)');contact.addColorStop(1,'rgba(31,42,33,0)');
      c.fillStyle=contact;c.fillRect(-1,-1,2,2);c.restore();
    }
    const lip=733,face=742;
    if(bottom>lip){
      c.fillStyle='#a7a597';c.fillRect(cam.left,lip,cam.w,9);
      c.fillStyle='#c3c1b5';c.fillRect(cam.left,lip,cam.w,1.5);
      c.fillStyle='#656b59';c.fillRect(cam.left,face,cam.w,Math.max(0,bottom-face));
      const cabinet=sprites['sage-cabinet'],tile=1500;
      for(let x=Math.floor((cam.left+132)/tile)*tile-132;x<right;x+=tile){
        c.drawImage(cabinet,x,face,tile,670);
      }
      const shade=c.createLinearGradient(0,face,0,face+23);
      shade.addColorStop(0,'rgba(22,29,24,.43)');shade.addColorStop(1,'rgba(22,29,24,0)');
      c.fillStyle=shade;c.fillRect(cam.left,face,cam.w,24);
    }
    const [dawn,day,dusk,night]=mood;
    c.globalCompositeOperation='multiply';
    const rgb=[216*dawn+255*day+231*dusk+69*night,
      232*dawn+255*day+185*dusk+89*night,238*dawn+255*day+164*dusk+115*night];
    c.fillStyle='rgb('+rgb.map(Math.round).join(',')+')';c.fillRect(cam.left,cam.top,cam.w,cam.h);
    c.globalCompositeOperation='source-over';
  }
  target.drawImage(alcovePlate,cam.left,cam.top,cam.w,cam.h);
}

;
/* tank-gestures */
'use strict';

let manualLens=null,moveCareView=false;
function cameraScope(){return watchState||observedAnimal||(editing?'edit':managing?'stock':'room');}
function lensLimits(full,h,aspect){
  const w=h*aspect,left=Math.min(18,(1200-w)/2);
  const extended=full.top+full.h-733;
  const bottom=733+extended*Math.max(0,1-(1-h/full.h)*2.3)-h;
  const closer=Math.min(1,Math.max(0,(1-h/full.h)*1.7));
  return {w,left,right:1200-w-left,top:Math.min(bottom,full.top+(122-full.top)*closer),bottom};
}
function adjustedLens(rect,base){
  if(!manualLens||manualLens.scope!==cameraScope())return base;
  const full=roomCamera(rect,'full',.5),h=full.h*manualLens.fraction;
  const b=lensLimits(full,h,rect.width/rect.height);
  return {w:b.w,h,left:mix(b.left,b.right,pan),top:mix(b.top,b.bottom,manualLens.y)};
}
function gestureFrame(points,rect){
  const [a,b]=points;
  return {x:((a.x+b.x)*.5-rect.left)/rect.width,y:((a.y+b.y)*.5-rect.top)/rect.height,
    distance:Math.max(2,Math.hypot(b.x-a.x,b.y-a.y))};
}
function frameAnchor(c,point){
  return {x:c.left+c.w*point.x,y:c.top+c.h*point.y};
}
function placeLens(rect,requestedH,anchor,point){
  const full=roomCamera(rect,'full',.5),base=presetCamera(rect);
  const minH=Math.min(240,base.h*.75),h=clamp(requestedH,minH,full.h);
  const b=lensLimits(full,h,rect.width/rect.height);
  if(b.right-b.left>.001)pan=clamp((anchor.x-point.x*b.w-b.left)/(b.right-b.left));
  const vertical=b.bottom-b.top;
  manualLens={scope:cameraScope(),fraction:h/full.h,y:vertical>.001?clamp((anchor.y-point.y*h-b.top)/vertical):0};
  worldPerPixel=b.w/rect.width;
  const next=h>=full.h-.1?'full':'near';
  autoView=false;
  if(view!==next){view=next;syncLensControls();}
  if(!watchState&&!observedAnimal)$('#pan').value=Math.round(pan*1000);
}

// Wait for motion or release before dispatching the first touch. A second contact
// can then take the camera without firing a cleaning stroke, feeding, or a selection.
function bindTankPointers(surface,hooks){
  const touches=new Map();
  let pending=null,pair=null,cameraOnly=false;
  const sample=e=>({x:e.clientX,y:e.clientY});
  function beginPair(){
    const r=surface.getBoundingClientRect(),positions=[...touches.values()].slice(0,2);
    const p=gestureFrame(positions,r),cam=hooks.camera();
    pair={r,h:cam.h,distance:p.distance,anchor:frameAnchor(cam,p)};
  }
  function clear(){
    pending=null;pair=null;cameraOnly=false;touches.clear();surface.removeAttribute('data-touching');hooks.interrupt();
  }
  surface.addEventListener('pointerdown',e=>{
    if(!hooks.enabled()||e.button!==0)return;
    if(e.pointerType!=='touch'){
      if(e.isPrimary&&!touches.size){hooks.down(e);surface.setPointerCapture(e.pointerId);}
      return;
    }
    touches.set(e.pointerId,sample(e));surface.setAttribute('data-touching','');surface.setPointerCapture(e.pointerId);
    if(touches.size===1){if(!cameraOnly)pending=e;return;}
    e.preventDefault();
    if(touches.size===2){
      pending=null;hooks.interrupt();cameraOnly=true;beginPair();
    }
  });
  surface.addEventListener('pointermove',e=>{
    if(e.pointerType!=='touch'){if(!touches.size)hooks.move(e);return;}
    if(!touches.has(e.pointerId))return;
    touches.set(e.pointerId,sample(e));
    if(cameraOnly){
      if(pair&&touches.size>=2){
        const p=gestureFrame([...touches.values()].slice(0,2),pair.r);
        hooks.place(pair.r,pair.h*pair.distance/p.distance,pair.anchor,p);
      }
      return;
    }
    if(pending){
      if(Math.hypot(e.clientX-pending.clientX,e.clientY-pending.clientY)<4)return;
      const first=pending;pending=null;hooks.down(first);
    }
    hooks.move(e);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{
    if(e.pointerType!=='touch'){hooks.end(type,e);return;}
    if(!touches.has(e.pointerId))return;
    touches.delete(e.pointerId);
    if(!touches.size)surface.removeAttribute('data-touching');
    if(cameraOnly){
      if(touches.size>=2)beginPair();else pair=null;
      if(!touches.size)cameraOnly=false;
    }else{
      if(pending&&type==='pointerup')hooks.down(pending);
      pending=null;hooks.end(type,e);
    }
  });
  window.addEventListener('blur',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  return ()=>{if(touches.size)clear();};
}

;
/* placement-motion */
'use strict';

function slidingPosition(){
  return sliderBatch==='x'||sliderBatch==='z';
}

function movePlacement(axis,amount){
  const p=chosen();
  if(!editing||compare||editorTool!=='objects'||!p||(axis==='z'&&p.host))return;
  if(sliderBatch!==axis){
    remember();
    sliderBatch=axis;
    message();
    $('#undo').disabled=false;
  }
  const value=clamp(amount/1000);
  if(axis==='z')p.z=value;
  else if(p.host)p.slot=value;
  else{
    const g=geometry([p]).get(p.id);
    storeScreenX(p,mix(g.min,g.max,value),g);
  }
  // The tank's animation loop already draws the latest position every frame.
}

function followPlacement(geo){
  if(view!=='near')return;
  const piece=geo.get(selected);
  if(!piece)return;
  const c=camera(),margin=c.w*.15;
  const shift=piece.x-clamp(piece.x,c.left+margin,c.left+c.w-margin);
  if(shift)pan=clamp(pan+shift/Math.max(1,1164-c.w));
}

function finishPlacement(axis){
  if(sliderBatch!==axis)return;
  if(view==='near')followPlacement(geometry(layout));
  sliderBatch=null;
  refresh();
}

for(const axis of ['x','z']){
  const input=document.getElementById(axis);
  input.addEventListener('input',()=>movePlacement(axis,Number(input.value)));
  for(const event of ['change','blur','pointerup','pointercancel','lostpointercapture','keyup']){
    input.addEventListener(event,()=>finishPlacement(axis));
  }
}
window.addEventListener('blur',()=>{if(slidingPosition())finishPlacement(sliderBatch);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&slidingPosition())finishPlacement(sliderBatch);});

;
/* scene-assets */
'use strict';

// All consumers share successful decodes; a failed request can be retried.
const artJobs=new Map();
function onceArt(key,load){
  if(!artJobs.has(key)){
    artJobs.set(key,Promise.resolve().then(load).catch(error=>{artJobs.delete(key);throw error;}));
  }
  return artJobs.get(key);
}
function loadSprite(key,solid=false){
  return onceArt('sprite/'+key,async()=>{
    const image=new Image();image.src='assets/'+key+'.webp';
    await image.decode();sprites[key]=image;
    if(solid)registerSilhouette(key,image);
  });
}
function loadTurnInfo(kind){
  return onceArt('angles/'+kind,async()=>{
    const res=await fetch('assets/turn/'+kind+'.json');
    if(!res.ok)throw Error('Missing angles: '+kind);
    const data=await res.json();
    if(data.views.length!==yawDegrees.length)throw Error('Incomplete angles: '+kind);
    turnViews[kind]=data.views.map((v,i)=>({sprite:'turn/'+kind+'-'+i,anchor:v.anchor[0],foot:v.anchor[1],
      ridge:v.ridge,feet:v.feet,behind:v.behind}));
  });
}
function loadPieceArt(p,withSurface=false){
  if(catalog[p.kind].living)return onceArt('plant/'+p.kind,()=>Promise.all([
    loadBotany(p.kind),p.kind==='stems'?loadStemFan():null
  ]));
  const yaw=p.yaw??2;
  return Promise.all([
    loadTurnInfo(p.kind).then(()=>withSurface?requestSurface(p):null),
    loadSprite('turn/'+p.kind+'-'+yaw,true),
    p.kind==='arch'?onceArt('passages',loadPassages):null
  ]);
}
function prepareEditor(){
  return onceArt('editor',async()=>{
    const jobs=[loadSubstrateMaterials()];
    for(const [kind,d] of Object.entries(catalog)){
      if(d.living)jobs.push(loadPieceArt({kind}));
      else for(let yaw=0;yaw<yawDegrees.length;yaw++)jobs.push(loadPieceArt({kind,yaw}));
    }
    await Promise.all(jobs);
    fillPalette();
  });
}

;
/* study */
'use strict';
const $=q=>document.querySelector(q);
const W=1200,H=800,stage=$('#stage'),canvas=$('#tank'),ctx=canvas.getContext('2d');
const sprites={},masks={},shadows={},motion=matchMedia('(prefers-reduced-motion: reduce)');
const portrait=matchMedia('(orientation:portrait) and (max-width:850px)');
const entry=new URLSearchParams(location.search),sample=['islands','slope','archway','creek','fern-bank','black-bank'].includes(entry.get('scene'))?entry.get('scene'):null;
let layout=sample?newGarden(sample,true):readLayout(),selected=mainPiece(layout);
if(sample==='fern-bank'||sample==='black-bank')terrain=activeBed=formForScene(sample);
let naturalFinish=preferredFinish(),snapshotFinish=naturalFinish;
let editorTool='objects',snapshotBed=null,paintedBed=null,originalPixels;
let editing=false,snapshot=null,compare=false,history=[],drag=null,returnView,returnPan,sliderBatch=null;
let autoView=true,view=portrait.matches?'near':'full',pan=.22;
let mode=lightNames.includes(entry.get('light'))?entry.get('light'):'now',mood=[0,1,0,0],sun=1,lamp=0,oldGrade='',lastClock=-1,oldFrame=0,phase=0,ready=false;
const base=document.createElement('canvas');base.width=W;base.height=H;
const gc=base.getContext('2d',{willReadFrequently:true});
let basePixels,lightPixels,areas,bedPattern,bedGlints,bedFalloff;
const glintTop=525,glintHeight=145;
let transitionStart=0,transitionImage=null;
function lightTarget(){
  const d=new Date();lastClock=Math.floor(d.getTime()/60000);
  const clock=$('#local-clock'),hhmm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  clock.textContent=hhmm;clock.dateTime=hhmm;clock.setAttribute('aria-label','当地时间 '+hhmm);
  const weights=lightAt(mode,d.getHours()+d.getMinutes()/60);
  const [dawn,day,dusk,night]=weights;
  const lampLevel=.10*dawn+.29*dusk+night;
  const description=lampLevel>.70?'缸灯已亮':lampLevel>.2?'天光 · 缸灯':dawn>.55?'清晨天光':'自然光';
  const preview={dawn:'清晨',day:'白天',dusk:'黄昏',night:'夜间'};
  $('#lamp-state').textContent=mode==='now'?description:preview[mode]+'预览';
  const key=weights.map(x=>Math.round(x*80)).join('-');if(key===oldGrade)return;
  if(ready&&!motion.matches){
    transitionImage??=document.createElement('canvas');
    transitionImage.width=canvas.width;transitionImage.height=canvas.height;
    transitionImage.getContext('2d').drawImage(canvas,0,0);transitionStart=performance.now();
  }
  mood=weights;oldGrade=key;
  sun=.62*dawn+day+.39*dusk+.025*night;lamp=lampLevel;
  document.body.dataset.tone=lightNames[mood.indexOf(Math.max(...mood))];
  document.body.classList.toggle('lit',lamp>.2);
  prepareTone(mood);grade();
  if(ready&&openingActive())refreshOpening();
  if(ready){for(const f of fish)f.nextGoal=Math.min(f.nextGoal,time+rand(.65,2));nextShoalMove=Math.min(nextShoalMove,time+2.2);}
}
function camera(){
  const r=canvas.getBoundingClientRect();
  return adjustedLens(r,presetCamera(r));
}
function presetCamera(r){
  if(watchState?.bounds)return watchCamera(r);
  if(observedAnimal&&observationCenter)return animalCamera(r);
  if(inRoom()||editing&&portrait.matches&&view==='full')return roomCamera(r,view,pan);
  const nearBed=editing&&view==='near'&&portrait.matches;
  const h=nearBed?480:604,w=Math.min(1164,h*r.width/Math.max(1,r.height));
  return {left:18+(1164-w)*pan,top:nearBed?226:136,w,h};
}
const pendant={x:318,y:187,w:564};
function fixture(emission,cableTop=100){
  const im=sprites.pendant,h=pendant.w*im.naturalHeight/im.naturalWidth,{x,y,w}=pendant;
  ctx.save();
  if(!emission){
    ctx.lineWidth=1.25;ctx.strokeStyle='rgba(67,67,61,.70)';
    for(const u of [.178,.823]){
      const cx=x+w*u;ctx.beginPath();ctx.moveTo(cx,cableTop);ctx.lineTo(cx,y+h*.025);ctx.stroke();
    }
    ctx.filter='brightness('+(1-.47*mood[3]-.12*mood[2])+')';ctx.drawImage(im,x,y,w,h);
  }else if(lamp>.015){
    const out=y+h*.917,start=x+w*.024,end=x+w*.976;
    ctx.strokeStyle='rgba(243,238,215,'+(.85*lamp)+')';ctx.lineWidth=1.75;
    ctx.shadowColor='rgba(234,236,208,'+(.75*lamp)+')';ctx.shadowBlur=4.5;ctx.beginPath();ctx.moveTo(start,out);ctx.lineTo(end,out);ctx.stroke();
  }
  ctx.restore();
}
function causticTile(){
  const n=256,side=5,points=[];
  function rand(i,j){const v=Math.sin(i*47.11+j*89.17+3.41)*37815.43;return v-Math.floor(v);}
  for(let j=0;j<side;j++)for(let i=0;i<side;i++)points.push([i+.16+.69*rand(i,j),j+.16+.69*rand(j+4,i+1)]);
  const c=document.createElement('canvas');c.width=c.height=n;
  const g=c.getContext('2d'),im=g.createImageData(n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const a=2*Math.PI*x/n,b=2*Math.PI*y/n;
    const u=x*side/n+.24*Math.sin(b*2+.65*Math.sin(a))+.09*Math.sin(3*a+b),v=y*side/n+.21*Math.cos(a*2+b)+.075*Math.sin(a+3*b);
    let d=10,e=10;
    for(const pt of points){let dx=Math.abs(u-pt[0]),dy=Math.abs(v-pt[1]);dx=Math.min(dx,Math.abs(side-dx));dy=Math.min(dy,Math.abs(side-dy));const r=dx*dx+dy*dy;if(r<d){e=d;d=r;}else if(r<e)e=r;}
    const dist=Math.sqrt(e)-Math.sqrt(d),ridge=Math.exp(-((dist/.060)**2)),halo=Math.exp(-((dist/.18)**2));
    const k=4*(y*n+x);im.data[k]=255;im.data[k+1]=244;im.data[k+2]=181;im.data[k+3]=(198*ridge+79*halo)*(.75+.25*Math.sin(a+b)*Math.sin(b));
  }
  g.putImageData(im,0,0);return c;
}
function makeLightMaps(){
  gc.drawImage(sprites['clear-tank'],0,0,W,H);originalPixels=gc.getImageData(0,0,W,H);basePixels=originalPixels;
  lightPixels=gc.createImageData(W,H);areas=new Uint8Array(W*H*5);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const u=x/W,v=y/H,p=(y*W+x)*5;
    const glass=smooth(.049,.059,u)*(1-smooth(.94,.951,u))*smooth(.296,.34,v)*(1-smooth(.849,.866,v));
    const water=glass*(1-smooth(.705,.742,v));
    const beam=windowField(u,v);
    const pool=.40+.60*Math.exp(-(((u-.50)/(.32+.2*Math.max(0,v-.34)))**2));
    areas[p]=255*glass;areas[p+1]=255*water;areas[p+2]=255*beam;areas[p+3]=255*pool;
    areas[p+4]=255*smooth(.731,.754,v)*(1-smooth(.811,.835,v))*glass;
  }
  for(let y=0;y<80;y++)for(let x=0;x<128;x++)lightField[y*128+x]=windowField((x+.5)/128,(y+.5)/80);
  const tile=causticTexture=causticTile();
  bedGlints=document.createElement('canvas');bedGlints.width=960;bedGlints.height=Math.ceil(glintHeight*.8);
  bedPattern=bedGlints.getContext('2d').createPattern(tile,'repeat');
  bedFalloff=document.createElement('canvas');bedFalloff.width=480;bedFalloff.height=Math.ceil(glintHeight/2.5);
}
function updateBedPhoto(){
  if(paintedBed===activeBed)return;
  basePixels=paintSubstratePhoto(originalPixels,activeBed.style,terrainHeight);
  paintedBed=activeBed;updateBedLightAreas();updateBedFalloff();if(ready)grade(glintTop);
}
function updateBedLightAreas(){
  const back=sandRow(0),front=sandRow(1);
  for(let x=0;x<W;x++){
    const rearY=rowY(back,x)/H,frontY=rowY(front,x)/H;
    const dyBack=rowYFlat(back,x)/H-rearY,dyFront=rowYFlat(front,x)/H-frontY;
    for(let y=glintTop;y<690;y++){
      const i=(y*W+x)*5,v=y/H,glass=areas[i];
      const water=1-smooth(.705-dyBack,.742-dyBack,v);
      // The side panes still transmit the mound right out to the near corner.
      areas[i+1]=glass*water;
      areas[i+4]=glass*smooth(.731-dyBack,.754-dyBack,v)*(1-smooth(.811-dyFront,.835-dyFront,v));
    }
  }
}
function updateBedFalloff(){
  const fc=bedFalloff.getContext('2d'),mask=fc.createImageData(480,bedFalloff.height),rear=sandRow(0),front=sandRow(1);
  for(let y=0;y<bedFalloff.height;y++)for(let x=0;x<480;x++){
    const wx=(x+.5)*W/480,wy=glintTop+(y+.5)*2.5,ry=rowY(rear,wx);
    const t=clamp((wy-ry)/(rowY(front,wx)-ry));
    const left=mix(rear.left,front.left,t),right=mix(rear.right,front.right,t);
    const edge=smooth(left-2,left+5,wx)*(1-smooth(right-5,right+2,wx));
    const back=smooth(ry+1,ry+12,wy),rim=1-smooth(rowY(front,wx)-7,rowY(front,wx)-1,wy);
    const patches=.48+.28*windowField(wx/W,wy/H)+.20*Math.cos(wx*.012+wy*.041)*Math.sin(wx*.008+1.9);
    const dz=t<.98?.02:-.02,tilt=(terrainHeight(wx,t+dz)-terrainHeight(wx,t))/(dz*100);
    const facing=clamp(.96+.24*tilt,.55,1.13);
    mask.data[(y*480+x)*4+3]=255*edge*back*rim*patches*facing;
  }
  fc.putImageData(mask,0,0);
}
function grade(startY=0){
  const src=basePixels.data,dst=lightPixels.data,[dawn,day,dusk,night]=mood;
  const ambient=.93+.06*day,lit=day+.07*dusk+.22*dawn;
  for(let i=startY*W*4,p=startY*W*5;i<src.length;i+=4,p+=5){
    const water=areas[p+1]/255,shaft=areas[p+2]/255,pool=areas[p+3]/255,sand=areas[p+4]/255,glass=areas[p]/255;
    const w=shaft*lit,m=night*glass;
    // Neutralise the original emerald backdrop and golden photographic reflection in dim light.
    const y=Math.floor((i>>2)/W),surfaceBand=y>244&&y<285?1-Math.abs(y-264)/21:0;
    const luma=.25*src[i]+.56*src[i+1]+.19*src[i+2];
    const desat=m*(.13*water+.49*surfaceBand);
    dst[i]=mix(src[i],luma,desat)*(ambient+.13*w)+w*(9+11*water)+water*(10*day+8*dawn+1*dusk)+m*pool*5;
    dst[i+1]=mix(src[i+1],luma,desat)*(ambient+.12*w)+w*(6+14*water)+water*(6*day+5*dawn+4*dusk)-m*water*7;
    dst[i+2]=mix(src[i+2],luma,desat)*(.95+.08*w)+w*(2+9*water)+m*water*(9+9*pool)+dusk*water*7-day*water*3;
    const shade=1-sand*(.07+.035*day);dst[i]*=shade;dst[i+1]*=shade;dst[i+2]*=shade;dst[i+3]=255;
  }
  gc.putImageData(lightPixels,0,0,0,startY,W,H-startY);
}
function optics(t){

  const day=mood[1]+.33*mood[0]+.29*mood[2];
  ctx.save();
  if(day>.005){
    // Project the moving surface network onto the sand plane, with glints strongest on the open bank.
    const gc=bedGlints.getContext('2d');gc.setTransform(.8,0,0,.8,0,-glintTop*.8);
    gc.clearRect(0,glintTop,W,glintHeight);bedPattern.setTransform(waterTransform(t));
    gc.fillStyle=bedPattern;gc.fillRect(0,glintTop,W,glintHeight);
    gc.globalCompositeOperation='destination-in';gc.drawImage(bedFalloff,0,glintTop,W,glintHeight);gc.globalCompositeOperation='source-over';
    ctx.save();clipSand(ctx);ctx.globalCompositeOperation='screen';ctx.globalAlpha=day*(activeBed.style==='soil'?.19:activeBed.style==='pale'?.46:.68)*(finishScene ? .64 : 1);ctx.drawImage(bedGlints,0,glintTop,W,glintHeight);ctx.restore();
  }
  ctx.restore();
}
function sandShadow(x,y,span,z,opacity=1){
  ctx.save();ctx.translate(x,y-.8);ctx.scale(1,.12+.052*z);ctx.globalAlpha=opacity;
  const shade=ctx.createRadialGradient(0,0,0,0,0,span);
  shade.addColorStop(0,'rgba(36,35,19,.57)');shade.addColorStop(.42,'rgba(52,40,25,.32)');shade.addColorStop(1,'rgba(52,41,26,0)');
  ctx.fillStyle=shade;ctx.fillRect(-span,-span,2*span,2*span);ctx.restore();
}
function contact(p,g){
  ctx.save();clipSand(ctx);
  const d=catalog[p.kind],mark=shadows[g.sprite];
  const compact=finishScene?.compact;
  // Preserve directional light in the material; on a phone a second flat
  // image of the object on the sand overwhelms the grain at either zoom.
  if(!compact){
    ctx.save();ctx.translate(g.x,g.bed);
    ctx.transform(1,(pieceBedAt(g,g.x+6)-pieceBedAt(g,g.x-6))/12,.055+.46*mood[1]+.63*mood[2]-.42*mood[0]+.15*mood[3]*(.5-g.x/W),.08+.025*sun,0,0);ctx.translate(0,g.y-g.bed);ctx.rotate(g.angle);ctx.scale(g.sign,1);ctx.globalAlpha=.16+.19*sun;
    ctx.drawImage(mark,-(g.pivotX+.035)*g.width,-g.pivotY*g.height,g.width*1.07,g.height);ctx.restore();
  }
  if(g.feet){
    const lowest=Math.max(...g.feet.map(pt=>pt[1]));
    for(const [u,v] of g.feet){
      const pt=worldPointOnSprite(g,u,v),localBed=pieceBedAt(g,pt.x),floor=Math.min(localBed,Math.max(pt.y,localBed+(v-lowest)*g.height));
      const height=Math.max(0,floor-pt.y);
      const radius=g.width*(p.kind==='arch'?.104:.165)*(compact?.63:1);
      const strength=compact?.30+.06*sun:.68;
      sandShadow(pt.x,floor,radius,g.z,strength/(1+height*(compact?.20:.07)));
    }
  }else sandShadow(g.x+(p.kind==='branch'?g.sign*g.width*.07:0),g.bed,g.width*d.shadow*(compact?.72:1),g.z,compact?.42:1);
  ctx.restore();
}
function drawPiece(p,g,t,c=ctx){
  const d=catalog[p.kind],material=d.living?botanicalMaterialFor(p,g):materialFor(p,g),left=-g.pivotX*g.width,top=-g.pivotY*g.height;
  c.save();
  if(g.attached){
    const front=sandRow(1);c.beginPath();c.rect(front.left,0,front.right-front.left,H);c.clip();
  }
  if(!g.attached)clipPieceAtBed(c,g);
  c.translate(g.x,g.y);c.rotate(g.angle);c.scale(g.sign,1);
  if(d.living)paintFoliage(c,p,g,material,t);
  else c.drawImage(finishedHardscape(material,p,g),left,top,g.width,g.height);
  const highlights=!d.living&&movingHighlights(material,g,t);
  if(highlights){c.globalCompositeOperation='screen';c.globalAlpha=.88*smooth(.1,.94,sun);c.drawImage(highlights,left,top,g.width,g.height);}
  c.restore();
}
function sorted(items,geo){return [...items].sort((a,b)=>geo.get(a.id).depth-geo.get(b.id).depth);}
function render(){
  if(!ready)return;
  trimPlantFrames();updateBedPhoto();
  const items=watchState?watchItems():compare?snapshot:layout,geo=geometry(items),all=[];
  for(const p of items)if(catalog[p.kind].turns&&!surfaceMaps[geo.get(p.id).sprite])requestSurface(p);
  if(slidingPosition())followPlacement(geo);
  if(!slidingPosition()||!finishScene)updateFinishScene(items,geo,compare?snapshotFinish:naturalFinish);
  const c=camera(),sx=canvas.width/c.w,sy=canvas.height/c.h;
  ctx.setTransform(sx,0,0,sy,-c.left*sx,-c.top*sy);
  drawAlcove(ctx,c);
  ctx.save();tankOutline(ctx);ctx.clip();
  ctx.drawImage(base,0,278,W,H-278,0,278,W,H-278);
  ctx.drawImage(glassRim(),0,225);
  if(finishScene)ctx.drawImage(finishScene.plate,0,0,W,H);
  ctx.restore();
  fixture(false,Math.min(100,c.top));
  optics(phase);paintSurfaceWater(phase);drawResidentFilter(ctx,phase,waterDrop,motion.matches);drawWaterClarity(ctx);
  all.push([.53,()=>drawWaterClarity(ctx,true)]);
  rememberBedSolids(items,geo);
  observeHabitat(items,geo);shrimpScenery=geo;
  if(watchState)trackSpecimen(items,geo);
  for(const p of items){
    const g=geo.get(p.id),bridge=bridges.find(b=>b.g===g);
    if(!g.attached)contact(p,g);
    const hostBridge=g.host&&bridges.find(b=>b.g===g.host);
    const z=bridge?bridge.back-.001:hostBridge?bridgeDepth(g.host,leafOcclusion(g.host,p.slot).near)+.002:g.depth;
    const box=paintBounds(g,catalog[p.kind].living);
    all.push([z,()=>drawInHabitat(z,box,c=>drawPiece(p,g,phase,c),bridges,bridge?g:g.host)]);
  }
  for(const f of fish){
    if(f.inNet)continue;
    const r=f.width*.64,box={l:f.x-r,r:f.x+r,t:f.y-r,b:f.y+r};
    all.push([f.z,()=>drawInHabitat(f.z,box,c=>paintFish(f,c),bridges)]);
  }
  // Food on the bed is printed on the sand plane, beneath the actual alpha
  // silhouettes of wood, rocks and foliage. Open arch holes stay transparent.
  for(const p of residue){const q=floorPoint(p);drawRemnant(p,ctx,q.x,q.y);}
  for(const p of drawnIn){
    const t=clamp(p.age/.30);
    drawRemnant(p,ctx,mix(p.x,p.endX,t),mix(p.y,p.endY-4,t),1-t);
  }
  for(const f of food)if(!f.taken){
    const r=8*worldPerPixel,box={l:f.x-r,r:f.x+r,t:f.y-r,b:f.y+r};
    // Crossfade into the sand layer over the last few millimetres of descent.
    const nearBed=clamp((8-(floorPoint(f).y-f.y))/8);
    if(nearBed){ctx.save();ctx.globalAlpha=nearBed;paintFlake(f,ctx);ctx.restore();}
    if(nearBed<1)all.push([f.z,()=>drawInHabitat(f.z,box,c=>{
      c.save();c.globalAlpha=1-nearBed;paintFlake(f,c);c.restore();
    },bridges)]);
  }
  if(waterChange)all.push([.81,()=>drawChangeHose(ctx)]);
  drawForageBeds(all);
  for(const a of shrimp)if(!a.inNet){
    all.push([a.z,()=>drawInHabitat(a.z,{l:a.x-39,r:a.x+39,t:a.y-34,b:a.y+29},c=>paintShrimp(a,c),bridges)]);
  }
  for(const n of glassDwellers)if(!n.inNet&&!onGlass(n))all.push([n.z??.98,()=>drawSnail(ctx,n)]);
  all.sort((a,b)=>a[0]-b[0]).forEach(o=>o[1]());drawDust();drawCareWater(ctx);drawLandingNet(ctx);drawGlassAlgae(ctx,careNow());
  for(const n of glassDwellers)if(!n.inNet&&onGlass(n))drawSnail(ctx,n);
  ctx.save();tankOutline(ctx);ctx.clip();toneScene();ctx.restore();
  drawSelectedResident(ctx);fixture(true);drawGlassScraper(ctx);
  if(transitionImage){
    const f=clamp((performance.now()-transitionStart)/620);
    if(f>=1)transitionImage=null;
    else{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1-smooth(0,1,f);ctx.drawImage(transitionImage,0,0,canvas.width,canvas.height);ctx.restore();}
  }
  if(editing&&!compare&&editorTool==='bed'){
    const m=cellPoint(),px=canvas.clientWidth/c.w;
    ctx.save();ctx.beginPath();ctx.ellipse(m.x,m.y,11/px,4/px,0,0,Math.PI*2);
    ctx.strokeStyle='#374a3a';ctx.lineWidth=3/px;ctx.stroke();
    ctx.strokeStyle='#fff9df';ctx.lineWidth=1.4/px;ctx.stroke();ctx.restore();
  }else if(editing&&!compare&&geo.has(selected)){
    const g=geo.get(selected),px=canvas.clientWidth/c.w;
    let marker={x:g.x,y:g.attached?g.y:g.bed};
    if(g.feet){
      const contacts=g.feet.map(([u,v])=>worldPointOnSprite(g,u,v));
      const foot=contacts.reduce((a,b)=>a.y>b.y?a:b);marker={x:foot.x,y:Math.min(foot.y,g.bed)};
    }
    ctx.save();ctx.translate(marker.x,marker.y);ctx.rotate(g.attached?g.angle:0);
    ctx.beginPath();ctx.ellipse(0,0,6.5/px,2.5/px,0,0,Math.PI*2);ctx.strokeStyle='#314734af';ctx.lineWidth=2.5/px;ctx.stroke();ctx.strokeStyle='#fff7cf';ctx.lineWidth=1.12/px;ctx.stroke();ctx.restore();
  }
}
let pixelRatioLimit=1.8,slowFrameTime=0,lastCanvasWidth=0,lastCanvasHeight=0;
function resize(){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,pixelRatioLimit);
  lastCanvasWidth=r.width;lastCanvasHeight=r.height;
  const width=Math.max(1,Math.round(r.width*dpr)),height=Math.max(1,Math.round(r.height*dpr));
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  worldPerPixel=camera().w/Math.max(1,r.width);render();
}
let lastCareSave=0;
function frame(now){
  if(now-oldFrame<(slidingPosition()?15:1000/40)){requestAnimationFrame(frame);return;}
  const elapsed=now-oldFrame,dt=Math.min(.12,Math.max(0,elapsed/1000));oldFrame=now;
  if(!document.hidden){
    // Ignore background pauses and isolated stalls while decoding an asset.
    if(portrait.matches&&Math.min(window.devicePixelRatio||1,pixelRatioLimit)>1){
      if(elapsed>250)slowFrameTime=0;
      else slowFrameTime=Math.max(0,slowFrameTime+(elapsed>46?elapsed:-2*elapsed));
      if(slowFrameTime>2500){
        pixelRatioLimit=Math.min(window.devicePixelRatio,pixelRatioLimit)>1.35?1.35:1;
        slowFrameTime=0;resize();
      }
    }
    if(lastClock!==Math.floor(Date.now()/60000)){lightTarget();if(editing||watchState)refresh();}
    if(careNow()-careTime>=1000){advanceCare(careNow());syncCareControls();}
    if(stepWaterChange(dt))syncCareControls();
    if(careDemo)$('#care-hour').disabled=food.length>0||!!waterChange;
    if(careDirty&&now-lastCareSave>1500){saveCare();lastCareSave=now;}
    if(!motion.matches||food.length||ripples.length||drawnIn.length||waterChange||fish.some(f=>f.target)){
      const n=Math.max(1,Math.ceil(dt*45));
      for(let i=0;i<n;i++)stepAquarium(dt/n);
      phase+=dt*(.65+.35*sun);
    }else if(fingerBrush&&now<fingerBrush.restAt){
      time+=dt;phase+=dt;
    }
    for(const a of shrimp){
      shrimpStep(a,dt);
      const paddling=!a.inNet&&!a.resting&&(a.species==='glassShrimp'||!!a.arrival);
      a.paddleOpen=approach(a.paddleOpen??0,paddling?1:0,paddling?8:6,dt);
    }
    stepOpening(dt);tankNotes.tick(now);followAnimal(dt);stepNet(dt);stepIntroduction(dt);
    if(glassDwellers.size){
      for(const n of glassDwellers)crawlSnail(dt,careNow(),n);
      if(!careDemo&&careNow()-snailSavedAt>15000){saveSnail(careNow());saveGlass();}
    }
    if(drag?.pending){drag.pending=false;moveHeld(drag.lastX,drag.lastY);}
    panAtEdge(dt);render();
  }
  requestAnimationFrame(frame);
}
function mainPiece(items){return (items.find(p=>p.kind==='arch')||items.find(p=>p.kind==='branch')||items[0])?.id;}
function chosen(){return layout.find(p=>p.id===selected);}
function message(s=''){$('#message').textContent=s;$('#message').hidden=!s;}
function remember(){
  history.push({items:structuredClone(layout),bed:terrain,selected,finish:naturalFinish});if(history.length>35)history.shift();
}
function nameOf(p){const group=layout.filter(v=>v.kind===p.kind);return catalog[p.kind].name+(group.length>1?' '+(group.indexOf(p)+1):'');}
function options(el,choices){
  const key=JSON.stringify(choices);if(el.dataset.signature===key)return;
  el.replaceChildren(...choices.map(([value,label])=>new Option(label,value)));el.dataset.signature=key;
}
const directionNames=['向左 55°','向左 28°','正面','向右 28°','向右 55°'];
const yawStrip=$('#yaw-strip');
let turning=null,suppressClickUntil=0;
function showAngles(p){
  const turnable=layout;
  options($('#turn-piece'),turnable.map(v=>[v.id,nameOf(v)]));$('#turn-piece').value=p.id;
  const signature=p.kind+':'+seedOf(p)+':'+plantAge(p)+':'+p.flip,active=p.flip?4-p.yaw:p.yaw;
  if(yawStrip.dataset.signature!==signature){
    const buttons=yawDegrees.map((degree,i)=>{
      const b=document.createElement('button'),index=p.flip?4-i:i;b.type='button';b.className='yaw-option';
      b.dataset.index=i;b.setAttribute('role','radio');b.setAttribute('aria-label',directionNames[i]);
      let img;
      if(catalog[p.kind].living){
        img=plantThumbnail(p,plantAge(p),index,82);
      }else{
        img=new Image();img.src='assets/'+turnViews[p.kind][index].sprite+'.webp';img.alt='';img.draggable=false;
      }
      if(p.flip)img.style.transform='scaleX(-1)';
      b.append(img,i===2?'正面':(degree>0?'+':'')+degree+'°');return b;
    });
    yawStrip.replaceChildren(...buttons);yawStrip.dataset.signature=signature;
  }
  for(const b of yawStrip.children){
    const on=Number(b.dataset.index)===active;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1;
  }
  $('#yaw-value').textContent=directionNames[active];
  $('#tilt').value=p.tilt;$('#tilt-value').textContent=(p.tilt>0?'+':'')+p.tilt+'°';
  $('#tilt').setAttribute('aria-valuetext',p.tilt+' 度');
}
function setYaw(i,record){
  const p=chosen();if(!editing||compare||!p)return false;
  const next=p.flip?4-i:i;if(next===p.yaw)return false;
  if(record)remember();p.yaw=next;modified();return true;
}
$('#turn-piece').addEventListener('change',e=>{selected=e.target.value;modified();keepVisible(selected,true);});
yawStrip.addEventListener('click',e=>{
  const b=e.target.closest('.yaw-option');if(!b||(e.detail&&performance.now()<suppressClickUntil))return;
  setYaw(+b.dataset.index,true);
});
yawStrip.addEventListener('keydown',e=>{
  const b=e.target.closest('.yaw-option');if(!b)return;
  const i=+b.dataset.index,indices={ArrowLeft:Math.max(0,i-1),ArrowRight:Math.min(4,i+1),Home:0,End:4};
  if(!(e.key in indices))return;
  e.preventDefault();const j=indices[e.key];setYaw(j,true);yawStrip.children[j].focus({preventScroll:true});
});
yawStrip.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0)return;
  suppressClickUntil=0;turning={id:e.pointerId,x:e.clientX,y:e.clientY,horizontal:false,recorded:false};
});
yawStrip.addEventListener('pointermove',e=>{
  if(!turning||turning.id!==e.pointerId)return;
  if(!turning.horizontal){
    const dx=Math.abs(e.clientX-turning.x),dy=Math.abs(e.clientY-turning.y);
    if(dx<6||dx<=dy)return;
    turning.horizontal=true;yawStrip.setPointerCapture(e.pointerId);
  }
  const rect=yawStrip.getBoundingClientRect(),i=clamp(Math.floor((e.clientX-rect.left)*5/rect.width),0,4);
  if(setYaw(i,!turning.recorded))turning.recorded=true;
});
function endTurn(e){
  if(turning?.id!==e.pointerId)return;
  if(turning.horizontal)suppressClickUntil=performance.now()+350;
  turning=null;
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])yawStrip.addEventListener(name,endTurn);
yawStrip.addEventListener('pointerleave',e=>{if(!turning?.horizontal)endTurn(e);});
function syncCareControls(){
  document.body.classList.toggle('changing-water',!!waterChange);
  const hide=editing||!!watchState||managing,changing=!!waterChange,step=waterChange?.stage;
  if(hide){siphoning=false;siphonTip=null;}
  if(hide||changing)wipingGlass=false;
  const wipe=$('#wipe-glass');wipe.hidden=hide;wipe.disabled=!ready||changing;
  if(!wipingGlass){scraper=null;restingBladeAngle=0;}
  wipe.lastElementChild.textContent=wipingGlass?'结束擦缸':'擦缸';wipe.setAttribute('aria-pressed',String(wipingGlass));
  document.body.classList.toggle('wiping-glass',wipingGlass);
  if(wipingGlass)canvas.setAttribute('aria-describedby','care-note');
  else canvas.removeAttribute('aria-describedby');
  document.body.classList.toggle('siphoning',siphoning);
  const handling=(wipingGlass||siphoning)&&!openingActive()&&!hide;
  if(!handling)moveCareView=false;
  $('#care-hand').hidden=!handling;
  $('#care-hand-name').textContent=wipingGlass?'擦缸':'吸底';
  const gestureHint=moveCareView?'单指移动视角':wipingGlass?'单指擦玻璃':'单指沿沙面吸底';
  $('#care-hand-hint').textContent=gestureHint+' · 双指移动或缩放';
  $('#care-pan').textContent=moveCareView?(wipingGlass?'继续擦缸':'继续吸底'):'移视角';
  $('#care-pan').setAttribute('aria-pressed',String(moveCareView));
  $('#siphon').hidden=hide;$('#siphon').disabled=!ready||changing;
  $('#siphon').setAttribute('aria-pressed',String(siphoning));
  $('#siphon').textContent=siphoning?'结束吸底':'吸底';
  const button=$('#water-change');
  button.hidden=hide;button.disabled=!ready||changing&&step!=='low';
  button.textContent=step==='drain'?'抽水中…':step==='low'?'补水':step==='fill'?'补水中…':'换水 ¼';
  for(const id of ['feed','watch','edit'])$('#'+id).disabled=!ready||changing||(id==='edit'&&openingEditor);
  $('#care-hour').hidden=!ready||!careDemo||hide;
  $('#care-hour').disabled=changing||food.length>0;
  const now=careNow(),filtering=filterUntil>now;
  const filter=$('#fine-filter');
  filter.hidden=hide||(!filtering&&turbidity<.045);
  filter.disabled=!ready||filtering||changing;
  filter.textContent=filtering?'精滤中':'开启精滤';
  if(filtering)filter.style.setProperty('--filtered',(100*(1-(filterUntil-now)/fineFilterMs))+'%');
  $('#residents-open').hidden=editing||!!watchState||managing;$('#residents-open').disabled=!ready||changing;
  if(managing){
    $('#watch').hidden=$('#edit').hidden=$('#feed').hidden=true;
    updateStockPanel();
  }
  const note=$('#care-note'),reading=waterReading(),wary=fish.some(f=>fishUnease(f)>.20);
  note.hidden=hide||!ready||!(careDemo||filtering||changing||siphoning||wipingGlass||lastExchange||wary||turbidity>.095||organicLoad>1.15);
  const text=step==='drain'?'正在抽水。轻划沙面可以顺手吸走残饵，水位会自动停住。':
    step==='low'?'水位已到。轻点「补水」，把水慢慢加回来。':step==='fill'?'新水正沿缸边流入…':
    wipingGlass?'沿玻璃往返刮擦，厚处可回刮。':
    siphoning?'沿沙面轻划，吸走落下的残饵。':
    (lastExchange?'已换水 ¼ · ':demoOffset?'已推演 '+Math.round(demoOffset/3600000)+' 小时 · ':'')+
    reading+(filtering?' · 细滤棉正在收集悬浮物，约 '+Math.max(1,Math.ceil((filterUntil-now)/1000))+' 秒后完成。':turbidity>.095?(residue.length?' · 先吸走沉底残饵，再开启精滤。':' · 开启精滤可加快澄清。'):organicLoad>1.15?' · 换水 ¼ 可稀释分解物。':careDemo&&!glassTouched&&!lastExchange&&!demoOffset?' · 点「擦缸」刮开藻膜，斑马螺也会沿途啃藻。':'')+(wary?' · 连续换水后，鱼群暂时避开了水流。':'')+(careDemo&&demoOffset>0&&!residue.length&&organicLoad>.04?' · 沙面已看不见残饵，水中仍有分解后的物质。':'');
  if(note.textContent!==text)note.textContent=text;
}
function syncLensControls(){
  document.body.classList.toggle('near',view==='near');
  $('#camera').hidden=view!=='near'||!!observedAnimal;
  const button=$('#quick-camera'),zoomed=view==='near'||!!watchState||!!observedAnimal;
  button.disabled=!ready;button.dataset.target=zoomed?'full':'near';
  button.title=zoomed?'缩小看全缸':'放大近看';button.setAttribute('aria-label',button.title);
}
function refresh(){
  document.body.classList.toggle('room-view',inRoom());
  document.body.classList.toggle('watching',!!watchState);document.body.classList.toggle('near',view==='near');document.body.classList.toggle('editing',editing);
  for(const b of $('#modes').children)b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  $('#camera').hidden=view!=='near'||!!observedAnimal;$('#editor').hidden=!editing;$('#edit').hidden=editing;$('#feed').hidden=editing;
  $('#edit').setAttribute('aria-expanded',String(editing));$('#pan').value=Math.round(pan*1000);
  for(const button of $('#finish-modes').children){
    button.setAttribute('aria-pressed',String((button.dataset.finish==='on')===(compare?snapshotFinish:naturalFinish)));
    button.disabled=!ready||compare;
  }
  refreshWatch();
  syncLensControls();
  syncCareControls();globalThis.tankJournal?.sync();
  $('#work-tabs').hidden=!editing;
  for(const button of $('#work-tabs').children)button.setAttribute('aria-pressed',String(button.dataset.tool===editorTool));
  const bmode=editorTool==='bed',p=chosen(),canTurn=!!p&&!bmode;
  $('#bed-editor').hidden=!bmode;$('#object-editor').hidden=bmode;
  $('#turn-panel').hidden=!editing||!ready||!canTurn||compare;
  if(!editing||!ready)return;
  if(bmode)refreshBed();
  const active=Boolean(p)&&!compare;
  showGrowth(p);
  if(canTurn)showAngles(p);
  refreshPiecePicker(p,active&&!bmode);
  $('#sliders').hidden=!p;$('#object-actions').hidden=!p;
  $('#selection').textContent=compare?'布置前的鱼缸':bmode?'塑造底床':p?nameOf(p):layout.length?'选择物件':'空缸';
  $('#hint').textContent=compare?'再点一次「继续布置」回到当前造景。':bmode?'点砂面或俯视图选位置，再堆高或压低。':p?(catalog[p.kind].attaches?'拖到木石表面即可附着，也可以从「放置在」中选择。':'轻点沙面放置，或拖动物件调整位置。'):layout.length?'点选缸中物件，或从名单中选择。':'从素材中选一件，开始布置。';
  if(!compare&&!bmode&&p)$('#hint').textContent='从名单选择物件，或轻点缸里的景物。';
  $('#compare').textContent=compare?'继续布置':'对照原景';$('#compare').setAttribute('aria-pressed',String(compare));
  $('#undo').disabled=compare||history.length===0;
  $('#wall-left').hidden=$('#wall-right').hidden=!p||Boolean(p.host);
  $('#support-field').hidden=!p||!catalog[p.kind].attaches;
  if(p){
    const g=geometry(layout).get(p.id);
    $('#x-name').textContent=p.host?'沿附着面':'左右位置';
    $('#x-start').textContent=p.host?'一端':'左';$('#x-end').textContent=p.host?'另一端':'右';
    $('#x').value=Math.round(1000*(p.host?p.slot:clamp((g.x-g.min)/(g.max-g.min))));
    $('#z-field').hidden=Boolean(p.host);$('#z').value=Math.round(p.z*1000);
    $('#size').value=Math.round(p.size*100);$('#size-value').textContent=Math.round(p.size*100)+'%';
    if(catalog[p.kind].attaches){
      options($('#support'),[['','沙面'],...layout.filter(v=>catalog[v.kind].support).map(v=>[v.id,nameOf(v)])]);
      $('#support').value=p.host||'';
    }
  }
  for(const b of document.querySelectorAll('#object-actions button,#sliders input,#support'))b.disabled=!active;
  $('#placement-tools').hidden=!p;
  $('#size').disabled=!active;
  $('#placement-plan').hidden=!active||!!p.host;
  if(p){
    for(const button of document.querySelectorAll('#placement [data-axis]')){
      const range=$('#size'),delta=+button.dataset.step;
      button.disabled=!active||(delta<0?+range.value<=+range.min:+range.value>=+range.max);
    }
    if($('#placement-plan').open)markPlacementCell(p);
  }
  $('#duplicate').disabled=!active||layout.length>=40||tankJournal.available(p.kind)<=0;$('#presets').disabled=compare;
  for(const b of $('#palette').children)b.disabled=compare||layout.length>=40||!tankJournal.available(b.dataset.kind);
  $('#done').disabled=compare;
}
function selectView(v){
  manualLens=null;
  if(observedAnimal)observeAnimal(null);
  view=v;refresh();resize();
  if(editing&&view==='near')keepVisible(selected,true);
}
function keepVisible(id,center=false){
  if(openingActive()||view!=='near'||!id||!layout.some(p=>p.id===id))return;
  const g=geometry(layout).get(id),c=camera();
  if(center||g.x<c.left+20||g.x>c.left+c.w-20){
    pan=clamp(((g.left+g.right)*.5-c.w*.5-18)/Math.max(1,1164-c.w));refresh();render();
  }
}
function releaseUnusedMaterials(){
  if(!materials.size)return;
  const ids=new Set([...layout,...(snapshot||[])].map(p=>p.id));
  for(const id of materials.keys())if(!ids.has(id))materials.delete(id);
  for(const id of leafMovement.keys())if(!ids.has(id))leafMovement.delete(id);
}
function modified(){sliderBatch=null;releaseUnusedMaterials();message();refresh();render();}
function makeId(){return 'p'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
$('#finish-modes').addEventListener('click',e=>{
  const value=e.target.dataset.finish;if(!ready||compare||!value||naturalFinish===(value==='on'))return;
  if(editing)remember();
  naturalFinish=value==='on';modified();
  if(!editing&&!storeFinish())message('本次画面已切换，当前浏览器未能记住这个选择。');
});
$('#modes').addEventListener('click',e=>{if(e.target.dataset.mode){mode=e.target.dataset.mode;lightTarget();refresh();}});
$('#wipe-glass').addEventListener('click',()=>{
  if(observedAnimal)observeAnimal(null);
  moveCareView=false;wipingGlass=!wipingGlass;siphoning=false;siphonTip=null;drag=null;
  if(wipingGlass&&view==='near'){
    const c=camera(),now=careNow(),visible=glassSpots.filter(s=>glassStrength(s,now)>.14);
    if(visible.length&&!visible.some(s=>s.x>c.left+18&&s.x<c.left+c.w-18)){
      const center=c.left+c.w/2,nearest=visible.reduce((a,b)=>Math.abs(a.x-center)<Math.abs(b.x-center)?a:b);
      pan=clamp((nearest.x-c.w/2-18)/Math.max(1,1164-c.w));
    }
  }
  saveGlass();refresh();render();
});
$('#care-pan').addEventListener('click',()=>{
  moveCareView=!moveCareView;
  if(moveCareView&&view==='full')selectView('near');
  syncCareControls();
});
$('#care-put-away').addEventListener('click',()=>{
  wipingGlass=false;siphoning=false;moveCareView=false;siphonTip=null;scraper=null;drag=null;
  saveGlass();saveCare();roomDrawer(null);refresh();$('#care-drawer').focus({preventScroll:true});
});
$('#fine-filter').addEventListener('click',()=>{if(!waterChange&&startFineFilter())syncCareControls();});
$('#siphon').addEventListener('click',()=>{moveCareView=false;wipingGlass=false;siphoning=!siphoning;siphonTip=null;drag=null;refresh();render();});
$('#water-change').addEventListener('click',()=>{
  if(observedAnimal)observeAnimal(null);
  if(!ready||editing||watchState)return;
  if(waterChange?.stage==='low'){startRefill();}
  else if(!waterChange){
    siphoning=false;siphonTip=null;drag=null;
    const c=camera();startWaterChange(clamp(c.left+c.w*.79,left+70,right-85));
  }
  syncCareControls();render();
});
$('#care-hour').addEventListener('click',()=>{
  if(!careDemo||food.length||waterChange)return;
  lastExchange=false;demoOffset+=3600000;advanceCare(careNow());for(const n of glassDwellers)resumeSnail(careNow(),n);syncCareControls();render();
});
window.addEventListener('pagehide',()=>{saveSnail(careNow());saveGlass();saveCare();});
window.addEventListener('storage',e=>{
  if(!ready||careDemo||!e.newValue)return;
  if(e.key===residentKey){
    reconcileResidents(readPopulation());updateStockPanel();render();return;
  }
  if(e.key===snailKey||e.key?.startsWith(snailKey+'.')){
    const n=[...glassDwellers].find(a=>snailSaveKey(a.careId)===e.key);
    if(n)try{restoreSnail(JSON.parse(e.newValue),n.careId);}catch{}
    return;
  }
  if(e.key!==algaeKey)return;
  try{mergeGlass(JSON.parse(e.newValue),careNow());}catch{}
});
document.addEventListener('visibilitychange',()=>{if(!ready)return;if(document.hidden){hiddenAt=careNow();saveSnail(careNow());saveGlass();saveCare();}else{resumeCare();for(const n of glassDwellers)resumeSnail(careNow(),n);}});
$('#feed').addEventListener('click',()=>setFeedingTool(!feedingArmed));
$('#quick-camera').addEventListener('click',e=>{
  if(!ready)return;
  const nextView=e.currentTarget.dataset.target;
  if(watchState)$('#close-watch').click();
  autoView=false;selectView(nextView);
});
$('#pan').addEventListener('input',e=>{pan=+e.target.value/1000;render();});
let openingEditor=false;
async function beginEdit(initialTool='objects'){
  if(!ready||editing||openingEditor||waterChange)return;
  openingEditor=true;
  const button=$('#edit'),label=button.querySelector('span');
  button.disabled=true;button.setAttribute('aria-busy','true');label.textContent='准备造景…';
  try{await prepareEditor();}
  catch{message('造景素材未加载完整，轻点「造景」重试。');return;}
  finally{openingEditor=false;button.removeAttribute('aria-busy');label.textContent='造景';refresh();}
  if(managing||watchState||waterChange||openingActive())return;
  roomDrawer(null);if(feedingArmed)setFeedingTool(false);
  manualLens=null;
  if(observedAnimal)observeAnimal(null);
  snapshot=structuredClone(layout);snapshotBed=terrain;snapshotFinish=naturalFinish;editorTool=initialTool;history=[];editing=true;compare=false;returnView=view;returnPan=pan;
  if(portrait.matches)view='near';
  if(!chosen())selected=mainPiece(layout);modified();resize();
  if(portrait.matches)keepVisible(selected,true);
}
$('#edit').addEventListener('click',()=>beginEdit());
function pieceIcon(p){
  const src=sprites[frameFor(p).sprite],ratio=104/Math.max(src.width,src.height);
  const tile=document.createElement('canvas');
  tile.width=Math.max(1,Math.round(src.width*ratio));tile.height=Math.max(1,Math.round(src.height*ratio));
  tile.getContext('2d').drawImage(src,0,0,tile.width,tile.height);
  tile.style.transform='rotate('+(p.tilt||0)+'deg) scaleX('+(p.flip?-1:1)+')';
  tile.setAttribute('aria-hidden','true');return tile;
}
function refreshPiecePicker(p,active){
  const picker=$('#piece-open'),settings=$('#adjust-open'),remove=$('#remove');
  const name=p?nameOf(p):layout.length?'点选下一件':'缸中暂无摆件';
  picker.disabled=compare||!layout.length;
  settings.disabled=!active;
  remove.hidden=!p;remove.disabled=!active;
  remove.setAttribute('aria-label',p?'移除「'+name+'」':'移除所选物件');
  picker.querySelector('strong').textContent=name;
  $('#adjust-dialog-title').textContent=name;
  const icon=picker.querySelector('.piece-image');
  const key=p?[p.id,p.kind,plantAge(p),seedOf(p),p.yaw,p.flip,p.tilt].join('/'):'';
  if(icon.dataset.key!==key){
    icon.replaceChildren(...(p?[pieceIcon(p)]:[]));icon.dataset.key=key;
  }
  if(!active&&$('#adjust-dialog').open)$('#adjust-dialog').close();
  if(picker.disabled&&$('#piece-dialog').open)$('#piece-dialog').close();
}
$('#piece-open').addEventListener('click',()=>{
  const grid=$('#piece-grid'),positions=geometry(layout);
  grid.replaceChildren(...layout.map(p=>{
    const card=document.createElement('button'),name=document.createElement('strong'),place=document.createElement('small');
    const g=positions.get(p.id),side=g.x<W*.36?'左侧':g.x>W*.64?'右侧':'中央';
    name.textContent=nameOf(p);place.textContent=side+' · '+(g.z<.33?'后景':g.z>.67?'前景':'中景');
    card.type='button';card.dataset.piece=p.id;card.setAttribute('aria-pressed',String(p.id===selected));
    card.append(pieceIcon(p),name,place);return card;
  }));
  const dialog=$('#piece-dialog');dialog.showModal();
  (grid.querySelector('[aria-pressed=true]')||grid.firstElementChild)?.focus();
});
$('#piece-grid').addEventListener('click',e=>{
  const id=e.target.closest('button')?.dataset.piece;
  if(!layout.some(p=>p.id===id))return;
  $('#piece-dialog').close();selected=id;modified();keepVisible(selected,true);
});
$('#adjust-open').addEventListener('click',()=>$('#adjust-dialog').showModal());
for(const dialog of document.querySelectorAll('.piece-sheet')){
  dialog.querySelector('[data-close-sheet]').addEventListener('click',()=>dialog.close());
}

portrait.addEventListener('change',()=>{
  if(!autoView)return;
  const next=portrait.matches?'near':'full';
  if(observedAnimal){view=next;refresh();resize();}
  else selectView(next);
  if(editing)returnView=next;
});
function finish(save){
  if(save){
    const reason=tankJournal.layoutReason(layout);if(reason){message(reason);return;}
  }
  const beforeBed=snapshotBed;
  if(!save){layout=snapshot;terrain=snapshotBed;naturalFinish=snapshotFinish;pan=returnPan;}
  activeBed=terrain;snapshotBed=null;
  const addedPlant=save&&layout.findLast(p=>plantLife[p.kind]&&!snapshot.some(old=>old.id===p.id));
  const stored=!save||saveLayout(layout);
  if(save&&stored){
    const changed=p=>{const old=snapshot.find(o=>o.id===p.id);return !old||JSON.stringify(old)!==JSON.stringify(p);};
    const events=[];
    if(addedPlant)events.push('plant-'+addedPlant.kind);
    if(layout.some(p=>p.kind==='stone'&&changed(p)))events.push('place-stone');
    if(beforeBed.heights.some((h,i)=>h!==terrain.heights[i]))events.push('shape-bed');
    if(layout.some(p=>plantLife[p.kind]&&layout.some(o=>o.id===p.host&&o.kind==='terrace')&&changed(p)))events.push('attach');
    tankJournal.record(events);
  }
  const finishStored=!save||storeFinish();
  if(save&&stored&&sample){
    const url=new URL(location.href);url.searchParams.delete('scene');url.searchParams.delete('light');url.searchParams.delete('edit');url.searchParams.delete('watch');url.searchParams.delete('plant');url.searchParams.delete('form');
    window.history.replaceState(null,'',url);
  }
  if(!chosen())selected=mainPiece(layout);
  editing=false;snapshot=null;compare=false;history=[];sliderBatch=null;drag=null;releaseUnusedMaterials();
  selectView(returnView);if(save)keepVisible(selected);
  if(addedPlant&&stored)tankNotes.planted(addedPlant);
  message(!stored?'本次造景已显示，当前浏览器未能保存，刷新后可能丢失。':finishStored?'':'造景已保存，当前浏览器未能记住光线选择。');$('#edit').focus({preventScroll:true});
}
$('#done').addEventListener('click',()=>finish(true));$('#cancel').addEventListener('click',()=>finish(false));
$('#undo').addEventListener('click',()=>{const prev=history.pop();if(!prev)return;layout=prev.items;naturalFinish=prev.finish;setTerrain(prev.bed);selected=prev.selected;modified();if(editorTool==='objects')keepVisible(selected);});
$('#compare').addEventListener('click',()=>{drag=null;compare=!compare;activeBed=compare?snapshotBed:terrain;modified();});
function storeScreenX(p,x,g){
  if(x<=g.min+1.2)p.x=0;
  else if(x>=g.max-1.2)p.x=1;
  else p.x=clamp(lateralAt(x,g.row));
}
function placeAtDepth(p,x,z){
  p.host=null;p.z=clamp(z);p.x=clamp(lateralAt(x,sandRow(p.z)));
  const g=geometry([p]).get(p.id);storeScreenX(p,x,g);
}
function locateOnSand(p,point,grip=null){
  // Project the very point held by the finger, including its displacement above the bed.
  p.host=null;
  function trial(z){
    p.z=z;p.x=clamp(lateralAt(point.x,sandRow(z)));
    const g=geometry([p]).get(p.id);
    const delta=grip?relativePoint(g,grip.u,grip.v):{x:0,y:0};
    const x=point.x-delta.x;
    const slopedBedOffset=rowY(g.row,clamp(x,g.min,g.max))-rowY(g.row,g.x);
    return {x,y:(grip?g.y+delta.y:g.bed)+slopedBedOffset};
  }
  let lo=0,hi=1;
  if(point.y<=trial(0).y)hi=0;
  else if(point.y>=trial(1).y)lo=1;
  else for(let i=0;i<13;i++){
    const z=(lo+hi)/2;if(trial(z).y<point.y)lo=z;else hi=z;
  }
  const z=(lo+hi)/2;placeAtDepth(p,trial(z).x,z);
}
$('#support').addEventListener('change',e=>{
  const p=chosen(),host=e.target.value,g=geometry(layout).get(p.id);remember();
  if(host){p.host=host;p.slot=.5;}else placeAtDepth(p,g.x,g.z);
  modified();keepVisible(p.id);
});
for(const k of ['size','tilt']){
  const el=$('#'+k);
  el.addEventListener('input',()=>{
    const p=chosen();if(!p||compare)return;
    if(sliderBatch!==k){remember();sliderBatch=k;}
    const v=+el.value;
    if(k==='tilt')p.tilt=v;
    if(k==='size')p.size=v/100;
    message();refresh();render();
  });
  for(const end of ['change','blur','pointerup','pointercancel','keyup'])el.addEventListener(end,()=>{sliderBatch=null;});
}
function markPlacementCell(p){
  for(const cell of document.querySelectorAll('.plan-cell')){
    cell.setAttribute('aria-pressed',String(+cell.dataset.row===Math.round(p.z*2)&&+cell.dataset.col===Math.round(p.x*4)));
  }
}
$('#placement-plan').addEventListener('toggle',()=>{if(chosen()&&$('#placement-plan').open)markPlacementCell(chosen());});
$('#placement').addEventListener('click',e=>{
  const b=e.target.closest('button'),p=chosen();
  if(!b||!editing||!p||compare||editorTool!=='objects'||b.disabled)return;
  if(b.dataset.axis){
    const input=$('#'+b.dataset.axis);
    input.value=Number(input.value)+Number(b.dataset.step);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    return;
  }
  if(b.classList.contains('plan-cell')&&!p.host){
    const x=Number(b.dataset.col)/4,z=Number(b.dataset.row)/2;
    if(p.x===x&&p.z===z)return;
    remember();p.x=x;p.z=z;modified();keepVisible(selected,true);
  }
});
for(const [id,x] of [['wall-left',0],['wall-right',1]])$('#'+id).addEventListener('click',()=>{
  const p=chosen();if(!p||p.host||p.x===x)return;remember();p.x=x;modified();keepVisible(selected,true);
});
$('#flip').addEventListener('click',()=>{const p=chosen();remember();p.flip=!p.flip;modified();});
$('#duplicate').addEventListener('click',()=>{
  const p=chosen();if(!p||layout.length>=40||!tankJournal.available(p.kind))return;remember();
  const baseX=lateralAt(geometry(layout).get(p.id).x,sandRow(p.z));
  const q={...p,id:makeId(),x:clamp(baseX+(baseX>.70?-.065:.065)),z:clamp(p.z+.04),slot:clamp(p.slot+(p.slot>.68?-.24:.24))};
  plantNew(q,Date.now(),p);layout.push(q);selected=q.id;modified();keepVisible(q.id);if(plantLife[q.kind])tankNotes.planted(q);
});
$('#remove').addEventListener('click',()=>{
  const p=chosen();if(!editing||compare||editorTool!=='objects'||!p)return;
  const name=nameOf(p);remember();
  const geo=geometry(layout);
  for(const child of layout.filter(o=>o.host===p.id)){
    const g=geo.get(child.id);placeAtDepth(child,g.x,g.z);
  }
  layout=layout.filter(v=>v.id!==p.id);selected=null;modified();
  message('已移除「'+name+'」，可点「撤销」放回原位。');
  (layout.length?$('#piece-open'):$('#undo')).focus({preventScroll:true});
});
$('#presets').addEventListener('change',e=>{
  if(!e.target.value||!tankJournal.presetAllowed(e.target.value)){e.target.value='';return;}remember();setTerrain(formForScene(e.target.value));layout=newGarden(e.target.value);selected=mainPiece(layout);
  e.target.value='';modified();keepVisible(selected,true);
});
$('#palette').addEventListener('click',e=>{
  const k=e.target.closest('button')?.dataset.kind;if(!k||!tankJournal.available(k)||compare||layout.length>=40)return;
  tankJournal.markSeen(k);
  remember();const c=camera(),p=piece(makeId(),k,clamp(lateralAt(c.left+c.w*.51,sandRow(.63))),.63);plantNew(p,Date.now(),layout.filter(item=>item.kind===k).at(-1));
  if(['moss','anubias','pinnatifida'].includes(k)){
    const host=layout.filter(v=>catalog[v.kind].support).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    if(host){p.host=host.id;p.slot=.53;p.z=host.z;}
  }
  layout.push(p);selected=p.id;modified();keepVisible(selected);if(plantLife[p.kind])tankNotes.planted(p);
  if(portrait.matches)$('#placement').scrollIntoView({block:'start'});
});
function worldPoint(e){
  const r=canvas.getBoundingClientRect(),c=camera();return {x:c.left+(e.clientX-r.left)*c.w/r.width,y:c.top+(e.clientY-r.top)*c.h/r.height};
}
function hits(p,g,point){
  const img=sprites[g.sprite];
  if(!g.attached&&point.y>pieceBedAt(g,point.x)+1)return false;
  if(g.attached&&(point.x<g.row.left||point.x>g.row.right))return false;
  const dx=point.x-g.x,dy=point.y-g.y;
  const u=(g.cos*dx+g.sin*dy)*g.sign/g.width+g.pivotX,v=(-g.sin*dx+g.cos*dy)/g.height+g.pivotY;
  if(u<0||u>=1||v<0||v>=1)return false;
  const alpha=masks[g.sprite][Math.floor(v*img.naturalHeight)*img.naturalWidth+Math.floor(u*img.naturalWidth)];
  return alpha*visibility(leafOcclusion(g.host,p.slot),point.x,point.y,g.pivotY-v,g.pivotY)>54;
}
function pickScenery(point,touch,geo){
  const front=sorted(layout,geo).reverse();
  const direct=front.find(p=>hits(p,geo.get(p.id),point));
  if(direct||!touch)return direct;
  for(const radius of [6,13,20]){
    const offsets=[[0,-1],[0,1],[-1,0],[1,0],[-.707,-.707],[.707,-.707],[-.707,.707],[.707,.707]];
    const hit=front.find(p=>offsets.some(([x,y])=>hits(p,geo.get(p.id),{
      x:point.x+x*radius*worldPerPixel,y:point.y+y*radius*worldPerPixel})));
    if(hit)return hit;
  }
}
function snap(p,point){
  if(!catalog[p.kind].attaches)return null;
  const geo=geometry(layout),px=stage.clientWidth/camera().w,tolerance=clamp(13/px,11,30);
  let best=null,bestCost=Infinity;
  for(const host of layout.filter(v=>catalog[v.kind].support)){
    const g=geo.get(host.id);
    for(let j=0;j<=40;j++){
      const t=j/40;if(occludedAt(g,t))continue;
      const pt=surfaceAt(g,t),dist=Math.hypot(point.x-pt.x,point.y-pt.y);
      if(dist<=tolerance&&dist<bestCost){bestCost=dist;best={id:host.id,slot:t};}
    }
  }
  return best;
}
function placeAt(p,point,grip=null){
  const anchor=grip?{x:point.x+grip.dx,y:point.y+grip.dy}:point;
  const s=snap(p,anchor);
  if(s){p.host=s.id;p.slot=s.slot;return true;}
  if(grip&&!p.host){locateOnSand(p,point,grip);return true;}
  if(sandContains(anchor.x,anchor.y,4)){locateOnSand(p,anchor);return true;}
  return false;
}
function moveHeld(clientX,clientY){
  const point=worldPoint({clientX,clientY});placeAt(chosen(),point,drag);
}
function panAtEdge(dt){
  if(view!=='near'||drag?.action!=='place'||!drag.moved)return;
  const rect=canvas.getBoundingClientRect(),edge=Math.min(rect.width*.12,40),x=drag.lastX-rect.left;
  const speed=clamp((x-rect.width+edge)/edge)-clamp((edge-x)/edge);
  if(!speed)return;
  const next=clamp(pan+dt*speed*.54);if(next===pan)return;
  pan=next;moveHeld(drag.lastX,drag.lastY);
}
function beginTankStroke(e){
  if(!ready||compare)return;
  const point=worldPoint(e);
  if(moveCareView&&(wipingGlass||siphoning)){
    drag={id:e.pointerId,action:'care-pan',anchor:point,h:camera().h};return;
  }
  if(managing){
    if(landingNet)return;
    drag={id:e.pointerId,action:'stock',cx:e.clientX,cy:e.clientY,startPan:pan,moved:false,
      animal:stockMode==='net'?pickResident(point):null};
    return;
  }
  if(waterChange){
    if(waterChange.stage==='drain'&&sandContains(point.x,point.y,9)){
      drag={id:e.pointerId,action:'drain-tip',point};
      waterChange.tipX=point.x;waterChange.tipY=point.y-2;vacuumStroke(point,point);
    }
    return;
  }
  if(wipingGlass){
    drag={id:e.pointerId,action:'wipe',point,pass:new Map()};
    scrapeTo(e,true);render();return;
  }
  if(siphoning){
    drag={id:e.pointerId,action:'siphon',point};
    vacuumStroke(point,point);render();return;
  }
  if(watchState){
    drag={id:e.pointerId,action:'leaf',touchedLeaf:!!touchSpecimen(point),lastX:point.x,cx:e.clientX,cy:e.clientY,moved:false};
    return;
  }
  if(editing&&editorTool==='bed'){pickBedInTank(point);return;}
  if(!editing){
    drag={id:e.pointerId,action:'watch',cx:e.clientX,cy:e.clientY,startPan:pan,moved:false};
  }else{
    const geo=geometry(layout),hit=pickScenery(point,e.pointerType==='touch',geo);
    if(hit){
      selected=hit.id;const g=geo.get(hit.id);
      const dx=point.x-g.x,dy=point.y-g.y;
      drag={id:e.pointerId,action:'place',dx:-dx,dy:(g.attached?g.y:g.bed)-point.y,
        u:(g.cos*dx+g.sin*dy)*g.sign/g.width+g.pivotX,v:(-g.sin*dx+g.cos*dy)/g.height+g.pivotY,
        cx:e.clientX,cy:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
    }else if(chosen()&&(snap(chosen(),point)||sandContains(point.x,point.y,3))){
      remember();if(!placeAt(chosen(),point))history.pop();
    }else if(view==='near'){
      drag={id:e.pointerId,action:'pan',cx:e.clientX,startPan:pan};
    }
    modified();
  }
}
canvas.addEventListener('pointerleave',()=>{if(!drag)scraper=null;});
function moveTankStroke(e){
  if(wipingGlass&&!moveCareView&&!drag&&e.pointerType==='mouse'){positionBlade(e);return;}
  if(!drag||e.pointerId!==drag.id)return;
  if(drag.action==='care-pan'){
    const r=canvas.getBoundingClientRect();
    placeLens(r,drag.h,drag.anchor,{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});return;
  }
  if(drag.action==='wipe'){
    if(wipingGlass)scrapeTo(e);
    return;
  }
  if(drag.action==='drain-tip'){
    if(waterChange?.stage==='drain'){
      const p=worldPoint(e);
      if(sandContains(p.x,p.y,9)){
        waterChange.tipX=p.x;waterChange.tipY=p.y-2;
        vacuumStroke(drag.point,p);drag.point=p;
      }
    }
    return;
  }
  if(drag.action==='siphon'){const p=worldPoint(e);vacuumStroke(drag.point,p);drag.point=p;return;}
  if(drag.action==='leaf'){
    if(watchState){
      const point=worldPoint(e);
      if(Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)>7)drag.moved=true;
      if(touchSpecimen(point,point.x-drag.lastX))drag.touchedLeaf=true;
      drag.lastX=point.x;
    }
    return;
  }
  if(drag.action==='watch'||drag.action==='stock'||drag.action==='pan'){
    if(drag.action!=='pan'){
      if(Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)>7)drag.moved=true;
      if(!drag.moved||view!=='near')return;
    }
    const c=camera();pan=clamp(drag.startPan-(e.clientX-drag.cx)*c.w/canvas.clientWidth/Math.max(1,1164-c.w));$('#pan').value=Math.round(pan*1000);
  }else{
    if(!drag.moved&&Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)<3)return;
    if(!drag.moved){remember();drag.moved=true;}
    drag.lastX=e.clientX;drag.lastY=e.clientY;drag.pending=true;return;
  }
  render();
}
function endTankStroke(event,e){
  if(e.pointerId!==drag?.id)return;
  if(drag.action==='place'&&drag.moved){
    if(event==='pointerup')moveHeld(e.clientX,e.clientY);
    else if(drag.pending)moveHeld(drag.lastX,drag.lastY);
    drag=null;refresh();render();return;
  }
  if(drag.action==='stock'&&event==='pointerup'&&!drag.moved&&stockMode==='net'&&!landingNet){
    selectResident(drag.animal,false);
  }
  if(drag.action==='wipe'){
    if(event==='pointerup'&&wipingGlass)scrapeTo(e);
    if(e.pointerType!=='mouse'||event!=='pointerup')scraper=null;
    finishScrapeNotes(drag.pass,event==='pointerup'||event==='gesture'&&drag.moving);saveGlass();finishOpeningWipe();render();
  }
  if(drag.action==='siphon'||drag.action==='drain-tip'){siphonTip=null;saveCare();}
  if(event==='pointerup'&&(drag.action==='watch'||drag.action==='leaf')&&!drag.moved&&!drag.touchedLeaf&&Math.hypot(e.clientX-drag.cx,e.clientY-drag.cy)<=7){
    const point=worldPoint(e);
    const touched=[...glassDwellers].find(n=>onGlass(n)&&Math.hypot(n.x-point.x,n.y-point.y)<16);
    if(feedingArmed)givePinch(point);
    else{
      tankNotes.inspect(point);
      if(touched)touched.rest=3.3;
      else if(!touchShrimp(pickResident(point),point))touchWater(point);
    }
  }
  drag=null;
}
const cancelTankTouches=bindTankPointers(canvas,{
  enabled:()=>ready,camera,place:placeLens,down:beginTankStroke,move:moveTankStroke,end:endTankStroke,
  interrupt:()=>{if(drag)endTankStroke('gesture',{pointerId:drag.id});scraper=null;siphonTip=null;}
});
function registerSilhouette(key,im,alpha){
  const w=im.naturalWidth,h=im.naturalHeight;
  if(!alpha){
    const rgba=imagePixels(im,w,h);alpha=new Uint8Array(w*h);
    for(let i=0;i<alpha.length;i++)alpha[i]=rgba[4*i+3];
  }
  masks[key]=alpha;silhouettes[key]=traceSilhouette(alpha,w,h);
  const mark=document.createElement('canvas');mark.width=160;mark.height=Math.max(32,Math.round(160*h/w));
  const mg=mark.getContext('2d');mg.filter='blur(2px)';mg.drawImage(im,4,4,mark.width-8,mark.height-8);mg.filter='none';
  mg.globalCompositeOperation='source-in';mg.fillStyle='#443e26';mg.fillRect(0,0,mark.width,mark.height);shadows[key]=mark;
}
function fillPalette(){
  for(const [k,d] of Object.entries(catalog)){
    const b=document.createElement('button'),im=d.living?plantThumbnail({kind:k,id:'palette'},2,2):new Image();
    if(!d.living){im.src='assets/'+d.sprite+'.webp';im.alt='';}
    b.dataset.kind=k;b.setAttribute('aria-label','添加'+d.name);b.append(im,d.name);
    if(plantLife[k]){const cycle=document.createElement('small');cycle.textContent=growthDuration(plantLife[k].hours[1])+'成株';b.append(cycle);}
    $('#palette').append(b);
  }
}
async function start(){
  await Promise.all([
    ...layout.map(p=>loadPieceArt(p,true)),loadSubstrateMaterials(activeBed.style),
    ...['clear-tank','window-alcove','limestone-surface','sage-cabinet','pendant','siphon-bell',
      'glass-scraper','zebra-nerite','nerite-side','cherry-shrimp','glass-shrimp-clear','landing-net',
      'guppy','tetra','white-cloud'].map(key=>loadSprite(key))
  ]);
  makeShrimpSkins();loadGlass();loadResidents();loadCare();prepareOpening();makeLightMaps();updateBedPhoto();lightTarget();ready=true;tankJournal.init();
  if(careDemo&&entry.get('animal')==='glassShrimp'){
    glassStart=careNow()-12*algaeHour;glassRedraw=true;
    const a=newResident('glassShrimp','trial-glass-shrimp',1,438,480,.44);
    stockKind='glassShrimp';a.showcaseStart=true;resize();stepGlassShrimp(a,0);observeAnimal(a);
  }
  if(sample==='archway'&&entry.get('edit')==='turn')await beginEdit();
  if(['plant','grown'].includes(entry.get('watch'))){
    const subject=layout.find(p=>p.kind===entry.get('plant'));
    const rawForm=entry.get('form'),form=subject&&['0','1','2'].includes(rawForm)?Number(rawForm):null;
    openWatch(subject?.id,entry.get('watch')==='grown',form);
  }
  refresh();keepVisible(selected,true);resize();$('#load').hidden=true;$('#edit').disabled=false;$('#feed').disabled=false;
  if(entry.get('panel')==='residents'&&!openingActive()&&!watchState&&!editing)showResidents(true);
  refreshOpening();
  new ResizeObserver(([entry])=>{
    const {width,height}=entry.contentRect;
    if(Math.abs(width-lastCanvasWidth)<.1&&Math.abs(height-lastCanvasHeight)<.1)return;
    cancelTankTouches();resize();
  }).observe(canvas);
  requestAnimationFrame(frame);
}
bindWatch();bindResidents();bindRoom();tankJournal.bind();
start().catch(error=>{console.error(error);$('#load').textContent='场景素材未加载完整，请刷新重试';});

;
/* bed-editor */
'use strict';

const bankRows=['后景','中景','前景'],bankCols=['最左','左侧','中央','右侧','最右'];
let bedCell=7,bedBeforeStroke=null;
const bedMap=$('#bed-map');
function setTerrain(value){terrain=value;activeBed=compare?snapshotBed:terrain;}
function chooseCell(index,center=false){
  bedCell=index;refreshBed();
  if(center&&view==='near'){
    const c=camera();pan=clamp((cellPoint().x-.5*c.w-18)/Math.max(1,1164-c.w));$('#pan').value=Math.round(1000*pan);
  }
  render();
}
function cellPoint(){
  const row=sandRow(Math.floor(bedCell/5)/2),x=mix(row.left,row.right,(bedCell%5)/4);
  return {x,y:rowY(row,x)};
}
function pickBedInTank(point){
  if(!sandContains(point.x,point.y,6))return;
  const z=sandDepthAt(point.x,point.y),r=sandRow(z);
  chooseCell(5*Math.round(z*2)+Math.round(4*clamp((point.x-r.left)/(r.right-r.left))));
}
function refreshBed(){
  for(const b of $('#bed-styles').children){
    b.setAttribute('aria-pressed',String(activeBed.style===b.dataset.style));b.disabled=compare;
  }
  for(const b of $('#bed-forms').children){
    b.setAttribute('aria-pressed',String(bedForms[b.dataset.form].every((n,i)=>n===activeBed.heights[i])));b.disabled=compare;
  }
  const level=activeBed.heights[bedCell];
  for(const b of bedMap.children){
    const i=Number(b.dataset.cell),h=activeBed.heights[i];
    b.setAttribute('aria-pressed',String(i===bedCell));b.style.setProperty('--fill','hsl(42 23% '+(86-h*.49)+'%)');b.disabled=compare;
  }
  $('#bed-height').value=level;$('#bed-height').disabled=compare;
  $('#bed-place').textContent=bankRows[Math.floor(bedCell/5)]+' · '+bankCols[bedCell%5];
  $('#bed-level').textContent='高度 '+Math.round(100*level/54)+'%';
  $('#bed-up').disabled=compare||level===54;$('#bed-down').disabled=compare||level===0;
}
function shiftBed(level,batch=false){
  if(!editing||compare||level===terrain.heights[bedCell])return;
  if(!batch||sliderBatch!=='bed-height'){remember();bedBeforeStroke=terrain;}
  sliderBatch=batch?'bed-height':null;
  const heights=bedBeforeStroke.heights.slice();heights[bedCell]=level;
  // Sand spreads behind a newly raised bank, and spills forward when its support is lowered.
  for(let i=bedCell-5;i>=0;i-=5)heights[i]=Math.max(heights[i],heights[i+5]-20);
  for(let i=bedCell+5;i<15;i+=5)heights[i]=Math.min(heights[i],heights[i-5]+20);
  setTerrain({...terrain,heights});
  refreshBed();$('#undo').disabled=false;
}
function setupBedTools(){
  for(const [key,name] of Object.entries(bedStyleNames)){
    const b=document.createElement('button'),im=new Image();im.src='assets/bed/'+key+'.webp';im.alt='';
    b.dataset.style=key;b.append(im,name);$('#bed-styles').append(b);
  }
  for(let i=0;i<15;i++){
    const b=document.createElement('button');b.type='button';b.dataset.cell=i;
    b.setAttribute('aria-label',bankRows[Math.floor(i/5)]+' '+bankCols[i%5]);bedMap.append(b);
  }
  bedMap.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!compare)chooseCell(+b.dataset.cell,true);});
  $('#bed-styles').addEventListener('click',e=>{
    const style=e.target.closest('button')?.dataset.style;if(!style||compare||style===terrain.style)return;
    remember();setTerrain({...terrain,style});modified();
  });
  $('#bed-forms').addEventListener('click',e=>{
    const form=e.target.closest('button')?.dataset.form;if(!form||compare||bedForms[form].every((v,i)=>v===terrain.heights[i]))return;
    remember();setTerrain(bedFrom(form,terrain.style));modified();
  });
  const level=$('#bed-height');level.addEventListener('input',()=>shiftBed(+level.value,true));
  for(const end of ['change','blur','pointerup','pointercancel','keyup'])level.addEventListener(end,()=>{sliderBatch=null;});
  $('#bed-up').addEventListener('click',()=>shiftBed(clamp(terrain.heights[bedCell]+6,0,54)));
  $('#bed-down').addEventListener('click',()=>shiftBed(clamp(terrain.heights[bedCell]-6,0,54)));
  $('#work-tabs').addEventListener('click',e=>{
    const tab=e.target.closest('button')?.dataset.tool;if(!tab)return;
    editorTool=tab;drag=null;modified();
  });
}
setupBedTools();

;
/* tool-shelves */
'use strict';

(() => {
  const get = id => document.getElementById(id);
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  }
  function button(name, className) {
    const node = element('button', className, name);
    node.type = 'button';
    return node;
  }

  const select = get('presets');
  const captions = {
    'black-bank': '深色底床托起左岸的草坡，右边留出一段开阔的水。',
    'fern-bank': '让裂叶攀上沉木，细砂从木石之间穿过。',
    creek: '木石分置两岸，中间留一条细窄的沙径。',
    islands: '两组高低错落的木石隔水相望。',
    slope: '高枝与密草聚在一侧，向开阔的浅滩渐渐降低。',
    archway: '拱木和层石之间，藏着前后相通的小路。'
  };
  const gallery = element('dialog', 'scape-album');
  gallery.setAttribute('aria-labelledby', 'album-heading');
  const galleryTitle = element('h2', '', '参考造景');
  galleryTitle.id = 'album-heading';
  const galleryHeader = element('div', 'album-head');
  const closeGallery = button('收起', 'plain');
  galleryHeader.append(galleryTitle, closeGallery);
  const hero = element('canvas', 'album-photo');
  hero.width = 672;
  hero.height = 270;
  hero.setAttribute('role', 'img');
  const heroTitle = element('h3');
  const caption = element('p', 'album-caption');
  const choices = element('div', 'album-choices');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', '选择参考构图');
  const apply = button('采用这套布置', 'primary');
  const reason = element('span', 'album-unlock');
  reason.setAttribute('role', 'status');
  const albumFooter = element('div', 'album-footer');
  albumFooter.append(reason, apply);
  const captionBlock = element('div', 'album-legend');
  captionBlock.append(heroTitle, caption);
  gallery.append(galleryHeader, hero, captionBlock, choices, albumFooter);
  document.body.append(gallery);

  const references = new Map();
  let current = null;

  // These are postcards of the mature composition. Read live art into an independent
  // canvas, so browsing the album never replaces the tank or touches its saved bed.
  function paintReference(canvas, key) {
    const c = canvas.getContext('2d');
    const scale = canvas.width / 1050, upper = 255;
    c.setTransform(scale, 0, 0, scale, -75 * scale, -upper * scale);
    c.drawImage(sprites['clear-tank'], 0, 0, W, H);
    const bed = formForScene(key), profile = profileFor(bed);
    const baseRow = sandRow(0), frontRow = sandRow(1);
    if (bed.style !== 'sand') {
      c.save();
      c.beginPath();
      for (let x = 65; x <= 1135; x += 5) {
        const y = rowYFlat(baseRow, x) - profile.bands[0][x];
        if (x === 65) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      for (let x = 1135; x >= 65; x -= 5) c.lineTo(x, rowYFlat(frontRow, x) + 10);
      c.closePath();
      c.clip();
      // Stretch only the exposed sand band over the new profile, then pick up its soil tone.
      const bg = sprites['clear-tank'];
      c.drawImage(bg, bg.naturalWidth*.10, bg.naturalHeight*.75, bg.naturalWidth*.80, bg.naturalHeight*.085, 60, 535, 1080, 148);
      c.globalCompositeOperation = bed.style === 'soil' ? 'multiply' : 'screen';
      c.fillStyle = bed.style === 'soil' ? '#575146' : 'rgba(222,215,184,.22)';
      c.fillRect(60, 535, 1080, 148);
      c.restore();
    }
    const items = composition(key);
    // Share the five mature specimens already cached for the materials shelf.
    for (const item of items) if (catalog[item.kind].living) {
      item.growthSeed = seedOf({kind:item.kind,id:'palette'});
    }
    const geo = geometry(items);
    for (const item of sorted(items, geo)) {
      const g = geo.get(item.id);
      const column = clamp(Math.round(g.x),0,W);
      const row = g.z*2, lo = Math.min(1, Math.floor(row)), fraction = row-lo;
      const height = mix(profile.bands[lo][column], profile.bands[lo+1][column], fraction);
      c.save();
      c.translate(g.x, g.y + terrainHeight(g.x, g.z) - height);
      c.rotate(g.angle);
      c.scale(g.sign, 1);
      c.drawImage(sprites[g.sprite], -g.width*g.pivotX, -g.height*g.pivotY, g.width, g.height);
      c.restore();
    }
    c.setTransform(1,0,0,1,0,0);
  }

  for (const option of select.options) {
    if (!option.value) continue;
    const thumb = element('canvas');
    thumb.width = hero.width;
    thumb.height = hero.height;
    thumb.setAttribute('aria-hidden','true');
    const name = option.textContent;
    const choice = button('', 'album-choice');
    choice.setAttribute('aria-label', '预览'+name);
    choice.append(thumb, element('span','',name));
    choices.append(choice);
    references.set(option.value, {option, thumb, choice, name});
    choice.addEventListener('click', () => showReference(option.value));
  }
  function updateApply() {
    if (!current) return;
    const {option} = references.get(current);
    apply.disabled = select.disabled || option.disabled || option.hidden;
    if (apply.disabled) reason.textContent = option.dataset.lockReason || (select.disabled ? '结束原景对照后可以采用。' : '收集齐这套素材后可以采用。');
    else reason.textContent = '采用后可撤销，保存后生效。';
  }
  function showReference(key) {
    current = key;
    const selectedRef = references.get(key);
    for (const ref of references.values()) ref.choice.setAttribute('aria-pressed',String(ref === selectedRef));
    hero.getContext('2d').drawImage(selectedRef.thumb,0,0);
    hero.setAttribute('aria-label',selectedRef.name+'构图');
    heroTitle.textContent = selectedRef.name;
    caption.textContent = captions[key] || '';
    updateApply();
  }
  const openGallery = button('参考造景', 'plain album-open');
  openGallery.setAttribute('aria-haspopup','dialog');
  openGallery.addEventListener('click', () => {
    if (!ready) return;
    if (!hero.dataset.painted) {
      for (const [key,ref] of references) paintReference(ref.thumb,key);
      hero.dataset.painted = 'true';
    }
    showReference(current || 'islands');
    gallery.showModal();
  });
  closeGallery.addEventListener('click', () => gallery.close());
  apply.addEventListener('click', () => {
    updateApply();
    if (apply.disabled) return;
    select.value = current;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    gallery.close();
  });
  new MutationObserver(() => { if (gallery.open) updateApply(); }).observe(select,{subtree:true,attributes:true,attributeFilter:['disabled','hidden','data-lock-reason']});
  // Keep the canonical preset select and its game validation as the sole apply path.
  select.closest('.group').hidden = true;

  const editor = get('editor');
  const deskTitle = element('h2','','造景台');
  const deskHead = element('div','desk-head');
  deskHead.append(deskTitle,openGallery,get('done'));
  editor.prepend(deskHead,get('work-tabs'));
  const objectPane = get('object-editor');
  const shelf = objectPane.querySelector('.shelf');
  const tools=objectPane.querySelector('.tools');
  const placement=get('placement');
  placement.querySelector('.piece-picker').after(tools.querySelector('#support-field'));
  tools.prepend(get('turn-panel'),get('object-actions'));
  get('adjust-dialog').append(tools);
  objectPane.replaceChildren(placement,shelf);
  const plan=placement.querySelector('.plan-rows');
  for(const [row,depth] of ['后景','中景','前景'].entries()){
    plan.append(element('span','plan-label',depth));
    for(const [col,side] of ['最左','偏左','中央','偏右','最右'].entries()){
      const cell=button('','plan-cell');
      cell.dataset.col=col;cell.dataset.row=row;
      cell.setAttribute('aria-label',depth+side);plan.append(cell);
    }
  }
  shelf.querySelector('.shelf-title').textContent = '添入缸中';
  shelf.querySelector('.plant-shelf-note').textContent = '点素材添入缸中，拖动滑杆调整位置。水草从幼株开始长。';
  const footer = editor.querySelector('footer');
  footer.prepend(editor.querySelector('.edit-head .actions'));
  deskHead.insertBefore(get('undo'),openGallery);
  get('cancel').textContent = '放弃改动';

  for (const [id,image] of [['siphon','siphon-bell'],['wipe-glass','glass-scraper']]) {
    get(id).style.setProperty('--tool-image','url("assets/'+image+'.webp")');
  }
})();
