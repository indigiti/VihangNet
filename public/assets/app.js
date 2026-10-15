(() => {'use strict';
const $=id=>document.getElementById(id), audio=$('audio');
let context,analyser,frequencies,wave,previous,sourceUrl,ownFile=false,playing=false,phase=0,flux=0;
const canvases=[0,1,2].map(i=>$('c'+i)), engine=window.Vihang3D?.create(canvases)||null, contexts=engine?null:canvases.map(c=>c.getContext('2d')), recorder=window.VihangRecorder.mount({canvases,audio});
const particles=canvases.map((c,k)=>Array.from({length:210},(_,i)=>({a:i*2.399963,k:(i+.5)/210,r:.3+Math.random()*.7,z:Math.random()*6.28})));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const fmt=t=>isFinite(t)?Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'):'0:00';
function init(){if(context)return;context=new (window.AudioContext||window.webkitAudioContext)();analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.76;const src=context.createMediaElementSource(audio);src.connect(analyser);analyser.connect(context.destination);recorder.connect(context,src);frequencies=new Uint8Array(analyser.frequencyBinCount);wave=new Uint8Array(analyser.fftSize);previous=new Float32Array(frequencies.length)}
async function toggle(){if(!audio.src){demo();return}try{init();await context.resume();if(audio.paused)await audio.play();else audio.pause()}catch(e){$('status').textContent='AUDIO ERROR'}}
function setTrack(url,name,owned=false){audio.pause();if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl=owned?url:null;ownFile=owned;audio.src=url;audio.load();$('track').textContent=name;$('status').textContent='TRACK READY';}
function demo(){const sampleRate=22050,duration=15,buffer=new ArrayBuffer(44+sampleRate*duration*2),dv=new DataView(buffer),length=sampleRate*duration;
const str=(off,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(off+i,s.charCodeAt(i))};str(0,'RIFF');dv.setUint32(4,36+length*2,true);str(8,'WAVE');str(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sampleRate,true);dv.setUint32(28,sampleRate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);str(36,'data');dv.setUint32(40,length*2,true);
for(let i=0;i<length;i++){const t=i/sampleRate,beat=t*2.4,env=Math.exp(-((beat%1)*8)),tone=Math.sin(2*Math.PI*110*t)*.25+Math.sin(2*Math.PI*(220+25*Math.sin(t*.8))*t)*.12;const s=clamp((tone+Math.sin(2*Math.PI*60*t)*env*.45)*(.7+.3*Math.sin(t*.22)**2),-1,1);dv.setInt16(44+i*2,s*32767,true)}
setTrack(URL.createObjectURL(new Blob([buffer],{type:'audio/wav'})),'VihangNet — Generative Demo',true);toggle();}
$('file').addEventListener('change',e=>{const f=e.target.files?.[0];if(f?.size&&f.type.startsWith('audio/')||f?.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)){setTrack(URL.createObjectURL(f),f.name,true);toggle()}});
$('play').onclick=toggle;$('demo').onclick=demo;$('restart').onclick=()=>{audio.currentTime=0};$('mute').onclick=()=>{audio.muted=!audio.muted;$('mute').textContent=audio.muted?'×':'♫'};
$('volume').oninput=e=>audio.volume=Number(e.target.value)/100;audio.volume=.85;
$('seek').oninput=e=>{if(audio.duration)audio.currentTime=audio.duration*Number(e.target.value)/1000};
audio.onloadedmetadata=()=>{$('duration').textContent=fmt(audio.duration)};
audio.ontimeupdate=()=>{$('elapsed').textContent=fmt(audio.currentTime);if(audio.duration)$('seek').value=Math.round(audio.currentTime/audio.duration*1000)};
audio.onplay=()=>{playing=true;$('play').textContent='Ⅱ';$('status').textContent='● LIVE SIGNAL'};
audio.onpause=()=>{playing=false;$('play').textContent='▶';$('status').textContent='PAUSED'};
audio.onerror=()=>{$('status').textContent='UNSUPPORTED AUDIO FILE'};
$('fullscreen').onclick=()=>{const e=$('canvases');document.fullscreenElement?document.exitFullscreen():e.requestFullscreen?.()};
$('snapshot').onclick=()=>{const W=1280,H=900,out=document.createElement('canvas');out.width=W;out.height=H;const c=out.getContext('2d');c.fillStyle='#090e17';c.fillRect(0,0,W,H);canvases.forEach((canvas,i)=>c.drawImage(canvas,0,i*300,W,300));const a=document.createElement('a');a.href=out.toDataURL('image/png');a.download='vihangnet-snapshot.png';a.click()};
$('record').onclick=async()=>{if(recorder.isRecording()){recorder.stop();return}if(!audio.src){$('export-status').textContent='Select an MP3 or click Try Demo Sound first';return}try{init();await context.resume();if(audio.paused)await audio.play();await recorder.start()}catch(e){$('export-status').textContent='Could not start: '+e.message}};
const drop=$('drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');const f=e.dataTransfer.files[0];if(f?.type.startsWith('audio/')){setTrack(URL.createObjectURL(f),f.name,true);toggle()}});
function paint(ts){phase=ts*.00038;let bands=[.1,.1,.1],energy=.04,centroid=0,tonal=.1;
if(analyser){analyser.getByteFrequencyData(frequencies);analyser.getByteTimeDomainData(wave);const N=frequencies.length;let sum=0,weighted=0,logSum=0,meanSq=0,delta=0;
for(let i=0;i<N;i++){const f=frequencies[i]/255;sum+=f;weighted+=f*i;logSum+=Math.log(Math.max(f,.0001));delta+=Math.max(0,f-previous[i]);previous[i]=f}for(const v of wave)meanSq+=((v-128)/128)**2;
energy=Math.sqrt(meanSq/wave.length);centroid=sum?weighted/sum*context.sampleRate/(2*N):0;flux=delta/N;tonal=1-Math.exp(logSum/N)/(sum/N||1);
for(let k=0;k<3;k++){let acc=0,n=0;const low=k===0?0:k===1?Math.round(N*.09):Math.round(N*.35),high=k===0?Math.round(N*.09):k===1?Math.round(N*.35):N;for(let j=low;j<high;j++){acc+=frequencies[j];n++}bands[k]=n?acc/(n*255):0}
}
$('rms').textContent=Math.round(energy*100)+'%';$('centroid').textContent=Math.round(centroid)+' Hz';$('flux').textContent=Math.round(clamp(flux*8)*100)+'%';$('tonality').textContent=Math.round(clamp(tonal)*100)+'%';
const mode=$('mode').value,react=Number($('intensity').value)/90,density=Number($('density').value)/100;
if(!engine)canvases.forEach((canvas,k)=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}const ctx=contexts[k];ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0a0f19';ctx.fillRect(0,0,w,h);
const amp=(playing?bands[k]:.06)*react,points=[],count=Math.floor(particles[k].length*density),cx=w*.5,cy=h*.5,radius=Math.min(w*.43,h*.42),hues=[328,150,38],hue=hues[k];
for(let i=0;i<count;i++){const p=particles[k][i],a=p.a+phase*(k===1?1.7:.48),r=Math.sqrt(p.k)*radius*(.65+amp*.75),pulse=Math.sin(a*5+phase*6+p.z);let x,y;
if(mode==='orbit'){x=cx+Math.cos(a)*r*(1+amp*.35)*1.35;y=cy+Math.sin(a)*r*.5+Math.cos(a*3+phase*4)*amp*26}
else if(mode==='wave'){x=w*(i/count)+Math.sin(a*2+phase)*amp*25;y=cy+Math.sin(i/count*22+phase*5+k)*radius*(.22+amp*.75)+Math.cos(a*4)*radius*.18}
else{x=cx+Math.cos(a)*r*(1+Math.sin(a*3+phase*2)*.24);y=cy+Math.sin(a)*r*.63*(1+amp*.7)+pulse*amp*22}
points.push({x,y,size:1+p.r*1.4+amp*2})}
ctx.globalCompositeOperation='screen';const step=count>140?3:2;for(let i=0;i<count;i+=step){const p=points[i];for(let j=i+1;j<Math.min(count,i+22);j+=2){const q=points[j],dx=p.x-q.x,dy=p.y-q.y,dist=dx*dx+dy*dy,limit=(50+amp*90)**2;if(dist<limit){ctx.strokeStyle='hsla('+hue+',92%,66%,'+((1-dist/limit)*(.075+amp*.23))+')';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}}
for(const p of points){ctx.beginPath();ctx.fillStyle='hsla('+hue+',100%,70%,'+(.35+Math.min(.6,amp))+')';ctx.shadowBlur=12+amp*24;ctx.shadowColor='hsl('+hue+',95%,60%)';ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;ctx.globalCompositeOperation='source-over'});
if(engine)engine.render({bands,energy,centroid,flux,tonality:tonal,mode,intensity:react,density,time:ts,cameraMode:$('camera').value});recorder.frame();requestAnimationFrame(paint)}requestAnimationFrame(paint);
})();