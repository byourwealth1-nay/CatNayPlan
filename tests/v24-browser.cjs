const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8000');await page.locator('.settings > summary').click();
 await page.getByText('Cloud Sync ยังไม่ได้ตั้งค่า ข้อมูลของคุณยังคงบันทึกในอุปกรณ์นี้ตามปกติ').waitFor();assert.equal(await page.locator('#cloud-login').isDisabled(),true);
 await page.locator('.settings > summary').click();await page.locator('[data-bind="profile.name"]').fill('Backup test');
 await page.locator('.settings > summary').click();const downloadPromise=page.waitForEvent('download');await page.locator('.settings [data-action="export"]').click();const download=await downloadPromise;const path=await download.path();assert.ok(path);
 await page.locator('#file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});assert.equal(await page.locator('[data-bind="profile.name"]').inputValue(),'Backup test');
 await page.locator('#file').setInputFiles(path);assert.equal(await page.locator('[data-bind="profile.name"]').inputValue(),'Backup test');
 await context.setOffline(true);await page.locator('.settings > summary').click();await page.locator('[data-bind="profile.name"]').fill('Offline saved');assert.equal(await page.locator('#save-status').textContent(),'บันทึกแล้ว');await context.setOffline(false);await page.reload();assert.equal(await page.locator('[data-bind="profile.name"]').inputValue(),'Offline saved');
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.locator('.settings > summary').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-artifacts/cloud-settings-'+width+'.png',fullPage:true});await page.locator('.settings > summary').click();}
 assert.deepEqual(errors,[]);console.log('PASS V2.4 browser: unconfigured fallback, backups, invalid import, offline save/restore, settings desktop/mobile');
}finally{await browser.close();}})().catch(()=>{console.error('FAIL V2.4 browser checks');process.exit(1);});
