const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8000');await page.locator('.settings > summary').click();
 await page.getByText('Cloud Sync ยังไม่ได้ตั้งค่า ข้อมูลของคุณยังคงบันทึกในอุปกรณ์นี้ตามปกติ').waitFor();assert.equal(await page.locator('#cloud-login').isDisabled(),true);
 await page.locator('.settings > summary').click();await page.locator('[data-bind="profile.name"]').fill('Backup test');
 await page.locator('.settings > summary').click();const downloadPromise=page.waitForEvent('download');await page.locator('.settings [data-action="export"]').click();const download=await downloadPromise;const path=await download.path();assert.ok(path);
 await page.locator('#file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});assert.equal(await page.locator('[data-bind="profile.name"]').inputValue(),'Backup test');
 await page.locator('.settings > summary').click();await page.locator('[data-bind="profile.name"]').fill('Changed after backup');await page.locator('.settings > summary').click();page.once('dialog',d=>d.accept());await page.locator('#file').setInputFiles(path);await page.waitForFunction(()=>document.querySelector('[data-bind="profile.name"]').value==='Backup test');
 await context.setOffline(true);await page.locator('.settings > summary').click();await page.locator('[data-bind="profile.name"]').fill('Offline saved');assert.equal(await page.locator('#save-status').textContent(),'บันทึกแล้ว');await context.setOffline(false);await page.reload();assert.equal(await page.locator('[data-bind="profile.name"]').inputValue(),'Offline saved');
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.locator('.settings > summary').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-artifacts/cloud-settings-'+width+'.png',fullPage:true});await page.locator('.settings > summary').click();}
 assert.deepEqual(errors,[]);
 const signed=await browser.newContext(),signedPage=await signed.newPage();
 await signedPage.route('**/firebase/service.mjs',route=>route.fulfill({contentType:'text/javascript',body:`
 export async function connectFirebase(){let callback,cloud=null;window.__cloudWrites=0;return {
 onAuth(cb){callback=cb;cb(null);},async login(){callback({uid:'test-user',displayName:'Test planner',email:'test@example.test'});},async logout(){callback(null);},
 async getClients(){return [{id:'client',name:'Test client',archived:false}];},async getPlans(){return cloud?[{id:'plan',planName:'Test plan'}]:[];},
 async createPlan(cid,title,data){cloud={data:structuredClone(data),planName:title,revision:1,updatedAt:100,createdAt:100};return 'plan';},
 async loadPlan(){return structuredClone(cloud);},async savePlan(cid,pid,r){if(r.revision!==cloud.revision)throw Object.assign(Error('conflict'),{code:'conflict'});cloud={...r,revision:r.revision+1,updatedAt:cloud.updatedAt+10};window.__cloudWrites++;return cloud.revision;}
 };}`})));
 await signedPage.goto('http://localhost:8000');await signedPage.locator('[data-bind="profile.name"]').fill('Local migration');await signedPage.locator('.settings > summary').click();await signedPage.locator('#cloud-login').click();
 await signedPage.locator('#cloud-clients option[value="client"]').waitFor({state:'attached'});await signedPage.locator('#cloud-clients').selectOption('client');
 assert.equal(await signedPage.evaluate(()=>window.__cloudWrites),0);
 await signedPage.locator('#cloud-controls details summary').click();await signedPage.locator('#cloud-plan-name').fill('Test plan');signedPage.once('dialog',d=>d.accept());await signedPage.locator('#cloud-upload').click();
 await signedPage.waitForFunction(()=>document.querySelector('#cloud-status').textContent==='☁ ซิงก์แล้ว');
 await signedPage.locator('.settings > summary').click();await signedPage.locator('[data-bind="profile.name"]').fill('Cloud edited');await signedPage.waitForFunction(()=>window.__cloudWrites===1);
 await signed.setOffline(true);await signedPage.locator('[data-bind="profile.name"]').fill('Offline cloud edit');await signed.setOffline(false);await signedPage.waitForFunction(()=>window.__cloudWrites===2);
 await signedPage.locator('.settings > summary').click();await signedPage.locator('#cloud-logout').click();await signedPage.locator('#cloud-login').waitFor();await signedPage.locator('.settings > summary').click();await signedPage.locator('[data-bind="profile.name"]').fill('Logged out edit');assert.equal(await signedPage.locator('#save-status').textContent(),'บันทึกแล้ว');
 console.log('PASS V2.4 browser: fallback, backup restore, offline save, settings layouts; fake-service login, consent migration, sync, reconnect and logout');
}finally{await browser.close();}})().catch(()=>{console.error('FAIL V2.4 browser checks');process.exit(1);});
