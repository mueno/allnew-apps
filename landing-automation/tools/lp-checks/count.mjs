// Run with the repo Playwright dependency, or PLAYWRIGHT_MODULE pointing to an installed copy.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'landing-automation/runtime/landing-runtime.js'),'utf8');
// Vercel checks directory paths without trailing slashes while walking the tree.
// Pass its compatible ignore package when verifying the upload selection.
let packagingVerified=false;
if(process.env.IGNORE_MODULE){
 const {default:ignore}=await import(pathToFileURL(process.env.IGNORE_MODULE).href);
 const filter=ignore().add(fs.readFileSync(path.join(root,'.vercelignore'),'utf8'));
 for(const name of ['landing-automation','landing-automation/runtime','landing-automation/runtime/landing-runtime.js'])assert(!filter.ignores(name),name+' must be traversable');
 for(const name of ['landing-automation/scripts','landing-automation/config','landing-automation/state','landing-automation/tests','landing-automation/tools','landing-automation/runtime/private.json'])assert(filter.ignores(name),name+' must remain excluded');
 packagingVerified=true;
}
const original=JSON.parse(fs.readFileSync(path.join(root,'data/landing-apps.generated.json'))).apps;
const clone=x=>structuredClone(x);
const added={...clone(original[0]),slug:'new-public-app',asc_app_id:'999999999'};
const changed=clone(original);changed[0].status='submitted';changed[1].status='draft';
const scenarios=[['baseline',original,16],['add',[...original,added],17],['remove',original.slice(1),15],['status',changed,14],['duplicates',[...original,clone(original[0]),{...original[0],slug:'same-store-id'}],16],['empty',[],0],['fetch-failure',null,16]];
const results=[];
for(const [engine,type,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]]){
 const browser=await type.launch({headless:true,...(executablePath?{executablePath}: {})});
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}])for(const lang of ['ja','en'])for(const [name,apps,count] of scenarios){
   const context=await browser.newContext({viewport,locale:lang});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname!=='count.test')return route.abort();
    if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    if(u.pathname.endsWith('/landing-runtime.js'))return route.fulfill({contentType:'application/javascript',body:runtime});
    if(u.pathname.endsWith('/landing-apps.generated.json'))return route.fulfill({status:apps?200:503,contentType:'application/json',body:JSON.stringify({apps})});
    return route.fulfill({status:404,body:''});
   });
   await page.goto('https://count.test/?lang='+lang,{waitUntil:'networkidle'});
   async function verify(language){
    assert.equal(await page.locator('#total-app-count').innerText(),String(count),engine+' '+name);
    assert.equal(await page.locator('.work-grid .work-card').count(),count);
    await page.locator('#total-app-count').scrollIntoViewIfNeeded();
    assert(await page.locator('#total-app-count').isVisible());
    const box=await page.locator('#total-app-count').boundingBox();assert(box.width>0&&box.height>0&&box.x>=0&&box.x+box.width<=viewport.width);
    assert.equal(await page.locator('html').getAttribute('lang'),language);
   }
   await verify(lang);
   const other=lang==='ja'?'en':'ja';await page.locator('[data-lang-select="'+other+'"]').first().click();await verify(other);
   await page.locator('[data-lang-select="'+lang+'"]').first().click();await verify(lang);
   assert.deepEqual(errors,[]);
   results.push({engine,viewport:viewport.width,lang,scenario:name,count,language_roundtrip:true});
   await context.close();
  }
 }finally{await browser.close();}
}
console.log(JSON.stringify({passed:results.length,packagingVerified,results},null,2));
