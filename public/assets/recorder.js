/* VihangNet browser-native video recorder. Preserves actual output container type. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const candidates=[
 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
 'video/mp4;codecs=avc1.42E01E',
 'video/mp4',
 'video/webm;codecs=vp9,opus',
 'video/webm;codecs=vp8,opus',
 'video/webm'
];
function available(){return typeof MediaRecorder!=='undefined'&&typeof HTMLCanvasElement!=='undefined'&&!!HTMLCanvasElement.prototype.captureStream}
window.VihangRecorder={
 mount({canvases,audio}){
  const button=$('record'),result=$('export-status');
  if(!button)return {connect(){},frame(){},stop(){},isRecording(){return false}};
  if(!available()){button.disabled=true;result.textContent='Recording unsupported in this browser';return {connect(){},frame(){},stop(){},isRecording(){return false}}}
  let destination,context,recorder,stream,canvas,ctx,rafStarted=0,stopTimer,parts=[],lastUrl='',lastError='',recording=false;
  canvas=document.createElement('canvas');ctx=canvas.getContext('2d',{alpha:false});
  function connect(audioContext,source){
   if(destination||!source)return;
   context=audioContext;destination=context.createMediaStreamDestination();source.connect(destination);
  }
  function setMessage(message){result.textContent=message}
  function frame(){
   if(!recording||!ctx)return;
   const w=canvas.width,h=canvas.height;
   ctx.fillStyle='#080d16';ctx.fillRect(0,0,w,h);
   const margin=w*.04,top=h*.11,bandHeight=h*.245,gap=h*.014;
   ctx.fillStyle='#f0f4fa';ctx.font='bold '+Math.round(w*.017)+'px sans-serif';ctx.fillText('VIHANGNET / SOUND MADE VISIBLE',margin,h*.066);
   ctx.textAlign='right';ctx.fillStyle='#ff71b5';ctx.font=Math.round(w*.012)+'px sans-serif';ctx.fillText('LIVE GENERATIVE VISUALS',w-margin,h*.066);
   ctx.textAlign='left';
   const labels=['01  FREQUENCY TOPOLOGY','02  HARMONIC ORBIT','03  PARTICLE RESONANCE'];
   canvases.forEach((c,i)=>{
    const y=top+i*(bandHeight+gap);
    try{ctx.drawImage(c,margin,y,w-2*margin,bandHeight)}catch(e){}
    ctx.fillStyle='#ffffffaa';ctx.fillRect(margin,y,Math.max(210,w*.18),Math.round(w*.021));
    ctx.fillStyle='#171c28';ctx.font='bold '+Math.round(w*.011)+'px sans-serif';ctx.fillText(labels[i],margin+12,y+Math.round(w*.014));
   });
   ctx.fillStyle='#9dadc0';ctx.font=Math.round(w*.012)+'px sans-serif';ctx.fillText('AUDIO-REACTIVE 3D • NO FILE UPLOAD',margin,h*.954);
   ctx.textAlign='right';ctx.fillText(new Date().toISOString().slice(0,10),w-margin,h*.954);ctx.textAlign='left';
  }
  function reset(){clearTimeout(stopTimer);recording=false;button.textContent='● START RECORDING';button.classList.remove('is-recording');if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
  async function start(){
   if(recording)return;
   if(!destination){setMessage('Start audio playback before recording');return}
   if(!audio.src){setMessage('Choose or start a track first');return}
   const is1080=$('video-quality')?.value==='1080';canvas.width=is1080?1920:1280;canvas.height=is1080?1080:720;
   parts=[];lastError='';rafStarted=performance.now();recording=true;frame();
   let videoStream;
   try{videoStream=canvas.captureStream(30)}catch(e){reset();setMessage('Canvas capture is unavailable');return}
   stream=new MediaStream([...videoStream.getVideoTracks(),...destination.stream.getAudioTracks()]);
   let selected=null;
   for(const type of candidates){
    if(!MediaRecorder.isTypeSupported(type))continue;
    try{selected=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:is1080?6000000:3800000,audioBitsPerSecond:128000});break}catch(e){}
   }
   if(!selected){try{selected=new MediaRecorder(stream)}catch(e){reset();setMessage('Recorder unavailable: '+e.message);return}}
   recorder=selected;
   recorder.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data)};
   recorder.onerror=e=>{lastError='Recording failed';setMessage(lastError);stop()};
   recorder.onstop=()=>{
    const type=recorder.mimeType||parts[0]?.type||'video/webm';
    const ext=/video\/mp4/i.test(type)?'mp4':'webm';
    const blob=new Blob(parts,{type:ext==='mp4'?'video/mp4':'video/webm'});
    reset();
    if(blob.size<1024){setMessage(lastError||'Recording contained no video. Please retry.');return}
    if(lastUrl)URL.revokeObjectURL(lastUrl);
    lastUrl=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=lastUrl;a.download='vihangnet-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext;document.body.appendChild(a);a.click();a.remove();
    setMessage('Saved '+ext.toUpperCase()+' • '+(blob.size/1048576).toFixed(1)+' MB'+(ext==='webm'?' • MP4 conversion instructions in README':''));
    parts=[];
   };
   recorder.start(1000);button.textContent='■ STOP RECORDING';button.classList.add('is-recording');
   const kind=(recorder.mimeType||'').includes('mp4')?'MP4':'WebM';
   setMessage('● RECORDING '+kind+' • maximum 3 minutes');
   stopTimer=setTimeout(()=>stop(),3*60*1000);
  }
  function stop(){if(recorder?.state==='recording'){recorder.stop();return}if(recording)reset()}
  audio.addEventListener('ended',()=>{if(recording)stop()});
  window.addEventListener('pagehide',()=>{if(recording)stop();if(lastUrl)URL.revokeObjectURL(lastUrl)});
  return {connect,frame,start,stop,isRecording(){return recording}};
 }
};
})();
