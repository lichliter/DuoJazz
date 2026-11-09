// Run against npm start with PLAYWRIGHT_MODULE set to an installed Playwright module.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const rows = new Map(), progress = new Map();
let progressRequests = 0;
let fail = false;
const clientScript = `
let identity = {id:'test-account-a',email:'test@example.com'}, listener;
window.testSwitchAccount = (id) => { identity = id ? {id,email:id+'@example.com'} : null; listener(id?'SIGNED_IN':'SIGNED_OUT',identity?{user:identity}:null); };
const request = async (table, body) => { try {const r = await fetch('/test-cloud/'+table,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return await r.json();} catch {return {error:{message:'offline'}};} };
window.supabase = {createClient: () => ({auth:{
 onAuthStateChange(cb) {listener=cb;}, async getSession(){return {data:{session:{user:identity}}};}, async signOut(){window.testSwitchAccount(null); return {};}, async stopAutoRefresh(){}
}, rpc(name,args){return request('rpc',{id:identity.id,...args});}, from(table){return {
 select(){let id,from=0,to=499;const q={eq(_,v){id=v;return q;},order(){return q;},range(a,b){from=a;to=b;return q;},then(resolve,reject){return request(table,{id,from,to}).then(resolve,reject);}};return q;},
 upsert(batch, options){return request(table,{batch,options});}
};}})};
`;
async function device(viewport = {width:1100,height:950}) {
  const context=await browser.newContext({viewport,serviceWorkers:'block',recordVideo:{dir:'artifacts/library-videos'}});
  await context.addInitScript(() => { const add = window.addEventListener.bind(window), waiting = []; window.addEventListener = (type, fn, opts) => type === 'storage' ? waiting.push([fn,opts]) : add(type,fn,opts); window.testEnableStorage = () => { for(const [fn,opts] of waiting.splice(0)) add('storage',fn,opts); }; });
  await context.route('**/js/pwa.js',r=>r.fulfill({contentType:'application/javascript',body:''}));
  await context.route('https://*.supabase.co/**',r=>r.abort());
  await context.route('**/js/vendor/supabase-2.119.0.js',route=>route.fulfill({contentType:'application/javascript',body:clientScript}));
  await context.route('**/test-cloud/*',async route=>{
    const table=route.request().url().split('/').at(-1), body=route.request().postDataJSON();
    if(fail && (table==='user_preferences' || table==='rpc')) return route.fulfill({json:{error:{message:'temporary failure'}}});
    if(table==='practice_progress') { progressRequests++; if(body.batch) { for(const r of body.batch) progress.set([r.user_id,r.lesson_id,r.key_id,r.kind].join(':'),r); return route.fulfill({json:{}}); } return route.fulfill({json:{data:[...progress.values()].filter(r=>r.user_id===body.id)}}); }
    if(table==='rpc') {for(const row of body.changes){const key=body.id+':'+row.name,old=rows.get(key);if(!old || row.edit_clock>old.edit_clock || (row.edit_clock===old.edit_clock && row.edit_id>old.edit_id)) rows.set(key,{...row,user_id:body.id});}return route.fulfill({json:{}});}
    if(body.batch) {for(const row of body.batch){const key=row.user_id+':'+row.name;if(!body.options.ignoreDuplicates||!rows.has(key))rows.set(key,row);}return route.fulfill({json:{}});}
    return route.fulfill({json:{data:[...rows.values()].filter(r=>r.user_id===body.id).sort((a,b)=>a.name.localeCompare(b.name)).slice(body.from,body.to+1)}});
  });
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.APP_URL ?? 'http://127.0.0.1:4174'),{waitUntil:'networkidle'});
  await page.locator('#account-chip').click();
  return {context,page,errors};
}
async function poll(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for cloud save');}

const results=[];
try {
 const a=await device({width:390,height:844});
 await a.page.locator('#settings-close').click();
 await a.page.locator('#lesson-list .module-banner').click();
 await a.page.locator('[data-library-tab=charts]').click();
 await a.page.locator('[data-testid=quick-view-chart-cry-me-a-river]').click();
 assert.deepEqual(await a.page.locator('#chart-tree .sleeve-title').allTextContents(),['Learn','Practice','Master']);
 await a.page.screenshot({animations:'disabled',path:'artifacts/chart-three-modes.png',fullPage:true});
 await a.page.locator('#chart-tree .sleeve-node').nth(2).click();
 const id=await a.page.evaluate(()=>window.__DUOJAZZ__.getSession().lessonId);
 assert.ok(id.endsWith('-timed-master'));
 assert.equal(await a.page.locator('#notation').isVisible(),false);
 assert.equal(await a.page.locator('#show-notes').isVisible(),false);
 assert.equal(await a.page.locator('#hear-it').isVisible(),false);
 assert.equal(await a.page.locator('#continue-btn').isVisible(),false);
 assert.equal(await a.page.locator('#auto-toggle').isVisible(),false);
 await a.page.evaluate(async()=>{
   const {PitchMonitor}=await import('/js/pitch.js?v=150');
   navigator.mediaDevices.getUserMedia=async()=>{
     const ctx=window.__DUOJAZZ__.transport.ctx;
     const dest=ctx.createMediaStreamDestination();
     window.chartTestMic={ctx,dest};
     return dest.stream;
   };
 });
 await a.page.locator('#primary').click();
 await a.page.waitForFunction(()=>window.__DUOJAZZ__.transport.playing);
 assert.equal(await a.page.locator('#primary').getAttribute('aria-label'),'Stop run');
 await a.page.evaluate(async()=>{
   const {expectedNotesFor,hzFromMidi}=await import('/js/grade.js');
   const app=window.__DUOJAZZ__, session=app.getSession(), transport=app.transport;
   const {ctx,dest}=window.chartTestMic;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   gain.gain.value=0;osc.connect(gain);gain.connect(dest);
   const notes=expectedNotesFor(session),seconds=60/session.tempo;
   notes.forEach((note,index)=>{
     const t=transport.startedAt+note.startBeat*seconds;
     osc.frequency.setValueAtTime(hzFromMidi(note.midi+(index===0?1:0)),t);
     gain.gain.setValueAtTime(0.3,t);gain.gain.setValueAtTime(0,t+note.beats*seconds*0.85);
   });
   osc.start();osc.stop(transport.startedAt+transport.chorusLengthBeats*seconds+0.1);
 });
 await a.page.waitForFunction(()=>window.__DUOJAZZ__.transport.snapshot().bar>=3);
 assert.equal(await a.page.locator('#screen-wrapup').isVisible(),false);
 assert.equal(await a.page.locator('#grade-line').isVisible(),false);
 await a.page.screenshot({animations:'disabled',path:'artifacts/chart-master-memory.png'});
 await a.page.locator('#screen-wrapup').waitFor({state:'visible',timeout:40000});
 const result=await a.page.evaluate(()=>window.__DUOJAZZ__.getSession().cardResults[0]);
 assert.ok(result.percent>=80&&result.percent<100,JSON.stringify({percent:result.percent,notes:result.notes.filter(n=>!n.passed)}));
 assert.equal(result.passed,true);
 assert.match(await a.page.locator('#wrapup-heading').textContent(),/%/);
 assert.equal(await a.page.locator('#result-list li').count(),8);
 await poll(()=>[...progress.values()].some(row=>row.lesson_id===id&&row.kind==='passedKeys'));
 assert.equal(await a.page.evaluate(()=>window.scrollY),0);
 assert.equal(await a.page.locator('#wrapup-kicker').evaluate(el=>el.getBoundingClientRect().top>=0),true);
 assert.equal(await a.page.locator('#screen-wrapup').evaluate(el=>getComputedStyle(el).overflowY),'auto');
 await a.page.screenshot({animations:'disabled',path:'artifacts/chart-master-grade.png',fullPage:true});
 await a.page.locator('#again-key').scrollIntoViewIfNeeded();
 assert.equal(await a.page.locator('#again-key').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true);
 await a.page.screenshot({animations:'disabled',path:'artifacts/chart-master-grade-detail.png'});
 results.push('PASS: real microphone worklet grades a complete timed chart, continues after a wrong note, and saves the final pass');
 await a.page.locator('#again-key').click();
 await a.page.locator('#primary').click();
 await a.page.waitForFunction(()=>window.__DUOJAZZ__.transport.playing);
 await a.page.locator('#primary').click();
 assert.equal(await a.page.evaluate(()=>window.__DUOJAZZ__.transport.playing),false);
 assert.equal(await a.page.locator('#screen-wrapup').isVisible(),false);
 assert.equal(await a.page.evaluate(()=>window.__DUOJAZZ__.getSession().cardResults.length),0);
 results.push('PASS: stopping a timed run cancels it without a grade');
 await a.page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await a.page.locator('#primary').click();
 await a.page.waitForFunction(()=>document.querySelector('#meter').textContent.includes('failed to start'));
 assert.equal(await a.page.evaluate(()=>window.__DUOJAZZ__.transport.playing),false);
 assert.equal(await a.page.locator('#screen-wrapup').isVisible(),false);
 results.push('PASS: denied microphone access never starts the chart or awards a grade');
 assert.deepEqual(a.errors,[]);
 const video=a.page.video();await a.context.close();await video.saveAs('artifacts/chart-master-flow.webm');
 console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
