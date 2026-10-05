import * as experience from '../dist/experience.mjs';
import assert from 'node:assert/strict';import vm from'node:vm';import fs from'node:fs';import*as model from'../dist/model.mjs';
const els=new Map(),listeners={},queryLists=new Map();
function parseDataset(tag){const d={};for(const m of tag.matchAll(/data-([a-z-]+)="([^"]*)"/g))d[m[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];return d}
function el(id,tag=''){if(els.has(id))return els.get(id);const x={id,dataset:parseDataset(tag),textContent:'',value:'',checked:false,tagName:tag.match(/^<(\w+)/)?.[1]?.toUpperCase()||'DIV',classList:{toggle(){}},addEventListener(t,fn){(listeners['el:'+id+':'+t]??=[]).push(fn)},focus(){},scrollIntoView(){},click(){}};let html='';Object.defineProperty(x,'innerHTML',{get(){return html},set(v){html=String(v);if(id==='content'){for(const m of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/gi))el(m[2],m[0]);for(const m of html.matchAll(/<([a-z]+)[^>]*data-result[^>]*>/gi))el(m[0].match(/id="([^"]+)/)?.[1]||'x',m[0]);for(const m of html.matchAll(/<([a-z]+)[^>]*data-goal-result="([^"]+)"[^>]*>/g))el('goal:'+m[2],m[0]);for(const m of html.matchAll(/<([a-z]+)[^>]*data-goal-advice="([^"]+)"[^>]*>/g))el('advice:'+m[2],m[0]);for(const m of html.matchAll(/<([a-z]+)[^>]*data-portfolio-summary="([^"]+)"[^>]*>/g))el('portfolio:'+m[2],m[0]);for(const m of html.matchAll(/<([a-z]+)[^>]*data-policy-summary="([^"]+)"[^>]*>/g))el('policy:'+m[2],m[0]);}}});els.set(id,x);return x}
function all(selector){if(selector==='#content details')return [...(els.get('content')?.innerHTML.matchAll(/<details\b/g)||[])].map((_,i)=>({open:false,i,dataset:{entry:"mock-detail-"+i},closest(){return null},querySelector(){return null}}));if(selector==='[data-result]'){const html=els.get('content')?.innerHTML||'';return[...html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*data-result[^>]*>/gi)].map(m=>el(m[2],m[0]))}const content=els.get('content')?.innerHTML||'';if(selector==='[data-goal-result]')return[...content.matchAll(/<([a-z]+)[^>]*data-goal-result="([^"]+)"[^>]*>/g)].map(m=>el('goal:'+m[2],m[0]));if(selector==='[data-goal-advice]')return[...content.matchAll(/<([a-z]+)[^>]*data-goal-advice="([^"]+)"[^>]*>/g)].map(m=>el('advice:'+m[2],m[0]));if(selector==='[data-portfolio-summary]')return[...content.matchAll(/<([a-z]+)[^>]*data-portfolio-summary="([^"]+)"[^>]*>/g)].map(m=>el('portfolio:'+m[2],m[0]));if(selector==='[data-policy-summary]')return[...content.matchAll(/<([a-z]+)[^>]*data-policy-summary="([^"]+)"[^>]*>/g)].map(m=>el('policy:'+m[2],m[0]));return[]}
const doc={querySelector:s=>el(s[0]==='#'?s.slice(1):s),querySelectorAll:all,addEventListener(t,fn){(listeners['doc:'+t]??=[]).push(fn)},createElement:()=>({click(){}})};
for(const id of ['nav','content','stepNav','pageName','alerts','toast','file'])el(id);
const location={hash:'#finance'},context={...model,...experience,localStorage:{value:null,getItem(){return this.value},setItem(k,v){this.value=v},removeItem(){this.value=null}},clearTimeout,document:doc,window:{addEventListener(t,fn){(listeners['win:'+t]??=[]).push(fn)},scrollTo(){}},location,console,Intl,structuredClone,Number,String,Object,Math,Date,JSON,Blob,URL,setTimeout,confirm:()=>true};vm.createContext(context);const code=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'');vm.runInContext(code,context);
assert.match(els.get('content').innerHTML,/สรุปภาพรวมการเงิน/);for(const page of ['protection','goals','retirement','tax','report']){location.hash='#'+page;listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('content').innerHTML,new RegExp(page==='goals'?'เป้าหมาย':page==='finance'?'Cash Flow':page==='tax'?'เงินได้':'STEP'));}
console.log('PASS V2 UI: finance, protection, goals, retirement, tax, report render smoke check');
function legacyFixture(){vm.runInContext("meta(state).imported=true;meta(state).answers={incomes:'no',expenses:'no',assets:'no',debts:'no',pvd:'no',policies:'no',portfolios:'no',goals:'no'}",context)}
legacyFixture();
function clickAction(dataset){const b={dataset};b.closest=sel=>sel==='button'?b:Object.entries(dataset).some(([k,v])=>sel.includes(k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()))&&sel.includes('"'+v+'"'))?b:null;for(const fn of listeners['doc:click'])fn({target:{closest:sel=>sel==='button'?b:b.closest(sel)}});if(dataset.action==='new')legacyFixture()}
function typeField(path,value,type='number'){const target={dataset:{bind:path},tagName:type==='checkbox'?'INPUT':'INPUT',type,value,checked:false,max:''};for(const fn of listeners['doc:input'])fn({target})}
location.hash='#goals';listeners['win:hashchange'].forEach(f=>f());clickAction({add:'goals'});assert.match(els.get('content').innerHTML,/เป้าหมายที่ 1/);typeField('goals.0.name','บ้าน','text');typeField('goals.0.target','500000');typeField('goals.0.years','5');typeField('goals.0.rate','3');typeField('goals.0.monthly','4000');const goalId=els.get('content').innerHTML.match(/data-goal-result="([^"]+)"/)[1];assert.match(els.get('goal:'+goalId).innerHTML,/ควรออมทั้งหมดต่อเดือน|ควรออม \/ เดือน/);
clickAction({add:'portfolios'});typeField('portfolios.0.name','เงินดาวน์บ้าน','text');typeField('portfolios.0.value','100000');typeField('portfolios.0.cost','90000');typeField('portfolios.0.purpose',goalId,'text');assert.match(els.get('goal:'+goalId).innerHTML,/100,000/);assert.match(els.get('portfolio:'+els.get('content').innerHTML.match(/data-portfolio-summary="([^"]+)"/)[1]).innerHTML,/10,000/);
location.hash='#finance';listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('content').innerHTML,/สรุปภาพรวมการเงิน/);
location.hash='#retirement';listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('retirement-linked').innerHTML,/ยังไม่มีเงินที่จัดสรร/);
console.log('PASS V2 UI interactions: add/edit multiple goals, allocate portfolio once, gain/loss display, linked summaries');
function chooseField(path,value){const target={dataset:{bind:path},tagName:'SELECT',type:'select-one',value};for(const fn of listeners['doc:change'])fn({target})}
clickAction({action:'new'});clickAction({add:'incomes'});chooseField('incomes.0.amountMode','gross');typeField('incomes.0.amount','50000');typeField('incomes.0.gross','600000');typeField('incomes.0.socialDeduct','875');typeField('incomes.0.taxDeduct','2000');typeField('incomes.0.otherDeduct','500');clickAction({add:'pvd'});
assert.match(els.get('content').innerHTML,/data-bind="portfolios.0.incomeId"/);
typeField('portfolios.0.monthly','2500');typeField('portfolios.0.employer','2500');typeField('portfolios.0.value','300000');
const incomeId=vm.runInContext('state.incomes[0].id',context);
assert.match(els.get('income-'+incomeId).innerHTML,/44,125/);
assert.equal(vm.runInContext('cashflow(state).remaining',context),44125);
chooseField('incomes.0.amountMode','net');typeField('incomes.0.amount','44125');assert.equal(vm.runInContext('cashflow(state).remaining',context),44125);
chooseField('tax.socialAuto','false');assert.match(els.get('content').innerHTML,/data-bind="tax.socialPaid"/);typeField('tax.socialPaid','4000');assert.equal(vm.runInContext('socialAnnual(state)',context),4000);
chooseField('portfolios.0.taxAuto','false');typeField('portfolios.0.taxPaid','15000');
location.hash='#goals';listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('pvd-linked').innerHTML,/300,000/);assert.doesNotMatch(els.get('content').innerHTML,/data-bind="portfolios.0.value"/);
location.hash='#retirement';listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('retirement-linked').innerHTML,/300,000/);assert.match(els.get('social-retirement').innerHTML,/4,000/);
location.hash='#tax';listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('tax-linked').innerHTML,/15,000/);assert.match(els.get('tax-linked').innerHTML,/4,000/);
location.hash='#finance';listeners['win:hashchange'].forEach(f=>f());clickAction({remove:'portfolios',index:'0'});assert.equal(vm.runInContext('state.portfolios.length',context),0);clickAction({action:'undo'});assert.equal(vm.runInContext('state.portfolios.length',context),1);
console.log('PASS V2.1 UI: add PVD on finance, salary link, live net pay, boolean tax controls, linked retirement/tax, no duplicate editors, delete/undo');
location.hash='#tax';listeners['win:hashchange'].forEach(f=>f());
assert.match(els.get('content').innerHTML,/ขอบเขตการคำนวณภาษี/);
assert.match(els.get('content').innerHTML,/data-bind="tax.solarConnected"/);
assert.match(els.get('content').innerHTML,/data-bind="tax.homeContract"/);
typeField('tax.solar','250000');typeField('tax.solarConnected','2026-08-15','date');
const verify={dataset:{bind:'tax.solarConfirmed'},tagName:'INPUT',type:'checkbox',checked:true,value:''};
for(const fn of listeners['doc:input'])fn({target:verify});
assert.match(els.get('tax-results').innerHTML,/Solar Rooftop ตามเงื่อนไข/);
assert.equal(vm.runInContext('taxResult(state).special.solar',context),200000);
console.log('PASS V2.2 UI: coverage notice and conditional special deductions update tax results');

// V2.3 actual UI event paths with a deterministic DOM mock (not browser layout tests).
clickAction({action:'new'});clickAction({add:'incomes'});
const moneyInput={dataset:{bind:'incomes.0.amount',money:'true'},tagName:'INPUT',type:'text',value:'1,250,000.50',setCustomValidity(v){this.validation=v}};
listeners['doc:input'].forEach(fn=>fn({target:moneyInput}));assert.equal(vm.runInContext('state.incomes[0].amount',context),1250000.5);
listeners['doc:focusout'].forEach(fn=>fn({target:moneyInput}));assert.equal(moneyInput.value,'1,250,000.50');listeners['doc:focusin'].forEach(fn=>fn({target:moneyInput}));assert.equal(moneyInput.value,'1250000.50');
moneyInput.value='';listeners['doc:input'].forEach(fn=>fn({target:moneyInput}));assert.equal(vm.runInContext('state.ux.unknown[fieldKey(state,"incomes.0.amount")]',context),true);assert.equal(vm.runInContext('state.incomes[0].amount',context),1250000.5);
moneyInput.value='0';listeners['doc:input'].forEach(fn=>fn({target:moneyInput}));assert.equal(vm.runInContext('state.incomes[0].amount',context),0);assert.equal(vm.runInContext('state.ux.unknown[fieldKey(state,"incomes.0.amount")]',context),false);
vm.runInContext('flushSave()',context);assert.ok(context.localStorage.value);context.confirm=()=>false;clickAction({action:'clear-storage'});assert.ok(context.localStorage.value);assert.equal(vm.runInContext('state.incomes.length',context),1);
context.confirm=()=>true;clickAction({action:'clear-storage'});assert.equal(context.localStorage.value,null);assert.equal(vm.runInContext('state.incomes.length',context),0);
context.localStorage.setItem=()=>{throw Error('quota')};typeField('profile.name','Storage denied','text');vm.runInContext('flushSave()',context);assert.equal(els.get('save-status').textContent,'บันทึกไม่สำเร็จ');
console.log('PASS V2.3 UI events: comma focus/blur, blank vs zero, real numeric state, save error, clear confirmation cancel/accept');

for(const p of ['profile.age','profile.dependents','tax.extraChildren','retirement.inflation','goals.0.years','policies.0.copay'])assert.equal(vm.runInContext(`isMoney('${p}')`,context),false);
vm.runInContext("state=fresh();meta(state);for(const p of ['finance','protection','goals','retirement','tax'])meta(state).skipped[p]=true",context);location.hash='#report';listeners['win:hashchange'].forEach(f=>f());assert.match(els.get('report-results').innerHTML,/เลือกข้าม — ไม่แสดงยอดคำนวณ/);assert.doesNotMatch(els.get('report-results').innerHTML,/class="stats"/);
console.log('PASS V2.3 non-money fields and skipped report has no fabricated zero totals');

// Bonus is a separate annual income: cash arrives once, tax amounts are explicit.
clickAction({action:'new'});location.hash='#finance';listeners['win:hashchange'].forEach(f=>f());clickAction({add:'incomes'});
typeField('incomes.0.amount','50000');typeField('incomes.0.gross','600000');
assert.match(els.get('content').innerHTML,/data-add="bonus"/);
clickAction({add:'bonus',salary:'0'});
assert.equal(vm.runInContext('state.incomes[1].frequency',context),'yearly');
assert.equal(vm.runInContext('state.incomes[1].taxType',context),'1');
typeField('incomes.1.amount','90000');typeField('incomes.1.gross','100000');typeField('incomes.1.withheld','10000');chooseField('incomes.1.month','3');
assert.equal(vm.runInContext('cashflow(state).income',context),690000);
assert.equal(vm.runInContext('cashflow(state).months[2].income',context),140000);
assert.equal(vm.runInContext('cashflow(state).months[11].income',context),50000);
assert.equal(vm.runInContext('state.incomes.reduce((v,r)=>v+r.gross,0)',context),700000);
assert.equal(vm.runInContext('decodePlan(pack(state)).incomes[1].amount',context),90000);
console.log('PASS bonus: separate annual cash receipt, month selection, explicit taxable gross and backup roundtrip');
clickAction({action:'demo'});chooseField('incomes.0.taxSource','manual');
for(const [path,value]of [['incomes.0.gross','1200000'],['incomes.0.withheld','90000']])for(const fn of listeners['doc:input'])fn({target:{dataset:{bind:path,money:'true'},tagName:'INPUT',type:'text',value,max:''}});
assert.equal(vm.runInContext('state.incomes[0].gross',context),1200000);assert.equal(vm.runInContext('state.incomes[0].withheld',context),90000);
for(const fn of listeners['doc:input'])fn({target:{dataset:{bind:'incomes.0.certificateIncludesBonus'},tagName:'INPUT',type:'checkbox',checked:true,value:'',max:''}});
assert.equal(vm.runInContext('taxResult(state).gross',context),1200000);
