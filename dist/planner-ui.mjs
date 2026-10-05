import {money,retirementResult,goalResults,taxResult,uid} from './model.mjs?v=2.6';
import {missing,unknownFor,parseAmount} from './experience.mjs?v=2.6';
import {planning,health,suggestions,taskFromSuggestion,snapshot,experiment} from './planner.mjs?v=2.6';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const button=(action,label,primary=false)=>`<button data-plan-action="${action}" class="${primary?'primary':''}">${label}</button>`;
const metric=(label,value)=>`<div class="plan-metric"><span>${label}</span><strong>${value}</strong></div>`;
const choices={finance:'ภาพรวมการเงิน',debt:'จัดการหนี้',reserve:'เงินฉุกเฉิน',retirement:'เกษียณ',tax:'ภาษี',protection:'ดูแลครอบครัว',goals:'เป้าหมายชีวิต'};
const steps=[['finance','เริ่มจากเรื่องที่สำคัญ','start'],['finance','รู้จักคุณสักนิด','about'],['finance','เงินเข้ามาจากไหน?','income'],['finance','แต่ละเดือนใช้เท่าไร?','expense'],['finance','มีเงินและทรัพย์สินอะไรแล้ว?','assets'],['protection','มีความคุ้มครองอะไรแล้ว?'],['goals','อยากเก็บเงินเพื่ออะไร?'],['retirement','อยากใช้ชีวิตหลังเกษียณแบบไหน?'],['tax','ตรวจข้อมูลภาษี'],['report','แผนเบื้องต้นและสิ่งที่ทำต่อ']];

export function installPlanner(bridge) {
  let mode='guided',index=0,presentation=false,privateView=true,lastContent=null,scenario=null,reportDetails=false;
  try{mode=localStorage.getItem('catnay.interface')||'guided';index=Number(sessionStorage.getItem('catnay.step')||0);if(!Number.isInteger(index)||index<0||index>=steps.length)index=0;}catch{}
  if(!['guided','all'].includes(mode))mode='guided';
  const shell=document.createElement('section');shell.id='planner-shell';shell.className='no-print';$('#content').before(shell);
  const layout=document.createElement('div');layout.className='planner-layout';$('#content').before(layout);layout.append($('#content'));
  const summary=document.createElement('section');summary.id='live-summary';summary.className='no-print';layout.append(summary);
  const tools=document.createElement('section');tools.id='planner-tools';$('#stepNav').before(tools);
  const note=text=>{const undo=$('#toast [data-action="undo"]')?.cloneNode(true);$('#toast').textContent=text;if(undo)$('#toast').append(' ',undo);};
  function commit(fn,rerender=true){bridge.edit(fn,rerender);}
  function go(i){index=Math.max(0,Math.min(steps.length-1,i));if(steps[index][0]==='tax'&&!planning(bridge.get()).focus.includes('tax'))index+=i>0?1:-1;try{sessionStorage.setItem('catnay.step',index);}catch{}if(location.hash.slice(1)!==steps[index][0])location.hash=steps[index][0];else bridge.render();window.scrollTo({top:0,behavior:'smooth'});}
  function renderShell(s,route){
    if(steps[index][0]!==route){const found=steps.findIndex(x=>x[0]===route);if(found>=0)index=found;}
    shell.innerHTML=`${bridge.isDemo()?`<div class="demo-banner"><b>ข้อมูลสมมติสำหรับทดลองใช้งาน</b><span>การแก้ไขในโหมดนี้ไม่บันทึกทับแผนจริง รีเฟรชเพื่อกลับแผนจริงได้</span>${button('exit-demo','กลับแผนของฉัน')}</div>`:''}<div class="mode-bar"><div class="segmented" aria-label="รูปแบบการกรอก"><button data-plan-mode="guided" aria-pressed="${mode==='guided'}">พาฉันกรอกทีละขั้น</button><button data-plan-mode="all" aria-pressed="${mode==='all'}">ดูและแก้ไขทุกหมวด</button></div>${button('present',presentation?'กลับไปแก้ไข':'โหมดนำเสนอ')}</div>${mode==='guided'&&!presentation?`<div class="guided-heading"><span>ขั้น ${index+1} / ${steps.length} · ข้ามและกลับมาเติมได้</span><h2>${steps[index][1]}</h2><progress value="${index+1}" max="${steps.length}" aria-label="ขั้นตอนปัจจุบัน"></progress></div>`:''}${presentation?`<label class="check"><input type="checkbox" id="presentation-private" ${privateView?'checked':''}>ซ่อนชื่อและรายละเอียดส่วนตัว</label>`:''}`;
  }
  function applyLayout(s,route){
    layout.hidden=route==='report'&&!reportDetails;if(route==='report')layout.before(tools);else $('#stepNav').before(tools);
    const content=$('#content'),newContent=content.firstElementChild!==lastContent;lastContent=content.firstElementChild;
    document.body.classList.toggle('guided-mode',mode==='guided');document.body.classList.toggle('presenting',presentation);document.body.classList.toggle('private-view',presentation&&privateView);
    for(const el of content.children)el.classList.remove('guided-hidden');
    const startCard=content.querySelector('[data-bind="profile.occupation"]')?.closest('section');
    if(route==='finance'&&startCard&&!startCard.querySelector('#focus-choices')){
      const p=planning(s),div=document.createElement('div');div.id='focus-choices';div.innerHTML=`<h3>วันนี้อยากเริ่มเรื่องไหน?</h3><p class="help">เลือกได้หลายเรื่อง เพื่อจัดขั้นตอนให้ตรงกับคุณ</p><div class="focus-options">${Object.entries(choices).map(([k,v])=>`<button data-focus="${k}" aria-pressed="${p.focus.includes(k)}">${v}</button>`).join('')}</div><label>เรื่องนี้สำคัญกับคุณเพราะอะไร? <span class="help">ไม่บังคับ</span><textarea id="plan-reason" maxlength="2000" placeholder="เช่น อยากมีเวลาให้ครอบครัวมากขึ้น">${esc(p.reason)}</textarea></label>`;startCard.prepend(div);
    }
    if(mode==='guided'&&route==='finance'){
      const key=steps[index][2], selectors={start:['[data-bind="profile.occupation"]'],about:['[data-bind="profile.age"]'],income:['[data-section="incomes"]','[data-section="pvd"]','[data-bind="retirement.socialScheme"]'],expense:['[data-section="expenses"]','[data-section="debts"]'],assets:['[data-section="assets"]']};
      const shown=new Set((selectors[key]||[]).map(sel=>{let el=content.querySelector(sel);while(el&&el.parentElement!==content)el=el.parentElement;return el;}));
      for(const el of content.children)if(!shown.has(el))el.classList.add('guided-hidden');
    }
    if(newContent&&mode==='guided'){
      for(const el of content.querySelectorAll('details.entry'))if(s.ux?.imported)el.open=false;
      if(route==='retirement'){
        const grid=content.querySelector('[data-bind="retirement.inflation"]')?.closest('.form-grid');
        if(grid){const d=document.createElement('details');d.className='assumptions';d.innerHTML='<summary>ปรับสมมติฐานเงินเฟ้อและผลตอบแทน</summary><div class="form-grid"></div>';grid.after(d);for(const key of ['inflation','rate','postRate','legacy']){const field=content.querySelector(`[data-bind="retirement.${key}"]`)?.closest('label');if(field)d.querySelector('div').append(field);}}
      }
    }
    if(mode==='guided'&&!presentation)$('#stepNav').innerHTML=`${index?button('back','ย้อนกลับ'):'<span></span>'}<span class="step-save">${bridge.isDemo()?'โหมดทดลอง':esc($('#save-status').textContent)}</span><div>${index<steps.length-1?button('skip','ยังไม่ทราบ ข้ามก่อน')+button('next','ถัดไป: '+steps[Math.min(index+1,9)][1],true):button('export','ดาวน์โหลดไฟล์สำรอง',true)}</div>`;
    for(const key of ['age','end']){
      const input=content.querySelector(`[data-bind="retirement.${key}"]`);if(!input)continue;
      const bad=key==='age'?s.retirement.age<s.profile.age:s.retirement.end<=s.retirement.age;
      input.setAttribute('aria-invalid',String(bad));let msg=input.parentElement.querySelector('.field-error');if(bad&&!msg){msg=document.createElement('p');msg.className='field-error';msg.setAttribute('role','alert');input.after(msg);}if(msg){msg.textContent=bad?(key==='age'?'อายุเกษียณต้องไม่ต่ำกว่าอายุปัจจุบัน':'อายุสิ้นสุดแผนต้องมากกว่าอายุเกษียณ'):'';}
    }
  }
  function renderSummary(s,route){
    const h=health(s),cf=h.cf;
    let body=`<h2>ภาพรวมระหว่างกรอก</h2><p class="help">${h.complete?'ข้อมูลการเงินจำเป็นครบ':'ผลเบื้องต้นเฉพาะข้อมูลที่กรอก'} · บาท</p>`;
    if(h.unresolved)body+='<p class="callout warn">มีจำนวนเงินที่ยังไม่ทราบ กรุณายืนยันก่อนใช้ยอดรวม</p>';
    else body+=metric('เงินเหลือก่อนจัดสรรออม / เดือน',money(cf.free))+metric('จัดสรรออมนอกสลิป / เดือน',money(cf.savingMonthly))+metric('เงินเหลือหลังจัดสรร / เดือน',money(cf.remaining))+`<p class="help">เป็นค่าเฉลี่ยทั้งปี รวมโบนัสและรายจ่ายรายปี เงินออมผ่านสลิปถูกหักในรายรับแล้ว</p>`;
    if(route==='retirement'&&!missing(s,'retirement').length&&!unknownFor(s,'retirement')){const r=retirementResult(s);if(!r.invalid)body+=`<hr>${metric('อยากใช้ / เดือน ในมูลค่าวันนี้',money(s.retirement.expense))}${metric('เทียบเท่า / เดือน ณ วันเกษียณ',money(r.firstExpense))}${metric('ต้องออมเพิ่มจากแผน / เดือน',r.years?money(Math.max(0,r.extraNeeded-s.retirement.monthly)):'เกษียณแล้ว — ดูเงินก้อนในผลลัพธ์')}`;}
    const next=suggestions(s)[0];body+=`<div class="next-action"><b>เรื่องถัดไป</b><p>${esc(next.title)}</p><small>${esc(next.why)}</small><a href="#${next.route}">ดูและแก้ไขข้อมูล</a></div>`;summary.innerHTML=`<details class="mobile-summary" ${window.innerWidth>960?'open':''}><summary>${h.unresolved?'ข้อมูลยังไม่ครบ':'เงินเหลือเฉลี่ย '+money(cf.remaining)+' บาท/เดือน'} · ดูสรุป</summary>${body}</details>`;
  }
  function reportTools(s){
    const h=health(s),cf=h.cf,p=planning(s),suggested=suggestions(s);
    const metrics=h.unresolved?'<p>ยังมีจำนวนเงินที่ไม่ทราบ</p>':`<div class="plan-metrics">${metric('ความมั่งคั่งสุทธิ',money(cf.net)+' บาท')}${metric('เงินสำรองครอบคลุม',h.runway===null?'ยังคำนวณไม่ได้':h.runway.toFixed(1)+' เดือน')}${metric('เงินเหลือหลังจัดสรร',money(cf.remaining)+' บาท/เดือน')}</div><details><summary>ดูองค์ประกอบและวิธีคำนวณ</summary><p>เงินสดและเงินฝาก ${money(h.liquid)} · พอร์ตลงทุน ${money(h.invested)} · ทรัพย์สินใช้ส่วนตัว/อื่น ${money(h.personal)} บาท</p><p>เงินสำรอง ÷ ค่าใช้จ่ายจำเป็นรวมค่างวดและเบี้ยเฉลี่ย ไม่รวมบ้านและรถเป็นเงินพร้อมใช้</p><p>ภาระผ่อน ${h.debtRatio===null?'—':(h.debtRatio*100).toFixed(1)+'%'} · เงินออม ${h.savingRatio===null?'—':(h.savingRatio*100).toFixed(1)+'%'} ของเงินรับหลังรายการหัก โดยบวกเงินออมผ่านสลิปกลับในฐานเท่านั้น เงินออมไม่รวมส่วนนายจ้าง</p><p>อัตราส่วนใช้เพื่ออธิบายแผน ไม่มีคะแนนตัดสินหรือเกณฑ์ผ่านตายตัว</p></details>`;
    return `<div class="page-heading"><div><div class="eyebrow">YOUR FINANCIAL PLAN</div><h1>แผนการเงินและสิ่งที่จะทำต่อ</h1><p class="sub">สถานะวันนี้ · เป้าหมายของคุณ · ขั้นตอนถัดไป</p></div></div><div class="no-print">${button('report-details',reportDetails?'ซ่อนรายงานรายละเอียด':'เปิดรายงานรายละเอียดทุกหมวด')}</div><section class="card"><h2>ตอนนี้เป็นอย่างไร?</h2><p class="help">${h.complete?'ข้อมูลการเงินจำเป็นครบ':'ผลเบื้องต้น ยังมีข้อมูลต้องเติม'} · ณ ${esc(s.profile.asOf)}</p>${metrics}</section><section class="card"><h2>เลือกสิ่งที่จะเริ่มทำ</h2><p class="help">ข้อเสนอแต่ละข้อยังไม่เปลี่ยนยอดเงินในแผน เลือกและตรวจงบก่อนลงมือทำ</p>${suggested.map((x,i)=>`<div class="suggestion"><div><h3>${esc(x.title)}</h3><p>${esc(x.why)}${x.amount?' · '+money(x.amount)+' บาท':''}</p></div><button data-accept="${i}" class="no-print">เพิ่มในรายการลงมือทำ</button></div>`).join('')}</section><section class="card"><h2>แผนลงมือทำของฉัน</h2><div id="task-list">${p.tasks.map(t=>`<div class="task" data-task="${esc(t.id)}"><div class="task-presentation"><h3>${esc(t.title)}</h3><p>${money(t.amount)} บาท · ${esc(t.date||'ยังไม่กำหนดวัน')} · ${esc({todo:'ยังไม่เริ่ม',doing:'กำลังทำ',done:'ทำแล้ว'}[t.status])}</p></div><label>สิ่งที่จะทำ<input data-task-field="title" value="${esc(t.title)}" maxlength="2000"></label><div class="form-grid"><label>จำนวนเงินที่เกี่ยวข้อง (บาท)<input data-task-field="amount" inputmode="decimal" value="${t.amount}"></label><label>ผู้รับผิดชอบ<input data-task-field="owner" value="${esc(t.owner)}" maxlength="160"></label><label>วันที่ตั้งใจทำ<input type="date" data-task-field="date" value="${esc(t.date)}"></label><label>สถานะ<select data-task-field="status">${Object.entries({todo:'ยังไม่เริ่ม',doing:'กำลังทำ',done:'ทำแล้ว'}).map(([k,v])=>`<option value="${k}" ${t.status===k?'selected':''}>${v}</option>`).join('')}</select></label></div><button data-delete-task="${esc(t.id)}" class="danger no-print">ลบรายการนี้</button></div>`).join('')||'<p>ยังไม่มีรายการ เลือกข้อเสนอด้านบนหรือเพิ่มเองได้</p>'}</div>${button('add-task','เพิ่มสิ่งที่จะทำ')}</section><section class="card"><h2>ติดตามผลตามวันที่ประเมิน</h2><p>ปรับข้อมูลจริงและวันที่ประเมินก่อนบันทึก แต่ละบันทึกเป็นภาพสถานะ ณ วันนั้น ไม่ใช่ผลตอบแทนลงทุน</p><label class="no-print">บันทึกสิ่งที่เปลี่ยนไป<textarea id="snapshot-note" maxlength="2000"></textarea></label>${button('snapshot','บันทึกสถานะ ณ วันที่ประเมิน')}<div class="table-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>สินทรัพย์สุทธิ</th><th>หนี้</th><th>เงินสำรอง</th><th>ออม/เดือน</th><th>หมายเหตุ</th></tr></thead><tbody>${p.history.map(x=>`<tr><td>${esc(x.date)}</td><td class="num">${money(x.net)}</td><td class="num">${money(x.debt)}</td><td class="num">${money(x.reserves)}</td><td class="num">${money(x.saving)}</td><td>${esc(x.note)}</td></tr>`).join('')}</tbody></table></div>${p.history.length>=2?`<p>เทียบสองบันทึกล่าสุด: หนี้เปลี่ยน ${money(p.history.at(-1).debt-p.history.at(-2).debt)} บาท · เงินสำรองเปลี่ยน ${money(p.history.at(-1).reserves-p.history.at(-2).reserves)} บาท</p>`:''}</section>`;
  }
  function scenarioForm(s){return `<section class="card no-print"><h2>ถ้าปรับแผน จะเปลี่ยนเท่าไร?</h2><p class="help">ทดลองจากแผนปัจจุบัน ผลจะยังไม่ถูกนำไปบันทึกจนกดยืนยันใช้</p><div class="form-grid"><label>รายจ่ายรายเดือนที่จะลด<select id="sim-expense"><option value="">ไม่ปรับ</option>${s.expenses.filter(e=>e.frequency==='monthly').map(e=>`<option value="${esc(e.id)}">${esc(e.name)} · ${money(e.amount)} บาท</option>`).join('')}</select></label><label>ลดลง (บาท/เดือน)<input id="sim-reduction" value="0" inputmode="decimal"></label><label>เพิ่มออมเกษียณ (บาท/เดือน)<input id="sim-saving" value="0" inputmode="decimal"></label><label>หนี้ที่จะโปะ<select id="sim-debt"><option value="">ไม่ปรับ</option>${s.debts.filter(d=>d.method==='reducing').map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label><label>โปะเพิ่ม (บาท/เดือน)<input id="sim-payment" value="0" inputmode="decimal"></label><label>อายุเกษียณทดลอง (ปี)<input id="sim-age" type="number" min="${s.profile.age}" max="${s.retirement.end-1}" value="${s.retirement.age}"></label></div>${button('simulate','ดูผลเปรียบเทียบ',true)}<div id="simulation-result" aria-live="polite"></div></section>`;}
  function refresh(){
    const s=bridge.get(),route=location.hash.slice(1)||'finance';renderShell(s,route);applyLayout(s,route);renderSummary(s,route);
    const alerts=$('#alerts');if(mode==='guided'&&alerts.innerHTML&&!alerts.querySelector('.guided-alerts')){const d=document.createElement('details');d.className='guided-alerts';d.innerHTML='<summary>มีข้อมูลที่ควรตรวจทาน · แตะเพื่อดูรายละเอียด</summary>';while(alerts.firstChild)d.append(alerts.firstChild);alerts.append(d);}
    if(tools.dataset.route!==route||tools.dataset.revision!==String(bridge.revision())){const focused=tools.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea');if(!focused){tools.innerHTML=(route==='report'?reportTools(s):'')+(['finance','retirement','report'].includes(route)?scenarioForm(s):'');tools.dataset.route=route;tools.dataset.revision=String(bridge.revision());scenario=null;}}
    if(presentation&&route!=='report'){location.hash='report';return;}
  }
  document.addEventListener('fp-update',refresh);
  document.addEventListener('change',e=>{
    if(e.target.id==='presentation-private'){privateView=e.target.checked;refresh();}
    const field=e.target.dataset.taskField,entry=e.target.closest('[data-task]');
    if(field&&entry){let value=e.target.value;try{if(field==='amount')value=parseAmount(value)??0;commit(s=>{const t=planning(s).tasks.find(x=>x.id===entry.dataset.task);if(t)t[field]=value;},false);note('บันทึกรายการลงมือทำแล้ว');}catch(err){note(err.message);}}
    if(e.target.id==='plan-reason')commit(s=>{planning(s).reason=e.target.value;},false);
  });
  document.addEventListener('click',e=>{
    const link=e.target.closest('a.linked');if(link?.getAttribute('href')==='#finance'&&mode==='guided'){e.preventDefault();go(2);return;}
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.planMode){mode=b.dataset.planMode;try{localStorage.setItem('catnay.interface',mode);}catch{}bridge.render();return;}
    if(b.dataset.focus){const key=b.dataset.focus;commit(s=>{const p=planning(s);p.focus=p.focus.includes(key)?p.focus.filter(x=>x!==key):[...p.focus,key];});return;}
    if(b.dataset.accept!==undefined){const suggestion=suggestions(bridge.get())[Number(b.dataset.accept)];if(suggestion)commit(s=>{const p=planning(s);if(p.tasks.length>=100)throw Error('รายการลงมือทำเต็มแล้ว');p.tasks.push(taskFromSuggestion(suggestion));});return;}
    if(b.dataset.deleteTask){commit(s=>{planning(s).tasks=planning(s).tasks.filter(t=>t.id!==b.dataset.deleteTask);});note('ลบแล้ว ใช้ปุ่มเลิกทำเพื่อคืนรายการ');return;}
    const a=b.dataset.planAction;if(!a)return;
    try{
      if(a==='report-details'){reportDetails=!reportDetails;tools.dataset.revision='';refresh();if(reportDetails)layout.scrollIntoView({behavior:'smooth'});}
      if(a==='next'||a==='skip')go(index+1);
      if(a==='back')go(index-1);
      if(a==='exit-demo'){bridge.endDemo();refresh();}
      if(a==='export')document.querySelector('[data-action="export"]').click();
      if(a==='present'){presentation=!presentation;if(presentation)location.hash='report';bridge.render();}
      if(a==='add-task')commit(s=>{if(planning(s).tasks.length>=100)throw Error('รายการลงมือทำเต็มแล้ว');planning(s).tasks.push({id:uid(),title:'สิ่งที่จะทำ',amount:0,owner:'',date:'',status:'todo'});});
      if(a==='snapshot'){const noteValue=$('#snapshot-note').value;commit(s=>{const p=planning(s);if(p.history.length>=120)throw Error('เก็บประวัติได้สูงสุด 120 ครั้ง');p.history.push(snapshot(s,noteValue));});}
      if(a==='simulate'){
        const s=bridge.get();if(!health(s).complete||unknownFor(s,'finance')||missing(s,'retirement').length||unknownFor(s,'retirement'))throw Error('เติมข้อมูลการเงินและเกษียณให้ครบก่อนเปรียบเทียบแผน');
        const number=id=>{const value=parseAmount($(id).value);if(value===null)throw Error('กรอกจำนวนเงินทดลอง หรือ 0 หากไม่ปรับ');return value;};
        const params={expenseId:$('#sim-expense').value,reduction:number('#sim-reduction'),extraSaving:number('#sim-saving'),debtId:$('#sim-debt').value,extraPayment:number('#sim-payment'),retireAge:number('#sim-age')};
        const r=experiment(s,params);scenario={params,base:JSON.stringify(s)};
        $('#simulation-result').innerHTML=`<div class="plan-metrics">${metric('เงินเหลือเดิม / เดือน',money(r.before.remaining))}${metric('เงินเหลือหลังทดลอง / เดือน',money(r.after.remaining))}${metric('เงินเกษียณที่ยังขาด',money(r.retirement.gap))}</div>${r.after.remaining<0?'<p class="callout warn">กระแสเงินสดยังไม่รองรับแผนนี้ โปรดปรับยอดก่อนใช้จริง</p>':''}${r.debt?`<p>หนี้ที่เลือก: ${r.debt.unpayable?'ค่างวดยังไม่พอปิดหนี้':r.debt.months+' เดือน · ดอกเบี้ยรวม '+money(r.debt.interestTotal)+' บาท'}</p>`:''}${button('apply-simulation','ยืนยันใช้ค่าที่ทดลอง')}`;
      }
      if(a==='apply-simulation'){if(!scenario||JSON.stringify(bridge.get())!==scenario.base)throw Error('ข้อมูลแผนเปลี่ยนแล้ว กรุณาคำนวณการทดลองใหม่');const {params}=scenario;commit(s=>Object.assign(s,experiment(s,params).next));note('ใช้ค่าทดลองแล้ว สามารถเลิกทำได้');}
    }catch(err){note(err.message);}
  });
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.action==='demo'){e.preventDefault();e.stopImmediatePropagation();bridge.beginDemo();refresh();}else if(bridge.isDemo()&&['new','import','clear-storage'].includes(b?.dataset.action)){e.preventDefault();e.stopImmediatePropagation();note('กลับแผนของฉันก่อนใช้คำสั่งนี้');}},true);
  refresh();
}
