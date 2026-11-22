'use strict';

// Each point follows the exposed sand in the photograph: horizontal position,
// the back edge at the foot of the hardscape, and the front edge above the glass.
const sandBeds = {
  square: [
    [.10,.843,.850], [.15,.841,.849], [.20,.828,.842], [.27,.827,.840],
    [.32,.832,.843], [.37,.818,.845], [.42,.816,.844], [.445,.802,.844],
    [.465,.752,.847], [.50,.752,.848], [.535,.758,.843], [.545,.761,.842], [.55,.794,.841], [.555,.819,.841],
    [.565,.823,.841], [.60,.830,.843], [.635,.832,.843], [.66,.828,.840],
    [.70,.817,.834], [.75,.815,.832], [.79,.794,.834], [.82,.798,.834],
    [.86,.810,.827], [.90,.811,.822]
  ],
  wide: [
    [.10,.849,.855], [.14,.849,.856], [.18,.837,.853], [.22,.836,.855],
    [.26,.825,.859], [.30,.823,.858], [.34,.821,.857], [.365,.771,.860],
    [.41,.773,.860], [.48,.774,.859], [.55,.774,.860], [.59,.774,.858],
    [.608,.778,.861], [.615,.818,.859], [.623,.837,.857], [.65,.845,.858], [.69,.849,.859],
    [.72,.845,.858], [.77,.836,.855], [.82,.820,.855], [.85,.826,.855],
    [.90,.829,.851]
  ]
};
class RootedPlant {
  constructor(){
    this.storageKey='afternoon-aquarium.crypt.v1';
    this.image=new Image();this.image.src='assets/crypt.webp';
    this.position=this.readPosition();this.preview=null;this.editing=false;
    this.bend=0;this.velocity=0;
  }
  readPosition(){
    try{
      const saved=JSON.parse(localStorage.getItem(this.storageKey));
      if(saved && Number.isFinite(saved.x) && saved.x>=.10 && saved.x<=.9 &&
           Number.isFinite(saved.z) && saved.z>=0 && saved.z<=1)return {x:saved.x,z:saved.z};
    }catch{}
    return null;
  }
  write(position){
    this.position=position;this.preview=null;this.editing=false;
    try{
      if(position)localStorage.setItem(this.storageKey,JSON.stringify(position));
      else localStorage.removeItem(this.storageKey);
      return true;
    }catch{return false;}
  }
  profile(square){return square?sandBeds.square:sandBeds.wide;}
  edges(x,square){
    const points=this.profile(square);
    const i=points.findIndex(p=>p[0]>=x);
    if(i===0)return points[0].slice(1);
    if(i<0)return points[points.length-1].slice(1);
    const a=points[i-1],b=points[i],ratio=(x-a[0])/(b[0]-a[0]);
    return [a[1]+(b[1]-a[1])*ratio,a[2]+(b[2]-a[2])*ratio];
  }
  base(position,square,h){
    const [back,front]=this.edges(position.x,square);
    return (back+(front-back)*position.z)*h;
  }
  candidate(x,y,w,h,square){
    const u=x/w,v=y/h;
    if(u<.1||u>.9)return null;
    const [back,front]=this.edges(u,square);
    if(v<back||v>front)return null;
    return {x:u,z:Math.max(0,Math.min(1,(v-back)/(front-back)))};
  }
  geometry(pos,w,h,square){
    const y=this.base(pos,square,h);
    // Absolute depth also matters at the sides, where rocks leave only foreground sand.
    const near=Math.max(0,Math.min(1,(y/h-(square?.75:.77))/(square?.10:.09)));
    const height=h*(square?.225:.27)*(.64+.36*near);
    return {x:pos.x*w,y,height,width:height*(this.image.naturalWidth/this.image.naturalHeight||1.21),near};
  }
  update(dt,fish,w,h,square){
    const pos=this.editing?this.preview:this.position;
    if(!pos)return;
    const {x,y,height,width}=this.geometry(pos,w,h,square);
    brushLeaves(this,dt,fish,x,y-height*.57,width*.45,height*.46);
  }
  draw(c,w,h,t,square){
    const pos=this.editing?this.preview:this.position,img=this.image;
    if(!pos||!img.complete||!img.naturalWidth)return;
    const {x,y,height,width,near}=this.geometry(pos,w,h,square);
    c.save();c.translate(x,y);
    const shadow=c.createRadialGradient(0,0,.5,0,0,width*.13);
    shadow.addColorStop(0,'rgba(61,54,29,.39)');shadow.addColorStop(1,'rgba(61,54,29,0)');
    c.save();c.scale(1,.14);c.fillStyle=shadow;c.fillRect(-width*.13,-width*.13,width*.26,width*.26);c.restore();
    // Hide the last sliver of the root under the sand and keep it still as the blades bend.
    c.beginPath();c.rect(-width,-height*1.1,width*2,height*1.1);c.clip();
    c.globalAlpha=.89+.11*near;
    const n=23;
    for(let j=0;j<n;j++){
      const u=j/n,flex=(1-u)**1.65;
      const bend=flex*(this.bend*w+width*.025*Math.sin(t*1.04+u*2));
      const fan=flex*width*.012*Math.sin(t*.88+u*2.8);
      c.drawImage(img,0,img.naturalHeight*u,img.naturalWidth,img.naturalHeight/n,
        -width*.5+bend-fan,(u-.977)*height,width+fan*2,height/n+.22);
    }
    c.restore();
  }
  guide(c,w,h,square,unit){
    const pos=this.preview;
    if(!this.editing||!pos)return;
    const points=this.profile(square);
    c.save();c.beginPath();
    points.forEach(([x,back],i)=>i?c.lineTo(x*w,back*h):c.moveTo(x*w,back*h));
    for(let i=points.length-1;i>=0;i--)c.lineTo(points[i][0]*w,points[i][2]*h);
    c.closePath();c.fillStyle='rgba(249,240,200,.13)';c.fill();
    c.strokeStyle='rgba(62,66,37,.60)';c.lineWidth=1.2*unit;c.setLineDash([3*unit,4*unit]);c.stroke();
    c.setLineDash([]);c.beginPath();c.ellipse(pos.x*w,this.base(pos,square,h),7*unit,2.7*unit,0,0,Math.PI*2);
    c.strokeStyle='rgba(39,53,37,.78)';c.lineWidth=2.7*unit;c.stroke();
    c.strokeStyle='#faf2d4';c.lineWidth=1.1*unit;c.stroke();c.restore();
  }
}
