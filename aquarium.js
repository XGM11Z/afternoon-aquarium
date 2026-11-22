'use strict';
const stage = document.querySelector('#stage');
const canvas = document.querySelector('#water');
const ctx = canvas.getContext('2d');
const bg = document.querySelector('.scene');
const room = document.querySelector('#room');
const pauseButton = document.querySelector('#pause');
const feedButton = document.querySelector('#feed');
const expandButton = document.querySelector('#expand');
const message = document.querySelector('#message');
const W=1000, wideHeight=W*941/1672, left=52, right=940;
let H=wideHeight,surface=100,floor=432,square=false,worldPerPixel=1;
const scenery=new AquariumScenery(bg,document.querySelector('#optics'));
const rootedPlant=new RootedPlant();
const plantButton=document.querySelector('#plant');
const audioStatus=document.querySelector('#feeding-audio');
const clock=document.querySelector('#clock');
let day=aquariumDaylight(new Date()), minuteStamp=-1;
function syncClock(){
  const now=new Date(), stamp=Math.floor(now.getTime()/60000);
  if(stamp===minuteStamp)return;
  minuteStamp=stamp;day=aquariumDaylight(now);
  clock.textContent=day.label+' · 当地 '+day.clock;
}
function depth(fraction){return surface+(floor-surface)*fraction;}
const clamp = (x,lo,hi) => Math.min(hi, Math.max(lo,x));
const rand = (a,b) => a + (b-a)*Math.random();
const approach = (a,b,rate,dt) => a + (b-a)*(1-Math.exp(-rate*dt));
const spriteBySpecies=new Map(Array.from(document.querySelectorAll('.stock img[data-species]'),img=>[img.dataset.species,img]));
const swimTraits={
  guppy:{cruise:25,chase:114,notice:.96,nightDelay:1.5,tailBeat:1.9,opacity:.96},
  tetra:{cruise:30,chase:100,notice:1.6,nightDelay:1,tailBeat:1.9,opacity:.90},
  whiteCloud:{cruise:42,chase:108,notice:1.12,nightDelay:1.25,tailBeat:2.35,opacity:.96}
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduceMotion.matches;
let time = 0, lastFrame = 0, nextShoalMove = 8, lastFeed = -10;

const school = {x:695,y:297};
const food = [], ripples = [], tastes = [];
const hint = '轻点水面喂鱼';
function spawnFish(species,x,y,width,schoolIndex=null) {
  const facing=schoolIndex===null?1:-1;
  return {species,traits:swimTraits[species],x,y,width,baseWidth:width,schoolIndex,
    behindWood:schoolIndex===null||schoolIndex===1,
    vx:facing>0?10:-12,vy:0,facing,yaw:facing,
    pitch:0,phase:rand(0,6.28),roll:rand(0,6.28),goal:{x:x+20,y},
    nextGoal:1.5,restUntil:0,noticeAt:0,target:null,approachSide:1,peckAge:2,lastWake:-8,visitedGrass:false};
}
const fish = [
  spawnFish('guppy',475,215,92),
  spawnFish('tetra',688,284,54,0),spawnFish('tetra',759,260,49,1),spawnFish('tetra',807,298,51,2),
  spawnFish('whiteCloud',647,171,80)
];
const motes = Array.from({length:23},()=>({x:rand(57,941),y:rand(115,405),phase:rand(0,7)}));
function resize(){
  const rect=stage.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
  const mobile=matchMedia('(orientation:portrait) and (max-width:900px)').matches;
  worldPerPixel=W/Math.max(1,rect.width);
  if(square!==mobile){
    const oldSurface=surface,oldFloor=floor;
    square=mobile;H=square?1000:wideHeight;
    surface=square?246:100;floor=square?795:432;
    const remap=y=>surface+(y-oldSurface)*(floor-surface)/(oldFloor-oldSurface);
    fish.forEach(f=>{f.y=remap(f.y);f.goal.y=remap(f.goal.y);f.width=f.baseWidth*(square?1.43:1);});
    school.y=remap(school.y);
    for(const list of [food,ripples,tastes,motes])list.forEach(item=>{item.y=remap(item.y);});
  }
  canvas.width=Math.max(1,Math.round(rect.width*dpr));
  canvas.height=Math.max(1,Math.round(rect.height*dpr));
  scenery.resize(canvas.width,canvas.height);
  draw();
}
function scatter(x) {
  if(paused || time-lastFeed<.55) return;
  if(food.length>9)return;
  lastFeed=time;x=clamp(x,95,895);
  for(let i=0;i<3;i++){
    const shape=Array.from({length:6},()=>rand(.66,1));
    food.push({x:x+(i-1)*Math.max(7,worldPerPixel*4.8)+rand(-4,4),y:surface-rand(9,18),
      age:0,phase:rand(0,6.28),drift:rand(-1.8,1.8),settle:rand(10,16),wet:false,
      velocityY:rand(6,18),soak:rand(.32,1.05),shape,scale:rand(.83,1.15),tone:Math.random(),taken:false});
  }
  fish.forEach(f=>{if(!f.target)f.noticeAt=time+rand(.35,f.traits.notice)+(1-day.light)*f.traits.nightDelay;});
  audioStatus.textContent='鱼食落入水中';
}
function mouth(f){
  const dx=f.width*.45;
  return {x:f.x+dx*f.yaw*Math.cos(f.pitch),y:f.y+dx*Math.sin(f.pitch)};
}
function updateFish(f,dt){
  if(f.target && (!food.includes(f.target) || f.target.taken)) f.target=null;
  if(!f.target && time>=f.restUntil && time>=f.noticeAt){
    let best=Infinity;
    for(const p of food){
      if(p.taken||!p.wet)continue;
      const crowded=fish.some(o=>o!==f && o.target===p)?65:0;
      const distance=Math.hypot(p.x-f.x,p.y-f.y)+crowded;
      if(distance<best){best=distance;f.target=p;}
    }
    if(f.target){
      const margin=f.width*.95;
      f.approachSide=f.target.x<left+margin?-1:f.target.x>right-margin?1:Math.sign(f.target.x-f.x)||1;
    }
  }
  let gx,gy;
  if(f.target){
    gx=f.target.x-f.approachSide*f.width*.45;
    gy=clamp(f.target.y - Math.sin(f.pitch)*f.width*.45 + 2,surface+5,floor-2);
  }else if(f.species==='guppy'){
    if(time>=f.nextGoal){
      // Every so often the guppy crosses behind the driftwood.
      const leftVisit=!f.visitedGrass || (f.goal.x>430 && Math.random()<.6);
      const active=day.light;
      f.goal={x:active<.32?rand(190,425):(leftVisit?rand(170,345):rand(389,840)),
        y:depth(active<.32?rand(.47,.77):rand(.12,.65))};
      if(!f.visitedGrass){
        f.goal={x:square?242:168,y:depth(square?.19:.22)};
        f.visitedGrass=true;
      }
      f.nextGoal=time+rand(7,12)+(1-active)*10;
    }
    gx=f.goal.x;gy=f.goal.y;
  }else if(f.species==='whiteCloud'){
    if(time>=f.nextGoal){
      const resting=day.light<.32;
      // Short runs across open water, with only a small change of depth on each pass.
      const nextX=f.goal.x>520?rand(270,472):rand(625,840);
      f.goal={x:resting?rand(255,495):nextX,y:depth(resting?rand(.42,.64):rand(.14,.38))};
      f.nextGoal=time+(resting?rand(9,15):rand(4.8,8.5));
    }
    gx=f.goal.x;gy=f.goal.y;
  }else{
    const offsets=[[-47,4],[17,-19],[55,19]],offset=offsets[f.schoolIndex];
    gx=school.x+offset[0]+12*Math.sin(time*.28+f.roll);gy=school.y+offset[1]+6*Math.sin(time*.39+f.roll);
  }
  let dx=gx-f.x,dy=gy-f.y;
  if(!f.target){
    for(const other of fish){
      if(other===f)continue;
      const sx=f.x-other.x,sy=f.y-other.y,length=Math.hypot(sx,sy);
      if(length>0 && length<34){dx+=sx*(34-length)/24;dy+=sy*(34-length)/24;}
    }
  }
  const distance=Math.hypot(dx,dy), resting=time<f.restUntil;
  const activity=f.target?.67+.33*day.light:.26+.74*day.light;
  const glide=(f.species==='whiteCloud' && !f.target) ? .75+.25*Math.sin(time*2.05+f.roll) : 1;
  const maxSpeed=(f.target?f.traits.chase:f.traits.cruise*glide)*activity*(square?1.35:1);
  const speed=resting?0:Math.min(maxSpeed,distance*(f.target?2.55:.78));
  let wantedX=speed*dx/Math.max(distance,.01),wantedY=speed*dy/Math.max(distance,.01);
  if(!f.target && !resting)wantedY+=.95*Math.sin(time*1.46+f.roll);
  f.vx=approach(f.vx,wantedX,resting?9:3.1,dt);f.vy=approach(f.vy,wantedY,resting?9:3,dt);
  if(f.target && distance<32)f.facing=f.approachSide;
  else if(Math.abs(f.vx)>4.5)f.facing=Math.sign(f.vx);
  f.yaw=approach(f.yaw,f.facing,3.6,dt);
  const tilt=clamp(Math.atan2(f.vy,Math.abs(f.vx)+12),-.55,.48);
  f.pitch=approach(f.pitch,tilt,3.2,dt);
  f.x=clamp(f.x+f.vx*dt,left+f.width*.45,right-f.width*.45);
  f.y=clamp(f.y+f.vy*dt,surface+5,floor);
  f.phase+=dt*(f.traits.tailBeat+1.7*day.light + Math.min(Math.hypot(f.vx,f.vy),110)*.095);
  f.peckAge+=dt;
  if(f.y<surface+f.width*.21 && Math.hypot(f.vx,f.vy)>14 && time-f.lastWake>1.2){
    ripples.push({x:f.x,y:surface-H*.009,age:0,strength:.29});f.lastWake=time;
  }
  if(f.target){
    const m=mouth(f);
    const gap=Math.hypot(m.x-f.target.x,m.y-f.target.y);
    if(gap<8){
      // Close the last few millimetres by suction. The flake disappears at the mouth.
      const blend=1-Math.exp(-22*dt);
      f.target.x+=(m.x-f.target.x)*blend;f.target.y+=(m.y-f.target.y)*blend;
      if(gap<3.5 || gap<worldPerPixel*1.5){
        const p=f.target;p.taken=true;f.target=null;f.peckAge=0;f.restUntil=time+rand(.3,.62);
        f.vx*=.61;f.vy*=.64;
        for(let i=0;i<2;i++)tastes.push({x:m.x,y:m.y,age:0,vx:rand(-4,4),vy:rand(1.8,5.2),size:rand(.4,.9)});
      }
    }
  }
}
function update(dt){
  time+=dt;
  if(time>=nextShoalMove){
    const resting=day.light<.32;
    school.x=resting?rand(530,675):(school.x>545?rand(260,555):rand(625,817));
    school.y=depth(resting?rand(.64,.81):rand(.22,.65));
    nextShoalMove=time+rand(7,11)+(1-day.light)*9;
  }
  for(const p of food){
    p.age+=dt;
    if(!p.wet){
      p.velocityY+=dt*260;p.y+=p.velocityY*dt;
      if(p.y>=surface-1){
        p.wet=true;p.y=surface-1;p.age=0;
        ripples.push({x:p.x,y:surface-H*.009,age:0,strength:.73});
      }
    }else{
      const sinking=clamp((p.age-p.soak)*1.1,0,1);
      p.y=Math.min(floor,p.y+dt*p.settle*(square?1.48:1)*sinking);
      p.x=clamp(p.x+dt*(p.drift+2.8*Math.sin(p.age*.97+p.phase)),81,913);
    }
  }
  fish.forEach(f=>updateFish(f,dt));
  scenery.update(dt,fish,W,H,square);rootedPlant.update(dt,fish,W,H,square);
  for(let i=food.length-1;i>=0;i--)if(food[i].taken || food[i].age>50)food.splice(i,1);
  for(const items of [ripples,tastes]){
    for(let i=items.length-1;i>=0;i--){items[i].age+=dt;if(items[i].age>2.1)items.splice(i,1);}
  }

}
function paintFish(f){
  const img=spriteBySpecies.get(f.species);
  if(!img.complete || !img.naturalWidth)return;
  const w=f.width,h=w*img.naturalHeight/img.naturalWidth;
  const sign=f.yaw>=0?1:-1;
  ctx.save();
  const peck=f.peckAge<.30?Math.sin(Math.PI*f.peckAge/.30)*Math.exp(-f.peckAge*4):0;
  ctx.translate(f.x+sign*peck*w*.035,f.y+.6*Math.sin(f.phase*.53));ctx.scale(sign,1);ctx.rotate(f.pitch-peck*.036);
  // Foreshortening through the turn and phase-lag between the head and the tail.
  ctx.scale(.18+.82*Math.abs(f.yaw),.99);
  ctx.globalAlpha=f.traits.opacity;
  const bands=22, sw=img.naturalWidth/bands;
  function bend(u){return (1-u)*(1-u)*h*.11*Math.sin(f.phase-u*2.8);}
  function along(u){return (u-.52)*w + (1-u)*(1-u)*w*.067*(.5+.5*Math.cos(f.phase-u*1.7));}
  for(let i=0;i<bands;i++){
    const u=i/bands,n=(i+1)/bands;
    ctx.drawImage(img,i*sw,0,sw,img.naturalHeight,along(u),-h*.51+bend(u),along(n)-along(u)+.24,h);
  }
  ctx.restore();
}
function draw(){
  if(!ctx)return;
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
  scenery.water(ctx,W,H,time,square,surface,day.light,ripples);
  for(const p of motes){
    ctx.fillStyle='rgba(225,240,208,'+(.10+.08*Math.sin(time*.55+p.phase))+')';
    ctx.beginPath();ctx.arc(p.x+4*Math.sin(time*.12+p.phase),p.y+3*Math.sin(time*.21+p.phase),.7,0,Math.PI*2);ctx.fill();
  }
  const plant=rootedPlant.editing?rootedPlant.preview:rootedPlant.position;
  const distantPlant=plant && rootedPlant.geometry(plant,W,H,square).near<.47;
  if(distantPlant)rootedPlant.draw(ctx,W,H,time,square);
  for(const f of fish)if(f.behindWood)paintFish(f);
  scenery.foreground(ctx,W,H,square);
  if(!distantPlant)rootedPlant.draw(ctx,W,H,time,square);
  for(const f of fish)if(!f.behindWood)paintFish(f);
  for(const p of food)paintFlake(p);
  for(const dust of tastes){
    const fade=Math.max(0,1-dust.age/.8);
    if(!fade)continue;
    ctx.fillStyle='rgba(183,145,102,'+(fade*.65)+')';
    ctx.fillRect(dust.x+dust.vx*dust.age,dust.y+dust.vy*dust.age,dust.size*worldPerPixel,dust.size*worldPerPixel*.64);
  }
  scenery.grade(ctx,W,H,day);
  rootedPlant.guide(ctx,W,H,square,worldPerPixel);
}
function paintFlake(p){
  const radius=Math.max(2,worldPerPixel*2.15)*p.scale;
  const roll=p.phase+p.age*(p.wet?1.15:3.8);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(.63*Math.sin(roll)+p.phase*.48);
  ctx.scale(radius,radius*(.34+.47*Math.abs(Math.cos(roll))));
  ctx.beginPath();
  p.shape.forEach((v,i)=>{
    const angle=i*Math.PI/3,x=Math.cos(angle)*v,y=Math.sin(angle)*v;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.closePath();
  ctx.fillStyle=p.tone>.5?'#a78359':'#b59570';ctx.fill();ctx.clip();
  ctx.fillStyle=p.tone>.5?'#796449':'#8a745b';
  ctx.beginPath();ctx.moveTo(-1,-.25);ctx.lineTo(.32,.07);ctx.lineTo(.78,.61);ctx.lineTo(-.76,.83);ctx.fill();
  ctx.restore();
}
function frame(now){
  if(!document.hidden)syncClock();
  const elapsed=lastFrame?Math.min(.35,(now-lastFrame)/1000):0;lastFrame=now;
  if(!paused && !document.hidden){
    const steps=Math.max(1,Math.ceil(elapsed*45));
    for(let i=0;i<steps;i++)update(elapsed/steps);
    draw();
  }
  requestAnimationFrame(frame);
}
function syncPause(){
  pauseButton.classList.toggle('playing',paused);pauseButton.setAttribute('aria-pressed',String(paused));
  pauseButton.lastElementChild.textContent=paused?'继续':'暂停';
  feedButton.disabled=paused||rootedPlant.editing;
  if(!rootedPlant.editing)message.textContent=paused?'鱼缸已暂停':hint;
}
const plantEditor=document.querySelector('#plant-editor');
const plantX=document.querySelector('#plant-x'),plantZ=document.querySelector('#plant-z');
const plantHelp=document.querySelector('#plant-help'),plantSave=document.querySelector('#plant-save');
const plantRemove=document.querySelector('#plant-remove'),plantUndo=document.querySelector('#plant-undo');
const plantHint='轻点沙面，或滑动微调';
let plantDrag=null,removedPlant=null;
function syncPlantTool(){
  const editing=rootedPlant.editing;
  plantButton.setAttribute('aria-expanded',String(editing));
  plantButton.textContent=rootedPlant.position?'调整水草':'种水草';
  plantEditor.hidden=!editing;
  plantRemove.hidden=!rootedPlant.position;
  plantUndo.hidden=!removedPlant;
  plantSave.textContent=rootedPlant.position?'放好':'种下';
  stage.closest('.game').classList.toggle('editing',editing);
  syncPause();
}
function previewPlant(pos){
  rootedPlant.preview=pos;
  plantX.value=Math.round(pos.x*1000);plantZ.value=Math.round(pos.z*1000);
  plantX.setAttribute('aria-valuetext','从左到右 '+Math.round((pos.x-.1)*125)+'%');
  plantZ.setAttribute('aria-valuetext','从后往前 '+Math.round(pos.z*100)+'%');
  plantHelp.textContent=plantHint;
  draw();
}
function finishPlant(note){
  plantDrag=null;rootedPlant.editing=false;rootedPlant.preview=null;
  syncPlantTool();draw();
  if(note)message.textContent=note;
  plantButton.focus({preventScroll:true});
}
plantButton.addEventListener('click',()=>{
  removedPlant=null;rootedPlant.editing=true;
  const start=rootedPlant.position||{x:.49,z:.45};
  syncPlantTool();previewPlant({...start});plantX.focus({preventScroll:true});
});
for(const slider of [plantX,plantZ])slider.addEventListener('input',()=>{
  previewPlant({x:Number(plantX.value)/1000,z:Number(plantZ.value)/1000});
});
plantSave.addEventListener('click',()=>{
  const saved=rootedPlant.write(rootedPlant.preview);
  finishPlant(saved?'':'水草已摆好，此浏览器暂时无法保存位置');
});
document.querySelector('#plant-cancel').addEventListener('click',()=>finishPlant());
plantRemove.addEventListener('click',()=>{
  removedPlant=rootedPlant.position;
  const saved=rootedPlant.write(null);finishPlant(saved?'水草已移除':'水草已移除，此浏览器暂时无法保存');
  plantUndo.focus({preventScroll:true});
});
plantUndo.addEventListener('click',()=>{
  if(!removedPlant)return;
  const saved=rootedPlant.write(removedPlant);removedPlant=null;
  finishPlant(saved?'水草已放回原处':'水草已放回，此浏览器暂时无法保存位置');
});
pauseButton.addEventListener('click',()=>{paused=!paused;syncPause();});
function stagePoint(e){
  const r=stage.getBoundingClientRect();
  return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};
}
stage.addEventListener('pointerdown',e=>{
  if(!rootedPlant.editing||!e.isPrimary||e.button!==0)return;
  const p=stagePoint(e),pos=rootedPlant.preview;
  const site=rootedPlant.candidate(p.x,p.y,W,H,square);
  const g=rootedPlant.geometry(pos,W,H,square);
  const onPlant=Math.abs(p.x-g.x)<g.width*.48 && p.y<g.y && p.y>g.y-g.height;
  if(!site&&!onPlant){plantHelp.textContent='请点虚线内的沙面，或滑动微调';return;}
  if(site)previewPlant(site);
  plantDrag={id:e.pointerId,point:p,start:site||pos,onSand:Boolean(site),square};
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!plantDrag||plantDrag.id!==e.pointerId||plantDrag.square!==square)return;
  const p=stagePoint(e),origin=plantDrag.point,start=plantDrag.start;
  const x=clamp(start.x+(p.x-origin.x)/W,.1,.9);
  let z=start.z+(p.y-origin.y)/(H*.12);
  if(plantDrag.onSand){
    const [back,front]=rootedPlant.edges(x,square);
    z=(p.y/H-back)/(front-back);
  }
  previewPlant({x,z:clamp(z,0,1)});
});
function stopPlantDrag(e){if(plantDrag?.id===e.pointerId)plantDrag=null;}
stage.addEventListener('pointercancel',stopPlantDrag);
stage.addEventListener('lostpointercapture',stopPlantDrag);
stage.addEventListener('pointerup',e=>{
  stopPlantDrag(e);
  if(e.button!==0||rootedPlant.editing)return;
  const {x,y}=stagePoint(e);
  if(x>34 && x<966 && y>surface-H*.085 && y<H*.9)scatter(x);
});
document.addEventListener('keydown',e=>{
  if(rootedPlant.editing && e.key==='Escape'){e.preventDefault();e.stopPropagation();finishPlant();}
});
feedButton.addEventListener('click',()=>scatter(rand(390,765)));
function syncFull(){
  const expanded=Boolean(document.fullscreenElement)||room.classList.contains('immersive');
  expandButton.setAttribute('aria-pressed',String(expanded));expandButton.setAttribute('aria-label',expanded?'退出全屏':'全屏观赏');
  expandButton.lastElementChild.textContent=expanded?'退出':'全屏';
}
expandButton.addEventListener('click',async()=>{
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  if(room.classList.contains('immersive')){room.classList.remove('immersive');syncFull();return;}
  try{await room.requestFullscreen();}catch{room.classList.add('immersive');}
  syncFull();
});
document.addEventListener('fullscreenchange',syncFull);
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(!document.hidden){minuteStamp=-1;syncClock();draw();}});
window.addEventListener('keydown',e=>{if(e.key==='Escape' && room.classList.contains('immersive')){room.classList.remove('immersive');syncFull();}});
new ResizeObserver(resize).observe(stage);
[bg,...spriteBySpecies.values(),rootedPlant.image,...scenery.woods].forEach(img=>img.addEventListener('load',draw));
syncClock();syncPlantTool();resize();requestAnimationFrame(frame);
