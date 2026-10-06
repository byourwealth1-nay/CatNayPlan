import {factories} from './model.mjs?v=2.6-retire1';
import {meta,fieldKey,answer,unknownFor} from './experience.mjs?v=2.6-retire1';
export const presets={
 salary:{kind:'incomes',label:'เงินเดือน',values:{name:'เงินเดือน',frequency:'monthly',amountMode:'net',taxType:'1',taxSource:'manual'}},
 commission:{kind:'incomes',label:'ค่านายหน้า',values:{name:'ค่านายหน้า',frequency:'monthly',amountMode:'net',taxType:'2',taxSource:'manual'}},
 food:{kind:'expenses',label:'ค่าอาหาร',values:{name:'ค่าอาหาร',frequency:'monthly',essential:true}},
 utilities:{kind:'expenses',label:'ค่าน้ำ / ไฟ / อินเทอร์เน็ต',values:{name:'ค่าน้ำ ไฟ และอินเทอร์เน็ต',frequency:'monthly',essential:true}},
 travel:{kind:'expenses',label:'ค่าเดินทาง',values:{name:'ค่าเดินทาง',frequency:'monthly',essential:true}},
 home:{kind:'debts',label:'ผ่อนบ้าน',values:{name:'สินเชื่อบ้าน',method:'manual'}},
 car:{kind:'debts',label:'ผ่อนรถ',values:{name:'สินเชื่อรถ',method:'manual'}},
 card:{kind:'debts',label:'หนี้บัตรเครดิต',values:{name:'หนี้บัตรเครดิต',method:'manual'}}
};
export function addPreset(s,key){
 const p=presets[key];if(!p)throw Error('ไม่พบรายการที่เลือก');
 const old=s[p.kind].find(r=>r.name===p.values.name);if(old)return {kind:p.kind,id:old.id,existing:true};
 const r=Object.assign(factories[p.kind](),p.values);s[p.kind].push(r);
 const u=meta(s);u.answers[p.kind]='yes';u.visited.finance=true;u.skipped.finance=false;
 for(const field of p.kind==='debts'?['balance','monthly','rate']:['amount'])u.unknown[`${p.kind}.${r.id}.${field}`]=true;
 return {kind:p.kind,id:r.id,existing:false};
}
const labels={incomes:'รายรับ',expenses:'ค่าใช้ชีวิต',debts:'หนี้และค่างวด',policies:'เบี้ยประกัน',assets:'สินทรัพย์',portfolios:'เงินลงทุน',pvd:'PVD',goals:'แผนออมเดิม'};
const keys=[[],['incomes'],['expenses','debts','policies'],['assets','portfolios','pvd','goals']];
const benefits=['เพื่อให้แผนใช้ข้อมูลของคุณถูกต้อง','เพื่อรู้เงินรับที่ใช้จ่ายได้','เพื่อรู้เงินเหลือและภาระผ่อน','เพื่อรู้เงินสำรองและเงินออมที่มีแล้ว'];
export function basicIssues(s){
 const u=meta(s),issues=[];
 const unknown=path=>{const k=fieldKey(s,path),value=path.split('.').reduce((o,k)=>o?.[k],s);return u.unknown[k]||(!u.imported&&!u.known[k])||value==null||value===''||(path==='profile.age'&&value<=0);};
 const push=(step,title,selector)=>issues.push({step,title,selector,benefit:benefits[step]});
 for(const [path,label] of [['profile.name','ชื่อแผน'],['profile.age','อายุปัจจุบัน']])if(unknown(path))push(0,'ระบุ'+label,`[data-bind="${path}"]`);
 for(let step=1;step<4;step++)for(const kind of keys[step]){
  const rows=kind==='pvd'?s.portfolios.filter(r=>r.type==='PVD'):kind==='portfolios'?s.portfolios.filter(r=>r.type!=='PVD'):s[kind];
  const section=`[data-section="${kind}"]`;
  if(!answer(s,kind)){push(step,'ยืนยันว่ามี'+labels[kind]+'หรือไม่',section);continue;}
  if(answer(s,kind)==='yes'&&!rows.length){push(step,'เพิ่มรายการ'+labels[kind],section);continue;}
  for(const r of rows){const list=kind==='pvd'?'portfolios':kind,i=s[list].indexOf(r);
   const fields=['incomes','expenses'].includes(kind)?[['amount','จำนวนเงิน']]:kind==='debts'?[['balance','ยอดหนี้'],['monthly','ค่างวด']]:kind==='policies'?[['premium','เบี้ย']]:kind==='goals'?[['target','เป้าหมายเงินก้อน'],['years','ระยะเวลา'],['monthly','เงินออมต่อเดือน']]:[['value','มูลค่า'],...(['pvd','portfolios'].includes(kind)?[['monthly','เงินออมต่อเดือน']]:[])];
   for(const [field,label]of fields)if(unknown(`${list}.${i}.${field}`))push(step,`${r.name}: เติม${label}`,`[data-bind="${list}.${i}.${field}"]`);
  }
 }
 for(const [key,value]of Object.entries(u.unknown)){
  if(!value||!unknownFor({...s,ux:{...u,unknown:{[key]:true}}},'finance'))continue;
  const [kind,id,field]=key.split('.'),row=Array.isArray(s[kind])?s[kind].find(r=>r.id===id):null;
  const path=row?`${kind}.${s[kind].indexOf(row)}.${field}`:key,selector=`[data-bind="${path}"]`;
  if(issues.some(x=>x.selector===selector))continue;
  const route=path==='retirement.monthly'?'retirement':'finance';
  const step=route==='retirement'?4:kind==='incomes'||kind==='retirement'?1:['expenses','debts','policies'].includes(kind)?2:['assets','portfolios','goals'].includes(kind)?3:0;
  const label={rate:'อัตราดอกเบี้ย',extra:'ยอดโปะเพิ่ม',taxDeduct:'ภาษีที่หักจากรายรับ',socialDeduct:'เงินสมทบประกันสังคม',otherDeduct:'รายการหักอื่น',reserveMonths:'เป้าหมายเงินสำรอง',socialOwnMonthly:'เงินสมทบที่จ่ายเอง',monthly:'เงินออมต่อเดือน',startMonth:'เดือนเริ่มรับ',endMonth:'เดือนสุดท้ายที่รับ'}[field||id]||'ข้อมูลที่ระบุว่ายังไม่ทราบ';
  issues.push({step,route,selector,title:(row?row.name+': ':'')+'ยืนยัน'+label,benefit:benefits[step]||'เพื่อรวมเงินออมในแผนให้ถูกต้อง'});
 }
 for(let i=0;i<s.incomes.length;i++)if(s.incomes[i].endMonth<s.incomes[i].startMonth)push(1,'ตรวจเดือนเริ่มและสิ้นสุดรายรับ',`[data-bind="incomes.${i}.endMonth"]`);
 for(let i=0;i<s.portfolios.length;i++){const r=s.portfolios[i];if(r.payroll&&r.monthly>0&&!s.incomes.some(x=>x.id===r.incomeId&&x.frequency==='monthly'))push(3,r.name+': เลือกเงินเดือนที่หักเงินสะสม',`[data-bind="portfolios.${i}.incomeId"]`);}
 return issues;
}
