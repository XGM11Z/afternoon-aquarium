'use strict';

// Contact is measured near the leaf crown. Each clump has its own damped response.
function brushLeaves(stem,dt,fish,x,y,rx,ry) {
  let push=0;
  for(const f of fish){
    const offX=(f.x-x)/(rx+f.width*.3),offY=(f.y-y)/ry;
    const proximity=Math.max(0,1-offX*offX-offY*offY);
    if(!proximity)continue;
    const direction=f.vx*.72+Math.sign(f.x-x||1)*Math.abs(f.vy)*.36;
    push+=proximity*proximity*Math.max(-1,Math.min(1,direction/42));
  }
  const target=Math.max(-1,Math.min(1,push))*.021;
  stem.velocity+=((target-stem.bend)*37-stem.velocity*5.2)*dt;
  stem.bend+=stem.velocity*dt;
}
class AquariumScenery {
  constructor(image,canvas) {
    this.image=image;this.optics=new WaterOptics(canvas);this.canvas=canvas;
    this.woods=['wide','square'].map(name=>{const matte=new Image();matte.src='assets/wood-'+name+'.png';return matte;});
    this.layout=null;
    this.stems=[];this.bends=new Float32Array(5);
    this.stemCoords=null;this.patches=[];
  }
  layoutFor(square) {
    if(this.layout===square)return;
    this.layout=square;this.patchKey='';
    // x at crown, crown height, rooted height and half-width. Both photographs use their own registration.
    const clumps=square?[
      [.12,.275,.58,.068],[.233,.263,.475,.082],[.365,.259,.411,.087],
      [.175,.501,.675,.064],[.419,.576,.666,.075]
    ]:[
      [.1,.212,.49,.058],[.18,.196,.425,.075],[.247,.208,.350,.065],
      [.112,.462,.634,.057],[.347,.579,.677,.058]
    ];
    this.stems=clumps.map(([x,tip,root,width],i)=>({x,tip,root,width,index:i,bend:0,velocity:0}));
    this.stemCoords=new Float32Array(clumps.flat());this.bends.fill(0);
  }
  update(dt,fish,w,h,square) {
    this.layoutFor(square);
    for(const s of this.stems){
      brushLeaves(s,dt,fish,s.x*w,(s.tip+(s.root-s.tip)*.38)*h,s.width*w,(s.root-s.tip)*h*.65);
      this.bends[s.index]=s.bend;
    }
  }
  resize(w,h) {
    // Limit the optical pass on dense phone displays; fish and food still use the full overlay.
    const scale=Math.min(1,1560/Math.max(w,h));
    this.canvas.width=Math.max(1,Math.round(w*scale));this.canvas.height=Math.max(1,Math.round(h*scale));
  }
  foreground(c,w,h,square) {
    const im=this.image,matte=this.woods[+square];
    if(!im.complete||!im.naturalWidth||!matte.complete||!matte.naturalWidth||
        im.naturalWidth!==matte.naturalWidth||im.naturalHeight!==matte.naturalHeight)return;
    c.save();c.globalCompositeOperation='destination-out';c.drawImage(matte,0,0,w,h);c.restore();
  }
  patchFallback(c,w,h,t,level,light,ripples) {
    const im=this.image;
    const matte=this.woods[+this.layout],ready=matte.complete && matte.naturalWidth===im.naturalWidth;
    const key=im.currentSrc+'|'+ready;
    if(this.patchKey!==key){
      this.patchKey=key;
      this.patches=this.stems.map(s=>{
        const x=s.x-s.width,y=s.tip-.027,pw=s.width*2,ph=s.root-y;
        const layer=document.createElement('canvas');
        layer.width=Math.ceil(pw*im.naturalWidth);layer.height=Math.ceil(ph*im.naturalHeight);
        const g=layer.getContext('2d');g.drawImage(im,x*im.naturalWidth,y*im.naturalHeight,
          pw*im.naturalWidth,ph*im.naturalHeight,0,0,layer.width,layer.height);
        if(ready){
          g.globalCompositeOperation='destination-out';
          g.drawImage(matte,x*im.naturalWidth,y*im.naturalHeight,pw*im.naturalWidth,ph*im.naturalHeight,0,0,layer.width,layer.height);
        }
        g.globalCompositeOperation='destination-in';
        for(const a of [[layer.width,0],[0,layer.height]]){
          const fade=g.createLinearGradient(0,0,...a);
          fade.addColorStop(0,'transparent');fade.addColorStop(.15,'black');fade.addColorStop(.83,'black');fade.addColorStop(1,'transparent');
          g.fillStyle=fade;g.fillRect(0,0,layer.width,layer.height);
        }
        return {x,y,pw,ph,layer};
      });
    }
    this.patches.forEach((p,i)=>{
      const s=this.stems[i],n=22;
      for(let j=0;j<n;j++){
        const v=j/n,bend=(1-v)**2*(s.bend+.0048*Math.sin(t*.91+i*1.23+v*1.9))*w;
        c.drawImage(p.layer,0,j*p.layer.height/n,p.layer.width,p.layer.height/n,p.x*w+bend,
          (p.y+p.ph*v)*h,p.pw*w,p.ph*h/n+.2);
      }
    });
    // Refract the reflections already in the photograph, using local changes of slope.
    const bandTop=level-h*.046,bandHeight=h*.045,x0=.05*w,span=.897*w,cols=52,rows=5;
    for(let i=0;i<cols;i++){
      const x=x0+i*span/cols;
      for(let j=0;j<rows;j++){
        const y=bandTop+bandHeight*j/rows;
        let dx=1.7*Math.sin(t*1.25+x*.034+j*.61),dy=1.05*Math.sin(t*1.38-x*.045+j*.9);
        for(const r of ripples){
          const radial=Math.hypot((x-r.x)/w,(y-r.y)*5.8/w);
          const delta=radial-r.age*.115;
          const wave=Math.sin(delta*137)*Math.exp(-((delta/.025)**2)-r.age*1.38)*r.strength;
          dy+=3*wave;dx+=3.6*wave;
        }
        const fade=Math.sin((j+.5)/rows*Math.PI);
        c.drawImage(im,(x+dx*fade)*im.naturalWidth/w,(y+dy*fade)*im.naturalHeight/h,
          span/cols*im.naturalWidth/w,bandHeight/rows*im.naturalHeight/h,
          x,y,span/cols+.3,bandHeight/rows+.3);
      }
    }
    c.save();c.globalCompositeOperation='screen';
    const g=c.createLinearGradient(w*(.25+.05*Math.sin(t*.25)),h*.68,w*.75,h*.92);
    g.addColorStop(0,'transparent');g.addColorStop(.54,'rgba(250,223,162,'+(.028+.045*light)+')');g.addColorStop(1,'transparent');
    c.fillStyle=g;c.fillRect(w*.09,h*.79,w*.81,h*.085);c.restore();
  }
  water(c,w,h,t,square,level,day,ripples){
    this.layoutFor(square);
    const im=this.image;
    if(!im.complete||!im.naturalWidth||(im.naturalWidth===im.naturalHeight)!==square){this.canvas.hidden=true;return;}
    if(!this.optics.render(im,this.woods[+square],t,level,square,day,this.stemCoords,this.bends,ripples,w,h)){
      this.canvas.hidden=true;this.patchFallback(c,w,h,t,level,day,ripples);
    }
  }
  grade(c,w,h,day){
    const shade=1-day.light;
    c.fillStyle='rgba(12,31,61,'+(shade*.63)+')';c.fillRect(0,0,w,h);
    if(day.warmth>.02){
      const warm=c.createLinearGradient(w,0,w*.3,h);
      warm.addColorStop(0,'rgba(252,159,86,'+day.warmth*.26+')');
      warm.addColorStop(1,'rgba(145,79,60,'+day.warmth*.10+')');
      c.fillStyle=warm;c.fillRect(0,0,w,h);
    }
  }
}
