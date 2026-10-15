import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { statSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = process.env.VIHANGNET_TEST_URL || 'http://127.0.0.1:8877/';
const browser = await chromium.launch({
  channel:'chrome',headless:true,
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'networkidle'});
  assert.match(await page.title(),/VihangNet/);
  assert.equal(await page.locator('#c0').count(),1);
  assert.equal(await page.locator('#c1').count(),1);
  assert.equal(await page.locator('#c2').count(),1);
  assert.equal(await page.locator('#camera option').count(),3);
  const webgl=await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl2'));
  console.log('Browser WebGL2 available:',webgl);
  const activeRenderers=await page.locator('#canvases canvas').evaluateAll(nodes=>nodes.map(c=>c.getContext('webgl2')?'WebGL2':c.getContext('2d')?'Canvas2D':'None'));
  console.log('Active visualization renderers:',activeRenderers);
  if(webgl)assert.deepEqual(activeRenderers,['WebGL2','WebGL2','WebGL2'],'GPU renderer should initialize all three canvases');
  await page.getByRole('button',{name:/TRY DEMO SOUND/}).click();
  await page.waitForTimeout(1900);
  const status=await page.locator('#status').innerText();
  assert.match(status,/LIVE SIGNAL/, 'audio playback did not start');
  const elapsed=await page.locator('#elapsed').innerText();
  console.log('Audio playback:',status,elapsed);
  const canvases=await page.locator('canvas').evaluateAll(nodes=>nodes.map(c=>({w:c.width,h:c.height})));
  assert.ok(canvases.every(c=>c.w>0&&c.h>0),'visual canvases not initialized');
  await page.locator('#camera').selectOption('fly');
  await page.locator('#mode').selectOption('orbit');
  await page.locator('#camera').selectOption('pulse');
  await page.locator('#video-quality').selectOption('720');
  await page.locator('#record').click();
  const recording=await page.locator('#export-status').innerText();
  console.log('Recording state:',recording);
  assert.match(recording,/RECORDING/, 'recording did not start');
  await page.waitForTimeout(1500);
  const downloaded=page.waitForEvent('download',{timeout:20000});
  await page.locator('#record').click();
  const download=await downloaded;
  const file=download.suggestedFilename();
  assert.match(file,/vihangnet-.*\.(mp4|webm)$/,'unexpected recording extension');
  console.log('Recorded video:',file);
  const filePath=await download.path();
  assert.ok(filePath,'download was not saved');
  const videoBytes=statSync(filePath).size;
  assert.ok(videoBytes>2000,'recording is unexpectedly empty');
  if(file.endsWith('.mp4'))assert.equal(readFileSync(filePath).toString('ascii',4,8),'ftyp','MP4 must be a real MP4 container');
  try {
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',filePath],{encoding:'utf8'}));
    const tracks=(probe.streams||[]).map(x=>x.codec_type);
    console.log('Recording tracks:',tracks,'bytes:',videoBytes);
    assert.ok(tracks.includes('video'),'recording lacks video');
    assert.ok(tracks.includes('audio'),'recording lacks audio');
  }catch(e){if(e.code==='ENOENT')console.log('ffprobe unavailable; container header still checked');else throw e;}
  await page.locator('#snapshot').click();
  await page.screenshot({path:'desktop-e2e.png',fullPage:true});
  assert.deepEqual(errors,[],'browser JS errors');
  await context.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mp=await mobile.newPage();
  const mobileErrors=[];mp.on('pageerror',e=>mobileErrors.push(e.message));
  await mp.goto(base,{waitUntil:'networkidle'});
  await mp.waitForTimeout(500);
  const sizes=await mp.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  console.log('Mobile viewport:',sizes);
  assert.ok(sizes.scroll<=sizes.viewport+2,'mobile horizontal overflow');
  await mp.screenshot({path:'mobile-e2e.png',fullPage:true});
  assert.deepEqual(mobileErrors,[],'mobile JS errors');
  await mobile.close();
  console.log('VihangNet browser E2E PASSED');
}finally{await browser.close()}
