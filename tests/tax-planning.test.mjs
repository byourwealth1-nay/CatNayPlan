import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,demo,factories,taxResult,taxPlanning,decodePlan} from '../dist/model.mjs';
test('tax comparison preserves actual data and separates settlement from annual tax',()=>{
 const s=fresh();s.incomes.push({...factories.incomes(),gross:1000000,withheld:30000,taxInclude:true,taxType:'1'});
 s.tax.extraPlan=100000;s.tax.children=1;
 const before=JSON.stringify(s),p=taxPlanning(s);
 assert.equal(p.baseline,83000);assert.equal(p.current,77000);assert.equal(p.currentSaving,6000);
 assert.equal(p.rmf,100000);assert.equal(p.esg,0);assert.equal(p.saving,18000);assert.equal(p.after,59000);assert.equal(p.balance,29000);
 assert.equal(JSON.stringify(s),before);
 s.incomes[0].withheld=90000;const q=taxPlanning(s);assert.equal(q.after,p.after);assert.equal(q.balance,-31000);
});
test('budget allocation respects shared caps and reprices donations',()=>{
 const s=demo();s.tax.extraPlan=1000000;s.tax.donation=50000;s.tax.donationConfirmed=true;s.tax.doubleDonation=100000;s.tax.doubleDonationConfirmed=true;
 const p=taxPlanning(s),t=taxResult(s),actual=structuredClone(s);actual.tax.extraPlan=0;
 actual.portfolios.push({...factories.portfolios(),type:'RMF',taxPaid:p.rmf,taxAuto:false},{...factories.portfolios(),type:'ThaiESG',taxPaid:p.esg,taxAuto:false});
 assert.ok(p.rmf<=t.moreRMF);assert.ok(p.esg<=t.moreESG);assert.equal(p.rmf+p.esg,p.used);assert.equal(p.after,taxResult(actual).tax);assert.ok(p.unused>0);
 assert.equal(taxPlanning(decodePlan({app:'FP',version:7,data:s})).after,p.after);
});
test('minimum tax and zero tax never promise savings that do not exist',()=>{
 const s=fresh();s.incomes.push({...factories.incomes(),taxInclude:true,taxType:'8',gross:2000000,method:'actual',costs:1900000});s.tax.extraPlan=100000;
 const p=taxPlanning(s);assert.equal(p.current,10000);assert.equal(p.saving,0);assert.equal(p.after,10000);
 s.incomes[0].gross=100000;s.incomes[0].costs=0;assert.equal(taxPlanning(s).after,0);
});
