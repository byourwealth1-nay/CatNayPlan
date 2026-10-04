import assert from 'node:assert/strict';
import {fresh,demo,decodePlan,factories} from '../dist/model.mjs';
import {parseAmount,formatAmount,meta,normalizeMeta,pack,storageController,STORAGE_KEY,missing,pageStatus,fieldKey,answer,allocation} from '../dist/experience.mjs';
assert.equal(parseAmount('1,250,000.50'),1250000.5);assert.equal(formatAmount(1250000.5),'1,250,000.50');assert.equal(parseAmount('0.25'),.25);assert.equal(parseAmount(''),null);assert.equal(parseAmount('0'),0);
for(const s of ['1,2','abc','1.2.3','Infinity','-10','1e6'])assert.throws(()=>parseAmount(s));
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
let store=storageController(storage,decodePlan);assert.equal(store.load().state,null);const s=demo();meta(s,true);assert.equal(store.save(s).ok,true);store=storageController(storage,decodePlan);assert.deepEqual(store.load().state,s);
assert.equal(store.clear().ok,true);assert.equal(values.size,0);
values.set(STORAGE_KEY,'{broken');store=storageController(storage,decodePlan);assert.equal(store.load().blocked,true);assert.equal(store.save(s).ok,false);assert.equal(values.get(STORAGE_KEY),'{broken');assert.equal(store.clear().ok,true);assert.equal(store.save(s).ok,true);
const denied=storageController({getItem(){throw Error('denied')},setItem(){throw Error('quota')},removeItem(){throw Error('denied')}},decodePlan);assert.ok(denied.load().error);assert.equal(denied.clear().ok,false);assert.equal(denied.save(s).ok,false);
const quota=storageController({...storage,setItem(){throw Error('quota')}},decodePlan);assert.equal(quota.save(s).ok,false);
for(const version of [3,4,5]){const migrated=decodePlan({app:'FP',version,data:demo()});normalizeMeta(migrated);assert.equal(migrated.ux.imported,true);assert.equal(migrated.incomes[0].amount,65000)}
const f=fresh();meta(f);assert.equal(pageStatus(f,'finance'),'ยังไม่เริ่ม');assert.ok(missing(f,'finance').length);f.ux.answers.policies='no';assert.equal(answer(f,'policies'),'no');f.policies.push(factories.policies());assert.equal(answer(f,'policies'),'yes');
f.ux.skipped.goals=true;assert.equal(pageStatus(f,'goals'),'เลือกข้าม');
f.incomes.push(factories.incomes());const key=fieldKey(f,'incomes.0.amount');f.ux.unknown[key]=true;const restored=decodePlan(JSON.parse(JSON.stringify(pack(f))));normalizeMeta(restored);assert.equal(restored.ux.unknown[key],true);assert.ok(missing(restored,'tax').some(s=>s.includes('ยังไม่ทราบ')));
f.incomes.unshift(factories.incomes());assert.equal(fieldKey(f,'incomes.1.amount'),key);
const allocated=allocation(demo());assert.equal(allocated.allocated,650000);assert.equal(allocated.free,0);
assert.throws(()=>normalizeMeta({ux:{}}));
console.log('PASS V2.3: decimals/comma, blank vs zero, storage restore/clear/failure/corruption protection, legacy import, unknown persistence, stable field IDs, progress, allocation');

const complete=fresh();meta(complete,true);complete.ux.answers={incomes:'no',expenses:'no',assets:'no',debts:'no',pvd:'no',policies:'no',portfolios:'no',goals:'no'};
assert.equal(missing(complete,'finance').length,0);assert.equal(pageStatus(complete,'finance'),'กำลังกรอก');complete.ux.reviewed.finance=true;assert.equal(pageStatus(complete,'finance'),'กรอกครบ');complete.ux.unknown['profile.age']=true;assert.notEqual(pageStatus(complete,'finance'),'กรอกครบ');
console.log('PASS V2.3 completion: explicit none, required data, review, unknown invalidates completion');
