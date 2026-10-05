import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demo,fresh,decodePlan,cashflow} from '../dist/model.mjs';
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
