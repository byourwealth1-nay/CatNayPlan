import {cashflow, retirementResult, goalResults, debtSchedule, incomeBreakdown, incomeMonths, sum, uid} from './model.mjs?v=2.6-taxflow1';
import {missing, unknownFor} from './experience.mjs?v=2.6-taxflow1';

export function planning(s) {
  return s.review.planner ||= {focus:['finance'],reason:'',tasks:[],history:[]};
}
export function validatePlanning(s) {
  if (!s.review?.planner) return s;
  const p=s.review.planner;
  if (!p || !Array.isArray(p.focus) || p.focus.length>8 || p.focus.some(x=>!['finance','debt','reserve','retirement','tax','protection','goals'].includes(x)) || typeof p.reason!=='string' || p.reason.length>2000 || !Array.isArray(p.tasks) || p.tasks.length>100 || !Array.isArray(p.history) || p.history.length>120) throw Error('ข้อมูลแผนลงมือทำไม่ถูกต้อง');
  if(p.deferred!==undefined&&(!Array.isArray(p.deferred)||p.deferred.length>4||p.deferred.some(x=>!['about','income','expense','assets'].includes(x))))throw Error('ข้อมูลขั้นตอนที่พักไว้ไม่ถูกต้อง');
  const text=(x,max=2000)=>typeof x==='string'&&x.length<=max;
  const date=x=>x===''||/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
  for(const t of p.tasks) if(!text(t.id,160)||!text(t.title)||!text(t.owner,160)||!date(t.date)||!['todo','doing','done'].includes(t.status)||!Number.isFinite(t.amount)||t.amount<0||t.amount>1e12)throw Error('รายการลงมือทำไม่ถูกต้อง');
  for(const h of p.history) if(!text(h.id,160)||!date(h.date)||!h.date||!text(h.note)||!['net','debt','reserves','saving','remaining'].every(k=>Number.isFinite(h[k])&&Math.abs(h[k])<=1e14))throw Error('บันทึกติดตามผลไม่ถูกต้อง');
  if(new Set(p.tasks.map(t=>t.id)).size!==p.tasks.length||new Set(p.history.map(h=>h.id)).size!==p.history.length)throw Error('รหัสบันทึกซ้ำ');
  return s;
}
export function health(s) {
  const cf=cashflow(s), unresolved=unknownFor(s,'finance'), complete=!missing(s,'finance').length;
  const payrollSaving=sum(s.portfolios.filter(p=>p.payroll),p=>p.monthly*(s.incomes.find(r=>r.id===p.incomeId)?incomeMonths(s.incomes.find(r=>r.id===p.incomeId)):12))/12;
  const denominator=cf.income/12+payrollSaving;
  return {cf,complete,unresolved,saving:cf.savingMonthly+payrollSaving,
    debtRatio:denominator>0?cf.debtMonthly/denominator:null,
    savingRatio:denominator>0?(cf.savingMonthly+payrollSaving)/denominator:null,
    runway:cf.essential>0?cf.reserves/cf.essential:null,
    liquid:sum(s.assets.filter(a=>a.kind==='cash'),a=>a.value),
    personal:sum(s.assets.filter(a=>a.kind!=='cash'),a=>a.value),
    invested:sum(s.portfolios,p=>p.value)};
}
export function suggestions(s) {
  const h=health(s), out=[];
  const add=(id,title,why,amount,route)=>out.push({id,title,why,amount,route});
  if(!h.complete||h.unresolved){add('complete','เติมข้อมูลการเงินที่ยังขาด',missing(s,'finance')[0]||'ยืนยันรายการที่ยังไม่ทราบ',0,'finance');return out;}
  if(h.cf.remaining<0)add('cash','ปรับรายจ่ายและยอดออมให้สมดุล','รายจ่ายและเงินออมที่วางไว้สูงกว่าเงินรับจริง',-h.cf.remaining,'finance');
  if(h.cf.reserves<h.cf.reserveTarget)add('reserve','วางแผนเติมเงินสำรอง','เปรียบเทียบกับเป้าหมายจำนวนเดือนที่คุณกำหนด',h.cf.reserveTarget-h.cf.reserves,'finance');
  const debt=s.debts.filter(d=>d.method==='reducing').sort((a,b)=>b.rate-a.rate)[0];
  if(debt)add('debt','ทบทวนแผนชำระ '+debt.name,'ทดลองโปะและตรวจเงินเหลือก่อนเพิ่มค่างวด',0,'finance');
  if(!missing(s,'retirement').length&&!unknownFor(s,'retirement')){const r=retirementResult(s);if(!r.invalid&&r.gap>0)add('retire','ทบทวนเงินออมเกษียณ',r.years?'ยอดออมเพิ่มต่อเดือนจากที่วางไว้':'เงินก้อนที่ยังขาด ณ ปัจจุบัน',r.years?Math.max(0,r.extraNeeded-s.retirement.monthly):r.gap,'retirement');}
  if(!missing(s,'goals').length&&!unknownFor(s,'goals'))for(const g of goalResults(s))if(g.required>g.monthlyTotal)add('goal-'+g.id,'ทบทวนเป้าหมาย '+g.name,'เงินออมเพิ่มต่อเดือน ไม่บวกกับข้อเสนออื่นโดยอัตโนมัติ',g.required-g.monthlyTotal,'goals');
  if(!out.length)add('review','กำหนดวันทบทวนแผน','ตรวจข้อมูลจริงและความเปลี่ยนแปลงในชีวิตอีกครั้ง',0,'report');
  return out.slice(0,3);
}
export function taskFromSuggestion(suggestion) {return {id:uid(),title:suggestion.title,amount:suggestion.amount,date:'',owner:'',status:'todo'};}
export function snapshot(s,note='') {
  const h=health(s);if(!h.complete||h.unresolved)throw Error('เติมข้อมูลการเงินให้ครบก่อนบันทึกผล');
  return {id:uid(),date:s.profile.asOf,net:h.cf.net,debt:h.cf.debtTotal,reserves:h.cf.reserves,saving:h.saving,remaining:h.cf.remaining,note};
}
export function experiment(s,{expenseId='',reduction=0,extraSaving=0,debtId='',extraPayment=0,retireAge=s.retirement.age}={}) {
  const next=structuredClone(s), expense=next.expenses.find(e=>e.id===expenseId),debt=next.debts.find(d=>d.id===debtId);
  if([reduction,extraSaving,extraPayment,retireAge].some(x=>!Number.isFinite(x)||x<0)||retireAge<s.profile.age||retireAge>=s.retirement.end)throw Error('ตรวจจำนวนเงินและอายุเกษียณ');
  if(reduction>0&&(!expense||expense.frequency!=='monthly'||reduction>expense.amount))throw Error('ยอดลดต้องไม่เกินรายจ่ายรายเดือนที่เลือก');
  if(extraPayment>0&&(!debt||debt.method!=='reducing'))throw Error('เลือกหนี้ลดต้นลดดอกก่อนทดลองโปะ');
  if(expense)expense.amount-=reduction;
  next.retirement.monthly+=extraSaving;next.retirement.age=retireAge;
  if(debt)debt.extra+=extraPayment;
  return {next,before:cashflow(s),after:cashflow(next),retirement:retirementResult(next),debt:debt?debtSchedule(debt):null};
}
