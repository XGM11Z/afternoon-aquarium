'use strict';

// One textured quad refracts the original photograph. All coordinates are in scene space.
class WaterOptics {
  constructor(surface) {
    this.surface=surface;
    surface.addEventListener('webglcontextlost',e=>{
      e.preventDefault();this.active=false;surface.hidden=true;
    });
    surface.addEventListener('webglcontextrestored',()=>this.initialize());
    this.initialize();
  }
  initialize() {
    this.active=false;this.source='';this.matteSource='';
    const gl=this.surface.getContext('webgl',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:false});
    if(!gl)return;
    this.gl=gl;
    const vertex='attribute vec2 point;varying vec2 uv;void main(){gl_Position=vec4(point,0.,1.);uv=vec2(point.x*.5+.5,.5-point.y*.5);}';
    const fragment=`precision highp float;
varying vec2 uv;
uniform sampler2D photo;
uniform sampler2D solid;
uniform float time,level,square,day,aspect;
uniform vec4 stems[5]; // center x, tip y, root y, half-width
uniform float bends[5];
uniform vec4 impacts[3]; // x, y, age, strength
float gate(float x,float a,float b,float f){return smoothstep(a,a+f,x)*(1.-smoothstep(b-f,b,x));}
void main(){
  vec2 p=uv,offset=vec2(0.);
  float t=time,x=uv.x,y=uv.y;
  float inside=gate(x,.041,.954,.011);
  for(int i=0;i<5;i++){
    vec4 s=stems[i];
    float stemX=s.x+.025*sin((y-s.y)*9.+float(i)*1.31);
    float lateral=1.-smoothstep(.42,1.,abs(x-stemX)/s.w);
    float v=clamp((s.z-y)/(s.z-s.y),0.,1.);
    float influence=lateral*v*v*smoothstep(s.y-.045,s.y+.005,y)*inside;
    float thisBend=.005*sin(t*.92+float(i)*1.3+y*8.)+.0018*sin(t*1.63-x*12.+v*2.1)+bends[i];
    offset.x-=influence*thisBend;
    offset.y+=influence*(.0009*sin(t*.83+float(i)+x*15.)+abs(bends[i])*.10);
  }
  // A shallow projected sheet of water: fast crossing capillary waves atop a slower current.
  float band=inside*gate(y,level-mix(.065,.072,square),level+.012,.007);
  float a=x*49.+y*75.-t*1.65, b=x*28.-y*115.+t*1.19;
  vec2 normal=vec2(sin(a)*.0019+sin(b)*.0010,cos(a)*.0011+sin(b+.7)*.0015);
  float reflection=0.;
  for(int i=0;i<3;i++){
    vec4 k=impacts[i];
    vec2 d=vec2(x-k.x,(y-k.y)*5.8/aspect);float r=length(d);
    float radius=.115*k.z;
    float u=(r-radius)/(.019+k.z*.007);
    float wave=sin((r-radius)*137.)*exp(-u*u-k.z*1.38)*k.w;
    normal+=vec2(d.x,d.y*.67)/(r+.002)*wave*.010;
    reflection+=wave*.070;
  }
  offset+=band*normal;
  float fixedSurface=max(texture2D(solid,p).a,texture2D(solid,p+offset).a);
  vec3 col=texture2D(photo,p+offset*(1.-fixedSurface)).rgb;
  // Light follows the existing sand and rock grain. Glass and tabletop remain rigid.
  float bed=inside*gate(y,mix(.64,.67,square),.888,.038);
  float net=.48*sin(x*67.+y*130.+t*.62+2.*sin(y*47.-t*.4))
           +.52*sin(x*41.-y*113.-t*.51+2.3*sin(x*30.+t*.33));
  float caustic=exp(-38.*net*net);
  float light=dot(col,vec3(.32,.54,.14));
  col+=vec3(1.,.88,.62)*bed*(.22+.78*day)*(.052*caustic-.007)*(.2+.8*light);
  col+=vec3(.96,.95,.78)*band*(reflection+.016*sin(b)*cos(a));
  gl_FragColor=vec4(col,1.);
}`;
    const program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);gl.deleteProgram(program);return;}
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return;}
    gl.useProgram(program);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const point=gl.getAttribLocation(program,'point');
    gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
    const makeTexture=(unit)=>{
      gl.activeTexture(unit);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      for(const side of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,side,gl.CLAMP_TO_EDGE);
      return texture;
    };
    this.tex=makeTexture(gl.TEXTURE0);this.matte=makeTexture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
    gl.uniform1i(gl.getUniformLocation(program,'solid'),1);gl.activeTexture(gl.TEXTURE0);
    this.u={};
    for(const n of ['time','level','square','day','aspect','stems[0]','bends[0]','impacts[0]'])this.u[n]=gl.getUniformLocation(program,n);
    this.contacts=new Float32Array(12);this.active=true;
  }
  render(bg,matte,t,level,square,day,stems,bends,ripples,w,h){
    if(!this.active||!bg.complete||!bg.naturalWidth)return false;
    const gl=this.gl,u=this.u;
    if(this.source!==bg.currentSrc){
      gl.bindTexture(gl.TEXTURE_2D,this.tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,bg);this.source=bg.currentSrc;
    }
    if(matte.complete && matte.naturalWidth && this.matteSource!==matte.src){
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.matte);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,matte);
      this.matteSource=matte.src;gl.activeTexture(gl.TEXTURE0);
    }
    gl.viewport(0,0,this.surface.width,this.surface.height);
    gl.uniform1f(u.time,t);gl.uniform1f(u.level,level/h);gl.uniform1f(u.square,+square);gl.uniform1f(u.day,day);gl.uniform1f(u.aspect,w/h);
    gl.uniform4fv(u['stems[0]'],stems);gl.uniform1fv(u['bends[0]'],bends);
    this.contacts.fill(0);
    for(let i=0;i<Math.min(3,ripples.length);i++){
      const r=ripples[ripples.length-1-i],j=i*4;
      this.contacts[j]=r.x/w;this.contacts[j+1]=r.y/h;this.contacts[j+2]=r.age;this.contacts[j+3]=r.strength;
    }
    gl.uniform4fv(u['impacts[0]'],this.contacts);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    this.surface.hidden=false;return true;
  }
}
