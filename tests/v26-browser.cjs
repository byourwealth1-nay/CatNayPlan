const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000');await page.locator('#focus-choices').waitFor();
  assert.equal(await page.locator('[data-section="incomes"]').isVisible(),false);
  await page.locator('[data-focus="retirement"]').click();assert.equal(await page.locator('[data-focus="retirement"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-plan-action="next"]').click();await page.locator('[data-bind="profile.name"]').fill('แผนจริงของฉัน');
  await page.locator('[data-plan-action="next"]').click();await page.locator('[data-section="incomes"]').selectOption('yes');await page.locator('[data-add="incomes"]').click();
  await page.locator('[data-bind="incomes.0.amount"]').fill('80,000.50');await page.locator('[data-bind="incomes.0.amount"]').blur();
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('fp.plan.v2.3')).data);
  await page.locator('[data-action="demo"]').click();assert.equal(await page.evaluate(()=>window.catnayPlan.isDemo()),true);
  await page.locator('[data-plan-mode="all"]').click();await page.locator('[data-bind="incomes.0.amount"]').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
  await page.locator('[data-bind="incomes.0.amount"]').fill('99999');assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('fp.plan.v2.3')).data),original);
  await page.reload();assert.equal(await page.evaluate(()=>window.catnayPlan.isDemo()),false);assert.equal(await page.evaluate(()=>window.catnayPlan.get().incomes[0].amount),80000.5);
  await page.locator('[data-action="demo"]').click();await page.locator('[data-plan-action="exit-demo"]').click();assert.equal(await page.evaluate(()=>window.catnayPlan.get().profile.name),'แผนจริงของฉัน');
  await page.evaluate(async()=>{const {demo}=await import('./model.mjs?v=2.6');window.catnayPlan.replace(demo());});
  await page.locator('nav a[href="#report"]').click();await page.locator('[data-accept="0"]').click();assert.equal(await page.locator('[data-task]').count(),1);
  await page.locator('[data-task-field="title"]').fill('ออมเพิ่มตามแผน');await page.locator('[data-task-field="title"]').blur();
  await page.locator('[data-task-field="status"]').selectOption('doing');await page.locator('[data-task-field="status"]').blur();
  await page.locator('[data-plan-action="snapshot"]').click();assert.equal(await page.evaluate(()=>window.catnayPlan.get().review.planner.history.length),1);
  await page.reload();assert.equal(await page.evaluate(()=>window.catnayPlan.get().review.planner.tasks[0].title),'ออมเพิ่มตามแผน');
  const prior=await page.evaluate(()=>window.catnayPlan.get().expenses[0].amount);const id=await page.evaluate(()=>window.catnayPlan.get().expenses[0].id);
  await page.locator('#sim-expense').selectOption(id);await page.locator('#sim-reduction').fill('1000');await page.locator('[data-plan-action="simulate"]').click();assert.equal(await page.evaluate(()=>window.catnayPlan.get().expenses[0].amount),prior);
  await page.locator('[data-plan-action="apply-simulation"]').click();assert.equal(await page.evaluate(()=>window.catnayPlan.get().expenses[0].amount),prior-1000);
  await page.locator('#toast [data-action="undo"]').click();assert.equal(await page.evaluate(()=>window.catnayPlan.get().expenses[0].amount),prior);
  await page.locator('[data-plan-action="present"]').click();assert.equal(await page.locator('#content').isVisible(),false);await page.locator('#presentation-private').uncheck();assert.equal(await page.locator('.task-presentation').isVisible(),true);await page.locator('[data-plan-action="present"]').click();
  fs.mkdirSync('test-artifacts',{recursive:true});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const route of ['finance','retirement','report']){await page.locator(`nav a[href="#${route}"]`).click();await page.waitForFunction(r=>document.querySelector("#pageName").textContent===({finance:"ข้อมูลการเงิน",retirement:"แผนเกษียณ",report:"ภาพรวมและสรุป"})[r],route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow '+width);await page.screenshot({path:`test-artifacts/v26-${route}-${width}.png`});}
  }
  await page.locator('[data-plan-mode="guided"]').click();await page.locator('nav a[href="#finance"]').click();await page.waitForFunction(()=>document.querySelector('#pageName').textContent==='ข้อมูลการเงิน');await page.screenshot({path:'test-artifacts/v26-guided-mobile.png'});
  await page.locator('nav a[href="#report"]').click();await page.pdf({path:'test-artifacts/v26-report.pdf',format:'A4',printBackground:true});
  assert.deepEqual(errors,[]);console.log('PASS V2.6: guided entry, demo isolation/reload/restore, actions/history persistence, scenario preview/apply/undo, presentation privacy, desktop/mobile and PDF');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
