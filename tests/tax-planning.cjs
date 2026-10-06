const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8000');await p.locator('#focus-choices').waitFor();await p.evaluate(async()=>{const {demo}=await import('./model.mjs?v=2.6-taxflow1');window.catnayPlan.replace(demo());});await p.locator('[data-quick-topic="tax"]').click();await p.locator('.tax-overview').waitFor();
 assert.equal(await p.locator('[data-bind="tax.extraPlan"]').count(),1);
 assert.ok(await p.evaluate(()=>document.querySelector('#tax-overview').getBoundingClientRect().top<document.querySelector('[data-bind="tax.extraPlan"]').getBoundingClientRect().top));
 const old=await p.locator('.tax-flow').innerText();await p.locator('[data-bind="tax.extraPlan"]').fill('150000');await p.locator('[data-bind="tax.extraPlan"]').blur();assert.notEqual(await p.locator('.tax-flow').innerText(),old);
 assert.ok(await p.evaluate(()=>[...document.querySelectorAll('.data-table')].every(t=>[...t.querySelectorAll('tbody tr')].every(r=>[...r.cells].every((c,i)=>getComputedStyle(c).textAlign===getComputedStyle(t.querySelectorAll('thead th')[i]).textAlign)))));
 await p.locator('.tax-overview').scrollIntoViewIfNeeded();await p.screenshot({path:'test-artifacts/tax-flow-1440.png'});
 await p.setViewportSize({width:390,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('.tax-overview').scrollIntoViewIfNeeded();await p.screenshot({path:'test-artifacts/tax-flow-390.png'});
 await p.evaluate(()=>window.catnayPlan.flush());await p.reload();await p.locator('.tax-overview').waitFor();assert.equal(await p.locator('[data-bind="tax.extraPlan"]').inputValue(),'150,000.00');
 await p.evaluate(()=>window.catnayPlan.edit(s=>{s.ux.unknown['incomes.'+s.incomes[0].id+'.amount']=true;}));assert.equal(await p.locator('.tax-overview').count(),0);assert.equal(await p.locator('.tax-plan-output').count(),0);assert.deepEqual(errors,[]);console.log('PASS tax forecast order, budget preview, header alignment, mobile, persisted plan and unknown suppression');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
