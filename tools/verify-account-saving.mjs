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
async function device() {
  const context=await browser.newContext({viewport:{width:1100,height:950},serviceWorkers:'block'});
  await context.addInitScript(() => { const add = window.addEventListener.bind(window), waiting = []; window.addEventListener = (type, fn, opts) => type === 'storage' ? waiting.push([fn,opts]) : add(type,fn,opts); window.testEnableStorage = () => { for(const [fn,opts] of waiting.splice(0)) add('storage',fn,opts); }; });
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

const findings=[];
async function earn(page,key){await page.evaluate(key=>{const m=window.__DUOJAZZ__.getMastery();m.lessons['master-lick'].passedKeys=[key];window.__DUOJAZZ__.setMastery(m);},key);}
try {
 const a=await device();
 await a.page.locator('#start-key').selectOption('D');
 await poll(()=>rows.get('test-account-a:startKeyId')?.value==='D');
 await a.page.waitForFunction(()=>document.querySelector('#start-key').value==='D');
 const fresh=await device();
 await fresh.page.waitForFunction(()=>document.querySelector('#start-key').value==='D');
 findings.push('PASS: D stays D after account sync and fresh-device restore');
 await fresh.context.close();
 await new Promise(r=>setTimeout(r,300));
 fail=true;progressRequests=0;
 await earn(a.page,'C');
 await a.page.waitForFunction(()=>document.querySelector('#account-error').textContent.includes('haven’t reached'));
 await poll(()=>progress.size===1);
 findings.push('PASS: earned progress uploads while the settings endpoint fails');
 fail=false;await a.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 const b=await a.context.newPage();
 await b.goto(process.env.APP_URL ?? 'http://127.0.0.1:4174',{waitUntil:'networkidle'});
 await earn(b,'G');await poll(()=>progress.size===2);
 await a.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await a.page.waitForFunction(()=>window.__DUOJAZZ__.getMastery().lessons['master-lick'].passedKeys.length===2);
 await new Promise(r=>setTimeout(r,300));
 await a.page.evaluate(()=>window.testEnableStorage());await b.evaluate(()=>window.testEnableStorage());
 progressRequests=0;await b.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await new Promise(r=>setTimeout(r,2000));
 const initial=progressRequests;
 await new Promise(r=>setTimeout(r,2000));
 assert.equal(progressRequests-initial,0);
 findings.push('PASS: two tabs converge without repeated progress requests');
 await a.page.locator('#my-charts-button').click();
 await a.page.locator('#add-chart-button').click();
 await a.page.locator('#my-charts-search').fill('Autumn Leaves');
 await a.page.getByRole('button',{name:'Add Autumn Leaves',exact:true}).click();
 await poll(()=>rows.get('test-account-a:chart:autumn-leaves')?.value===true);
 const c=await device();await c.page.locator('#my-charts-button').click();
 await c.page.getByRole('button',{name:'Remove Autumn Leaves',exact:true}).waitFor();
 await c.page.screenshot({path:'artifacts/fixed-account-favorites.png'});
 await c.page.getByRole('button',{name:'Remove Autumn Leaves',exact:true}).click();
 await poll(()=>rows.get('test-account-a:chart:autumn-leaves')?.value===false);
 findings.push('PASS: favorite additions and removals persist through the account');
 assert.deepEqual(a.errors,[]);assert.deepEqual(c.errors,[]);
 console.log(JSON.stringify(findings,null,2));
}finally{await browser.close();}
