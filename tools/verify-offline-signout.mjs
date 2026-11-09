const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({serviceWorkers:'block'});
try{
 await context.addInitScript(()=>{
   Object.defineProperty(navigator,'onLine',{get:()=>false});
   const key='sb-ogttqddpizpnocrtvixi-auth-token';
   if(!localStorage.getItem('review-auth-seeded')){
     const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:'11111111-1111-4111-8111-111111111111',exp:Math.floor(Date.now()/1000)+3600}))+'.test';
     localStorage.setItem(key,JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:'11111111-1111-4111-8111-111111111111',email:'review@example.com'}}));
     localStorage.setItem('review-auth-seeded','true');
   }
 });
 // No live authentication or database traffic is sent.
 await context.route('https://*.supabase.co/**',r=>r.abort());
 const a=await context.newPage(),b=await context.newPage();
 for(const p of [a,b]){await p.goto((process.env.APP_URL ?? 'http://127.0.0.1:4174'),{waitUntil:'networkidle'});await p.locator('#account-chip').click();}
 await a.locator('#account-signout').click();
 await a.waitForFunction(()=>!document.querySelector('#login-screen').hidden);
 await new Promise(r=>setTimeout(r,1200));
 const result={signedOutTabShowsLogin:await a.locator('#login-screen').isVisible(),otherTabStillShowsAccount:await b.locator('#app-shell').isVisible(),otherTabIdentity:await b.locator('#account-identity').textContent(),storedSession:await b.evaluate(()=>localStorage.getItem('sb-ogttqddpizpnocrtvixi-auth-token')!==null)};
 assert.equal(result.otherTabStillShowsAccount,false);assert.equal(result.storedSession,false);
 console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
