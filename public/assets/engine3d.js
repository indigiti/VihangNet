/* VihangNet WebGL2 cinematic audio-reactive particle field.
 * No runtime dependencies; falls back to the legacy Canvas2D engine if WebGL2 is absent.
 */
(function () {
'use strict';
const VERT=`#version 300 es
precision highp float;
in vec3 aPosition;
uniform float uTime;
uniform vec4 uEnergy; // bass/mid/treble/reactivity
uniform vec4 uCamera; // camera type, pointer x/y, intensity
uniform float uMode;
uniform float uPoint;
uniform float uAspect;
out float vStrength;
out float vDepth;
mat3 rotateY(float x) {float c=cos(x),s=sin(x); return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 rotateX(float x) {float c=cos(x),s=sin(x); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
void main(){
 float b=uEnergy.x, m=uEnergy.y, h=uEnergy.z, react=uEnergy.w;
 vec3 p=aPosition;
 float t=uTime;
 float beat=clamp((b*.94+m*.45+h*.3)*react,0.,1.7);
 float phi=atan(p.y,p.x);
 float rr=length(p.xy);
 if(uMode<.5) {
   p.xy *= 1.+beat*.36*sin(5.*phi+t*1.9);
   p.z += .46*sin(rr*2.9+t*.75+phi*2.)*(.3+beat);
 }else if(uMode<1.5) {
   float a=.4*t + p.z*.22 + m*.34;
   p.xy=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xy;
   p.z+=.68*sin(phi*4.+t*1.3)*(.2+h);
 }else{
   p.y+=sin(p.x*2.5+t*2.+p.z*2.4)*(.26+beat*.73);
   p.x+=cos(p.z*3.+t*1.5)*(.22+b*.3);
 }
 float orbit=t*.12 + uCamera.y*.22;
 if (uCamera.x<.5) orbit=t*.22;
 if (uCamera.x>1.5) orbit=t*.09;
 p=rotateY(orbit)*rotateX(.20+sin(t*.13)*.12-uCamera.z*.15)*p;
 float zoom=7.1;
 if (uCamera.x>.5 && uCamera.x<1.5) zoom=5.8+1.6*sin(t*.18);
 if (uCamera.x>1.5) zoom=5.8+.62*sin(t*1.45)*beat;
 p.z-=zoom;
 float inv=1./max(.85,-p.z);
 gl_Position=vec4(p.x*inv*2.35/max(.6,uAspect),p.y*inv*2.35,0.,1.);
 gl_PointSize=uPoint>.5?clamp((2.7+uEnergy.w*1.1+beat*7.)*inv*5.9,1.5,18.):1.;
 vStrength=clamp(.32+beat*.95+(2.5+p.z)*.025,.18,1.);
 vDepth=clamp(inv*4.,.35,1.);
}`;
const FRAG=`#version 300 es
precision highp float;
uniform vec3 uTint;
uniform float uPoint;
in float vStrength;
in float vDepth;
out vec4 color;
void main(){
 float a=1.;
 if(uPoint>.5){
   vec2 uv=gl_PointCoord*2.-1.;
   float dist=length(uv);
   a=pow(max(0.,1.-dist),1.65);
   if(a<.025) discard;
 } else {
   a=.12;
 }
 color=vec4(uTint*vDepth*(.55+vStrength*1.2),a*(uPoint>.5?.9:.34));
}`;
function shader(gl,type,src){
 const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(error)}
 return s;
}
function program(gl){
 const p=gl.createProgram(),vs=shader(gl,gl.VERTEX_SHADER,VERT),fs=shader(gl,gl.FRAGMENT_SHADER,FRAG);
 gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(e)}
 return p;
}
function createField(canvas,seed,index){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 if(!gl)throw Error('WebGL2 unavailable');
 const prog=program(gl),N=850,pts=new Float32Array(N*3);
 const rng=(()=>{let a=seed;return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296}})();
 for(let i=0;i<N;i++){
  const angle=i*2.39996323,r=.32+Math.pow(rng(),.6)*2.55;
  pts[i*3]=Math.cos(angle)*r;
  pts[i*3+1]=Math.sin(angle)*r*(.70+rng()*.48);
  pts[i*3+2]=(rng()-.5)*3.6;
 }
 const edges=[];
 for(let i=0;i<N;i+=2)for(const step of [1,13,21]){
  const j=(i+step)%N;
  const dx=pts[i*3]-pts[j*3],dy=pts[i*3+1]-pts[j*3+1],dz=pts[i*3+2]-pts[j*3+2];
  if(dx*dx+dy*dy+dz*dz<7.5)edges.push(pts[i*3],pts[i*3+1],pts[i*3+2],pts[j*3],pts[j*3+1],pts[j*3+2]);
 }
 const pointBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pointBuf);gl.bufferData(gl.ARRAY_BUFFER,pts,gl.STATIC_DRAW);
 const edgeBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,edgeBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(edges),gl.STATIC_DRAW);
 const attr=gl.getAttribLocation(prog,'aPosition');const U={t:gl.getUniformLocation(prog,'uTime'),e:gl.getUniformLocation(prog,'uEnergy'),c:gl.getUniformLocation(prog,'uCamera'),m:gl.getUniformLocation(prog,'uMode'),point:gl.getUniformLocation(prog,'uPoint'),aspect:gl.getUniformLocation(prog,'uAspect'),tint:gl.getUniformLocation(prog,'uTint')};
 const rgb=[[1,.25,.61],[.12,.94,.63],[1,.64,.16]][index];
 gl.useProgram(prog);gl.enableVertexAttribArray(attr);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 let dead=false;
 function render(o,pointer){
  if(dead||gl.isContextLost())return;
  const dpr=Math.min(devicePixelRatio||1,1.65);
  const width=Math.max(2,Math.round(canvas.clientWidth*dpr)),height=Math.max(2,Math.round(canvas.clientHeight*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height)}
  gl.clearColor(.026,.043,.075,1);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(prog);
  gl.uniform1f(U.t,o.time*.001+index*.44);
  gl.uniform4f(U.e,o.bands[index],o.bands[(index+1)%3],o.bands[(index+2)%3],o.intensity);
  gl.uniform4f(U.c,o.cameraMode==='orbit'?0:o.cameraMode==='fly'?1:2,pointer.x,pointer.y,o.energy);
  gl.uniform1f(U.m,o.mode==='constellation'?0:o.mode==='orbit'?1:2);
  gl.uniform1f(U.aspect,width/height);
  gl.uniform3f(U.tint,...rgb);
  gl.bindBuffer(gl.ARRAY_BUFFER,edgeBuf);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);gl.uniform1f(U.point,0);
  gl.drawArrays(gl.LINES,0,Math.min(edges.length/3,Math.round(edges.length/3*o.density)));
  gl.bindBuffer(gl.ARRAY_BUFFER,pointBuf);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,0,0);gl.uniform1f(U.point,1);
  gl.drawArrays(gl.POINTS,0,Math.max(10,Math.floor(N*o.density)));
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();dead=true;});
 return {render};
}
window.Vihang3D={
 create(canvases){
  if(!window.WebGL2RenderingContext)return null;
  let fields=[];
  try{
   fields=canvases.map((c,k)=>createField(c,13091+k*931,k));
   const pointer={x:0,y:0};
   canvases.forEach(c=>c.addEventListener('pointermove',e=>{const b=c.getBoundingClientRect();pointer.x=((e.clientX-b.left)/b.width-.5)*2;pointer.y=((e.clientY-b.top)/b.height-.5)*2}));
   return {render(o){fields.forEach(f=>f.render(o,pointer))},type:'WebGL2'};
  }catch(e){console.warn('VihangNet 3D disabled:',e);return null;}
 }
};
})();
