import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demo,fresh,decodePlan,cashflow,retirementResult} from '../dist/model.mjs';
import {planning,health,suggestions,snapshot,experiment,taskFromSuggestion} from '../dist/planner.mjs';
import {pack} from '../dist/experience.mjs';
test('scenario conserves cash, does not mutate source and roundtrips accepted values',()=>{
 const s=demo(),before=structuredClone(s);const r=experiment(s,{expenseId:s.expenses[0].id,reduction:2000,extraSaving:500,extraPayment:1000,debtId:s.debts[0].id});
 assert.deepEqual(s,before);assert.equal(r.after.remaining-r.before.remaining,500);assert.equal(r.next.expenses[0].amount,8000);assert.equal(r.next.debts[0].extra,2000);assert.ok(r.debt.months>0);assert.deepEqual(decodePlan(pack(r.next)),r.next);
 assert.throws(()=>experiment(s,{expenseId:s.expenses[0].id,reduction:10001}));assert.throws(()=>experiment(s,{extraPayment:1}));assert.throws(()=>experiment(s,{retireAge:90}));
});
test('new plan asks for missing information without diagnosing zero defaults',()=>{
 const s=fresh();assert.equal(suggestions(s)[0].id,'complete');assert.equal(health(s).runway,null);assert.equal(health(s).debtRatio,null);assert.throws(()=>snapshot(s));
});
test('action plan and dated observations survive backups, reject invalid imported records',()=>{
 const s=demo(),p=planning(s);p.tasks.push(taskFromSuggestion(suggestions(s)[0]));p.tasks[0].status='doing';p.reason='ดูแลครอบครัว';p.history.push(snapshot(s,'เริ่มติดตาม'));
 assert.deepEqual(decodePlan(pack(s)).review.planner,p);assert.equal(p.history[0].net,cashflow(s).net);
 const broken=structuredClone(s);broken.review.planner.history[0].net='100';assert.throws(()=>decodePlan(pack(broken)));
});
test('unresolved cash value blocks diagnoses and historical observations',()=>{
 const s=demo();s.ux.unknown['assets.'+s.assets[0].id+'.value']=true;assert.equal(health(s).unresolved,true);assert.equal(suggestions(s)[0].id,'complete');assert.throws(()=>snapshot(s));
});
test('saving ratio counts employee payroll once, excludes employer contribution',()=>{
 const s=demo(),h=health(s);assert.equal(h.saving,cashflow(s).savingMonthly+4000);s.portfolios[0].employer=9000;assert.equal(health(s).saving,h.saving);
});

test('quick entry keeps amounts unknown even for imported plans, avoids duplicates and roundtrips',async()=>{
 const {addPreset,basicIssues}=await import('../dist/ux-helpers.mjs');
 const s=demo();const before=cashflow(s);const item=addPreset(s,'commission');
 assert.equal(item.existing,false);assert.ok(basicIssues(s).some(x=>x.title.includes('ค่านายหน้า')));assert.equal(cashflow(s).income,before.income);
 const count=s.incomes.length;assert.equal(addPreset(s,'commission').existing,true);assert.equal(s.incomes.length,count);assert.doesNotThrow(()=>decodePlan(pack(s)));
 const debt=addPreset(s,'home');assert.equal(s.debts.find(x=>x.id===debt.id).method,'manual');assert.ok(basicIssues(s).some(x=>x.title.includes('สินเชื่อบ้าน')));
});

test('retirement ledger rolls balances, splits pensions and reports shortfall without negative assets',()=>{
 const s=fresh();s.profile.age=60;Object.assign(s.retirement,{age:60,end:62,expense:50000,inflation:2.5,rate:0,postRate:3,social:8000,socialAge:60,other:0,monthly:0});s.assets=[{id:'cash',name:'เงินตั้งต้น',kind:'cash',purpose:'retirement',value:10000000}];
 let r=retirementResult(s);assert.equal(r.timeline[0].opening,10000000);assert.equal(r.timeline[0].closing,9780880);assert.ok(Math.abs(r.timeline[1].closing-9539736.4)<.001);assert.equal(r.firstShortfall,null);assert.equal(r.timeline[0].social,96000);assert.equal(r.sources.reduce((a,x)=>a+x.projected,0),r.future);
 s.assets[0].value=100000;r=retirementResult(s);assert.equal(r.firstShortfall,60);assert.equal(r.timeline[0].shortfall,404000);assert.equal(r.timeline[0].growth,0);assert.equal(r.timeline[0].closing,0);
 for(const t of r.timeline)assert.ok(Math.abs(t.opening+t.pension-t.expense+t.shortfall+t.growth-t.closing)<.001);
});
test('surplus income is retained; backward target funds every year and terminal legacy',()=>{
 const s=fresh();s.profile.age=60;Object.assign(s.retirement,{age:60,end:63,expense:10000,inflation:0,rate:0,postRate:3,social:0,other:0,monthly:0,legacy:50000});s.policies=[{id:'ann',name:'บำนาญ',type:'annuity',insured:'self',status:'active',start:'',end:'',annuity:240000,annuityStart:60,annuityEnd:60}];
 const result=retirementResult(s);s.assets=[{id:'c',name:'เงินเกษียณ',kind:'cash',purpose:'retirement',value:result.target}];const funded=retirementResult(s);
 assert.equal(funded.firstShortfall,null);assert.ok(Math.abs(funded.endingBalance-50000)<.001);assert.equal(funded.timeline[0].annuity,240000);assert.equal(funded.timeline[1].annuity,0);assert.ok(funded.timeline[0].closing>funded.timeline[0].opening);
});
