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
let video;
try {
 const a=await device(); video=a.page.video();
 assert.equal(await a.page.locator('#my-charts-button').count(),0);
 await a.page.locator('#settings-close').click();
 await a.page.locator('[data-testid="module-banner-chord-tones"]').click();
 assert.equal(await a.page.locator('#quick-view #library-tabs').count(),1);
 await a.page.locator('#library-search').fill('Cry Me a River');
 await a.page.getByRole('button',{name:'Add Cry Me a River to favorites',exact:true}).click();
 await poll(()=>rows.get('test-account-a:lick:cmar')?.value===true);
 await a.page.screenshot({animations:'disabled',path:'artifacts/library-lick-favorites.png'});
 await a.page.locator('[data-testid="quick-view-module-cmar"]').click();
 await a.page.locator('#lesson-list .module-banner').click();
 await a.page.locator('[data-library-tab="charts"]').click();
 assert.equal(await a.page.locator('#library-search').inputValue(),'');
 assert.equal(await a.page.locator('#quick-view').isVisible(),true);
 await a.page.locator('#library-search').fill('Autumn Leaves');
 await a.page.getByRole('button',{name:'Add Autumn Leaves to favorites',exact:true}).click();
 await poll(()=>rows.get('test-account-a:chart:autumn-leaves')?.value===true);
 await a.page.locator('[data-testid="quick-view-chart-autumn-leaves"]').click();
 assert.equal(await a.page.locator('#chart-tree .sleeve-node').count(),4);
 await a.page.screenshot({animations:'disabled',path:'artifacts/library-chart-tree.png',fullPage:true});
 results.push('PASS: shared picker favorites licks and charts; profile no longer contains My Charts');
 await a.page.locator('[data-testid="lesson-chart-favorite-cmar"]').click();
 const choices=a.page.locator('#chart-applications-list [data-lesson]');
 assert.ok(await choices.count()>1);
 await a.page.screenshot({animations:'disabled',path:'artifacts/library-chart-applications.png'});
 const selected=await choices.first().getAttribute('data-lesson');
 await choices.first().click();
 await a.page.waitForFunction(id=>window.__DUOJAZZ__.getSession()?.lessonId===id,selected);
 await a.page.locator('#session-exit').click();
 assert.equal(await a.page.locator('#screen-charts').isVisible(),true);
 results.push('PASS: favorite lick opens only matching chart applications and starts the selected exercise');
 await a.page.locator('#chart-tree .sleeve-node').first().click();
 await a.page.waitForFunction(()=>window.__DUOJAZZ__.getSession()?.sequence?.length>1);
 const grade=await a.page.evaluate(async()=>{
   const {expectedNotesFor,hzFromMidi}=await import('/js/grade.js');
   const session=window.__DUOJAZZ__.getSession();
   const notes=expectedNotesFor(session);
   window.__DUOJAZZ__.feedPitchTrack(notes.flatMap(note=>Array.from({length:10},(_,i)=>({beat:note.startBeat+(i+0.5)*note.beats/10,hz:hzFromMidi(note.midi),amp:0.3}))));
   return window.__DUOJAZZ__.gradeNow();
 });
 assert.equal(grade.passed,true);
 const first=await a.page.evaluate(()=>window.__DUOJAZZ__.getSession().lessonId);
 // Send real Web Audio through the microphone worklet and live pitch follower.
 // This synthetic stream never opens a physical microphone.
 await a.page.evaluate(async()=>{
   const {expectedNotesFor,hzFromMidi}=await import('/js/grade.js');
   navigator.mediaDevices.getUserMedia=async()=>{
     const ctx=new AudioContext(), dest=ctx.createMediaStreamDestination();
     const osc=ctx.createOscillator(),gain=ctx.createGain();
     osc.connect(gain);gain.connect(dest);gain.gain.value=0;
     const start=ctx.currentTime+0.8;
     expectedNotesFor(window.__DUOJAZZ__.getSession()).forEach((note,index)=>{
       const t=start+index*0.45;
       osc.frequency.setValueAtTime(hzFromMidi(note.midi),t);
       gain.gain.setValueAtTime(0.3,t);gain.gain.setValueAtTime(0,t+0.35);
     });
     osc.start();await ctx.resume();
     dest.stream.getAudioTracks()[0].addEventListener('ended',()=>ctx.close());
     window.libraryTestAudio=ctx;
     return dest.stream;
   };
 });
 await a.page.locator('#auto-toggle').uncheck();
 await a.page.locator('#primary').click();
 await a.page.waitForFunction(id=>window.__DUOJAZZ__.getSession().lessonId!==id,first);
 assert.equal(await a.page.evaluate(()=>window.__DUOJAZZ__.getSession().sequenceIndex),1);
 await poll(()=>[...progress.values()].some(row=>row.lesson_id===first&&row.kind==='passedKeys'));
 results.push('PASS: synthetic horn audio passes the real microphone worklet and follower, saves the chord, and advances');
 await a.page.locator('#session-exit').click();
 await a.page.locator('#chart-tree .sleeve-node').nth(1).click();
 await a.page.waitForFunction(()=>window.__DUOJAZZ__.getSession()?.lessonId.endsWith('-master'));
 await a.page.locator('#show-notes').waitFor({state:'visible'});
 await a.page.screenshot({animations:'disabled',path:'artifacts/library-chart-master.png'});
 await a.page.locator('#continue-btn').waitFor({state:'visible'});
 await a.page.evaluate(()=>{ while(window.__DUOJAZZ__.getSession()?.screen === 'session') window.__DUOJAZZ__.skipCard(); });
 await a.page.locator('#screen-wrapup').waitFor({state:'visible'});
 assert.match(await a.page.locator('#wrapup-detail').textContent(),/^0 of \d+ chords passed$/);
 await a.page.locator('#again-key').click();
 assert.equal(await a.page.evaluate(()=>window.__DUOJAZZ__.getSession().sequenceIndex),0);
 await a.page.locator('#session-exit').click();
 assert.equal(await a.page.locator('#chart-tree .sleeve-node').nth(1).getAttribute('data-complete'),'false');
 results.push('PASS: chart Learn/Practice use horn grading, advance in chord order, and hide Practice notes');
 const fresh=await device();await fresh.page.locator('#settings-close').click();
 await fresh.page.locator('#lesson-list .module-banner').click();
 await fresh.page.locator('[data-library-tab="charts"]').click();
 await fresh.page.locator('[data-testid="quick-view-chart-autumn-leaves"]').click();
 assert.equal(await fresh.page.locator('[data-testid="lesson-chart-favorite-cmar"]').count(),1);
 await fresh.page.locator('#chart-tree .module-banner').click();
 await fresh.page.locator('#library-search').fill('Autumn Leaves');
 assert.equal(await fresh.page.getByRole('button',{name:'Remove Autumn Leaves from favorites',exact:true}).count(),1);
 await fresh.page.getByRole('button',{name:'Remove Autumn Leaves from favorites',exact:true}).click();
 await poll(()=>rows.get('test-account-a:chart:autumn-leaves')?.value===false);
 results.push('PASS: both favorite collections restore on a fresh device and chart removal saves');
 const mobile=await device({width:390,height:844});
 await mobile.page.locator('#settings-close').click();
 await mobile.page.locator('#lesson-list .module-banner').click();
 await mobile.page.locator('[data-library-tab=licks]').click();
 await mobile.page.screenshot({animations:'disabled',path:'artifacts/selector-mobile-licks.png'});
 const widths=await mobile.page.locator('.library-picker-row .module-sheet-copy').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));
 assert.ok(widths.every(width=>width>220),'Picker text uses the row width');
 await mobile.page.locator('#library-search').fill('Guide Tone Sequence');
 await mobile.page.getByRole('button',{name:'Add Guide Tone Sequence to favorites',exact:true}).click();
 await mobile.page.locator('#library-search').fill('');
 await mobile.page.locator('#library-favorites').click();
 assert.equal(await mobile.page.locator('#quick-view-list .library-picker-row').count(),2);
 await mobile.page.screenshot({animations:'disabled',path:'artifacts/library-mobile-picker.png'});
 await mobile.page.locator('[data-library-tab=charts]').click();
 assert.equal(await mobile.page.locator('#library-favorites').getAttribute('aria-pressed'),'true');
 await mobile.page.locator('#library-favorites').click();
 await mobile.page.locator('[data-testid=quick-view-chart-autumn-leaves]').click();
 await mobile.page.locator('[data-testid=lesson-chart-favorite-gts]').click();
 assert.match(await mobile.page.locator('#chart-applications-list').textContent(),/No supported applications/);
 await mobile.page.getByRole('button',{name:'Close applications',exact:true}).click();
 await mobile.page.locator('#chart-applications').waitFor({state:'hidden'});
 await mobile.page.evaluate(()=>window.scrollTo(0,0));
 await mobile.page.screenshot({animations:'disabled',path:'artifacts/library-mobile-chart.png',fullPage:true});
 assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
 await mobile.page.locator('[data-testid=lesson-chart-favorite-cmar]').click();
 await mobile.page.locator('#chart-applications-list [data-lesson]').first().waitFor({state:'visible'});
 await mobile.page.screenshot({animations:'disabled',path:'artifacts/library-mobile-applications.png'});
 assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
 results.push('PASS: phone layout, favorites-only filter, and a lick with no supported chart application');
 assert.deepEqual(a.errors,[]);assert.deepEqual(fresh.errors,[]);assert.deepEqual(mobile.errors,[]);
 await a.context.close();await fresh.context.close();await mobile.context.close();
 if(video)await video.saveAs('artifacts/library-flow.webm');
 console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
