import {money,retirementResult,goalResults,taxResult,uid} from './model.mjs?v=2.6-flow1';
import {missing,unknownFor,parseAmount,answer,fieldKey} from './experience.mjs?v=2.6-flow1';
import {planning,health,suggestions,taskFromSuggestion,snapshot,experiment} from './planner.mjs?v=2.6-flow1';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const markup=(el,html)=>{if(el.dataset.markup!==html){el.innerHTML=html;el.dataset.markup=html;}};
const button=(action,label,primary=false)=>`<button data-plan-action="${action}" class="${primary?'primary':''}">${label}</button>`;
const metric=(label,value)=>`<div class="plan-metric"><span>${label}</span><strong>${value}</strong></div>`;
const choices={finance:'ภาพรวมการเงิน',debt:'จัดการหนี้',reserve:'เงินฉุกเฉิน',retirement:'เกษียณ',tax:'ภาษี',protection:'ดูแลครอบครัว',goals:'เป้าหมายชีวิต'};
const steps=[['finance','รู้จักคุณ','about'],['finance','เงินเข้าของคุณ','income'],['finance','เงินออกของคุณ','expense'],['finance','เงินที่คุณมี','assets'],['report','ภาพรวมของคุณ','report']];
const topics={retirement:'วางแผนเกษียณ',protection:'ดูแลครอบครัว',goals:'วางแผนเป้าหมาย',tax:'ตรวจแผนภาษี'};
const groups={about:[],income:['incomes'],expense:['expenses','debts','policies'],assets:['assets','portfolios','pvd','goals']};
const hints=['ใช้ชื่อเล่นได้ เลือกเรื่องที่สนใจ แล้วเริ่มจากภาพรวมการเงินก่อน','เริ่มจากเงินที่ได้รับจริง โบนัสแยกเป็นรายปีได้','ค่าใช้ชีวิต ค่างวด และเบี้ยประกัน แยกกันเพื่อไม่ให้คิดซ้ำ','เงินฝาก เงินลงทุน และแผนออมเดิม กรอกแต่ละก้อนเพียงครั้งเดียว','ดูสถานะวันนี้ แล้วเลือกเรื่องที่อยากวางแผนต่อ'];

export function installPlanner(bridge) {
  let mode='guided',index=0,presentation=false,privateView=true,lastContent=null,scenario=null,reportDetails=false;
  try{mode=localStorage.getItem('catnay.interface')||'guided';index=Number(sessionStorage.getItem('catnay.flow.step')||0);if(!Number.isInteger(index)||index<0||index>=steps.length)index=0;}catch{}
  if(!['guided','all'].includes(mode))mode='guided';
  const shell=document.createElement('section');shell.id='planner-shell';shell.className='no-print';$('#content').before(shell);
  const layout=document.createElement('div');layout.className='planner-layout';$('#content').before(layout);layout.append($('#content'));
  const summary=document.createElement('section');summary.id='live-summary';summary.className='no-print';layout.append(summary);
  const tools=document.createElement('section');tools.id='planner-tools';$('#stepNav').before(tools);
  $('#stepNav').before($('#alerts'));
  const note=text=>{const undo=$('#toast [data-action="undo"]')?.cloneNode(true);$('#toast').textContent=text;if(undo)$('#toast').append(' ',undo);};
  function commit(fn,rerender=true){bridge.edit(fn,rerender);}
  function go(i){
    index=Math.max(0,Math.min(steps.length-1,i));
    try{sessionStorage.setItem('catnay.flow.step',index);}catch{}
    if(location.hash.slice(1)!==steps[index][0])location.hash=steps[index][0];else bridge.render();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderShell(s,route){
    if(route==='report')index=4;
    const topic=topics[route],p=planning(s);
    markup(shell,`${bridge.isDemo()?`<div class="demo-banner"><b>กำลังทดลองข้อมูลตัวอย่าง</b><span>ข้อมูลจริงของคุณยังอยู่ครบ</span>${button('exit-demo','กลับแผนของฉัน')}</div>`:''}${mode==='guided'?`<div class="flow-progress" aria-label="ขั้นตอนกรอก">${steps.map((x,i)=>`<button data-flow-step="${i}" ${!topic&&index===i?'aria-current="step"':''}><span>${i+1}</span>${['รู้จักคุณ','เงินเข้า','เงินออก','เงินที่มี','สรุป'][i]}</button>`).join('')}</div>${topic?button('overview','กลับภาพรวมของฉัน'):''}<div class="guided-heading"><span>${topic?'วางแผนเพิ่มเติม':`ขั้น ${index+1} จาก 5 · บันทึกอัตโนมัติ`}</span><h1>${topic||steps[index][1]}</h1><p>${topic?'ใช้ข้อมูลเดิมของคุณต่อ ไม่ต้องเริ่มกรอกใหม่':hints[index]}</p></div>`:`<div class="mode-bar">${button('guided','กลับไปกรอกทีละขั้น')}</div>`}${route==='report'?button('present',presentation?'กลับไปแก้ไข':'นำเสนอแผน'):''}${presentation?`<label class="check"><input type="checkbox" id="presentation-private" ${privateView?'checked':''}>ซ่อนชื่อและรายละเอียดส่วนตัว</label>`:''}`);
  }
  const disclosureState=new Map();
  function rememberDisclosure(d,key){d.dataset.flowDisclosure=key;d.open=disclosureState.get(key)||false;}
  document.addEventListener('toggle',e=>{if(e.target.dataset?.flowDisclosure)disclosureState.set(e.target.dataset.flowDisclosure,e.target.open);},true);
  function advanced(root,selectors,title){
    const fields=selectors.flatMap(sel=>Array.from(root.querySelectorAll(sel))).map(el=>el.closest('label')).filter(Boolean);
    if(!fields.length)return;
    const d=document.createElement('details');d.className='flow-advanced';d.innerHTML=`<summary>${title}</summary><div class="form-grid"></div>`;
    rememberDisclosure(d,(root.dataset.entry||title)+'|'+title);root.append(d);for(const field of new Set(fields))d.lastElementChild.append(field);
  }
  function applyLayout(s,route){
    layout.hidden=route==='report'&&!reportDetails;if(route==='report')layout.before(tools);else $('#stepNav').before(tools);
    const content=$('#content'),newContent=content.firstElementChild!==lastContent;lastContent=content.firstElementChild;if(newContent)delete $('#stepNav').dataset.markup;
    document.body.classList.toggle('guided-mode',mode==='guided');document.body.classList.toggle('presenting',presentation);document.body.classList.toggle('private-view',presentation&&privateView);
    const extra=content.querySelector('.guided-extra');if(extra&&mode==='guided')extra.replaceWith(...extra.children);
    for(const el of content.children)el.classList.remove('guided-hidden');
    const startCard=content.querySelector('[data-bind="profile.occupation"]')?.closest('section');
    if(startCard&&!startCard.querySelector('#focus-choices')){
      startCard.querySelector('[data-bind="profile.focus"]')?.closest('label')?.remove();startCard.querySelector('[data-page]')?.remove();
      const p=planning(s),div=document.createElement('div');div.id='focus-choices';div.innerHTML=`<h3>อยากวางแผนเรื่องไหน?</h3><p class="help">เลือกไว้ก่อนได้ หลังเห็นภาพรวมจะมีทางลัดไปเรื่องที่คุณสนใจ</p><div class="focus-options">${Object.entries(choices).map(([k,v])=>`<button data-focus="${k}" aria-pressed="${p.focus.includes(k)}">${v}</button>`).join('')}</div><details><summary>เพิ่มเหตุผลหรือสิ่งที่กังวล (ไม่บังคับ)</summary><textarea id="plan-reason" maxlength="2000" aria-label="เรื่องที่อยากวางแผน">${esc(p.reason)}</textarea></details>`;startCard.append(div);
    }
    if(mode==='guided'&&route==='finance'){
      const selectors={about:['[data-bind="profile.occupation"]','[data-bind="profile.age"]'],income:['[data-section="incomes"]','[data-bind="retirement.socialScheme"]'],expense:['[data-section="expenses"]','[data-section="debts"]','[data-section="policies"]'],assets:['[data-section="assets"]','[data-section="portfolios"]','[data-section="pvd"]','[data-section="goals"]']};
      const shown=new Set((selectors[steps[index]?.[2]]||selectors.about).map(sel=>{let el=content.querySelector(sel);while(el&&el.parentElement!==content)el=el.parentElement;return el;}));
      for(const el of content.children)if(!shown.has(el))el.classList.add('guided-hidden');
      // The non-employee wrapper holds both PVD and social insurance; split it into independent cards.
      const wrapper=content.querySelector('[data-section="pvd"]')?.closest('details:not(.entry)');
      if(wrapper&&wrapper.parentElement===content){const cards=[...wrapper.children].filter(el=>el.tagName==='SECTION');for(const card of cards){card.classList.toggle('guided-hidden',card.querySelector('[data-section="pvd"]')?index!==3:index!==1);wrapper.before(card);}wrapper.remove();}
      if(newContent){
        for(const card of content.querySelectorAll('section.card')){const sub=card.querySelector('.card-head .sub');if(!sub)continue;if(card.querySelector('[data-section="assets"]'))sub.textContent='เงินฝาก บ้าน รถ และทรัพย์สินอื่น ไม่รวมเงินลงทุนและ PVD ที่กรอกแยก';if(card.querySelector('[data-section="debts"]'))sub.textContent='กรอกยอดที่ยังเป็นหนี้และค่างวด ระบบนำค่างวดไปรวมเงินออกให้';}
        const about=content.querySelector('[data-bind="profile.age"]')?.closest('section');
        if(about){advanced(about,['[data-bind="profile.asOf"]','[data-bind="profile.dependents"]','[data-bind="profile.marital"]','[data-bind="profile.reserveMonths"]'],'ข้อมูลครอบครัวและวันที่ประเมิน');if(startCard)startCard.before(about);}
        for(const entry of content.querySelectorAll('details.entry')){
          const binding=entry.querySelector('[data-bind]')?.dataset.bind||'',kind=binding.split('.')[0],i=Number(binding.split('.')[1]),r=s[kind]?.[i];
          let keys=[];
          if(kind==='incomes')keys=['startMonth','endMonth',...(r.amountMode==='net'?['socialDeduct','taxDeduct','otherDeduct']:[])];
          if(kind==='debts')keys=['homeInterest','end'];
          if(kind==='policies')keys=['number','company','insuredName','due','start','end','payEnd','beneficiary'];
          if(kind==='portfolios')keys=['cost','start','taxPaid','taxAuto','notes'];
          advanced(entry,keys.map(k=>`[data-bind="${kind}.${i}.${k}"]`),'รายละเอียดเพิ่มเติม / ข้อมูลตามเอกสาร');
        }
        const social=content.querySelector('[data-bind="retirement.socialScheme"]')?.closest('section');
        if(social){const d=document.createElement('details');d.className='flow-advanced';d.innerHTML='<summary>ประกันสังคม / เงินสมทบที่จ่ายเอง</summary>';rememberDisclosure(d,'social');social.before(d);d.append(social);d.classList.toggle('guided-hidden',index!==1);}
      }
    }
    if(mode==='guided'&&route!=='finance'&&route!=='report'){
      content.querySelector('.page-heading')?.classList.add('guided-hidden');content.querySelector('.compact-review')?.classList.add('guided-hidden');
    }
    if(newContent&&mode==='guided'&&route==='retirement'){
      const grid=content.querySelector('[data-bind="retirement.inflation"]')?.closest('section');if(grid)advanced(grid,['inflation','rate','postRate','legacy'].map(k=>`[data-bind="retirement.${k}"]`),'สมมติฐานเงินเฟ้อและผลตอบแทน');
    }
    if(mode==='guided'&&!presentation)markup($('#stepNav'),topics[route]?button('overview','กลับภาพรวมของฉัน',true):`${index?button('back','ย้อนกลับ'):'<span></span>'}<div>${index<4?button('skip','พักขั้นนี้ไว้ก่อน')+button('next',index===3?'ดูภาพรวมของฉัน':'ถัดไป: '+steps[index+1][1],true):button('export','ดาวน์โหลดไฟล์สำรอง')}</div>`);
    for(const key of ['age','end']){
      const input=content.querySelector(`[data-bind="retirement.${key}"]`);if(!input)continue;
      const bad=key==='age'?s.retirement.age<s.profile.age:s.retirement.end<=s.retirement.age;
      input.setAttribute('aria-invalid',String(bad));let msg=input.parentElement.querySelector('.field-error');if(bad&&!msg){msg=document.createElement('p');msg.className='field-error';msg.setAttribute('role','alert');input.after(msg);}if(msg)msg.textContent=bad?(key==='age'?'อายุเกษียณต้องไม่ต่ำกว่าอายุปัจจุบัน':'อายุสิ้นสุดแผนต้องมากกว่าอายุเกษียณ'):'';
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
  function overviewLinks(s){
    const deferred=planning(s).deferred||[],u=s.ux||{};
    const issues=[];
    for(let i=0;i<4;i++){
      const key=steps[i][2],sections=groups[key],unanswered=sections.some(k=>!answer(s,k));
      const fields=i===0?['profile.name','profile.age']:sections.flatMap(k=>{const list=k==='pvd'?s.portfolios.filter(r=>r.type==='PVD'):k==='portfolios'?s.portfolios.filter(r=>r.type!=='PVD'):s[k]||[];return list.flatMap(r=>{const kind=k==='pvd'?'portfolios':k,j=s[kind].indexOf(r);return (['incomes','expenses'].includes(k)?['amount']:k==='debts'?['balance','monthly']:k==='policies'?['premium']:k==='goals'?['target','years','monthly']:['value',...(['pvd','portfolios'].includes(k)?['monthly']:[])]).map(f=>`${kind}.${j}.${f}`);});});
      const incomplete=fields.some(path=>{const key=fieldKey(s,path);return u.unknown?.[key]||(!u.imported&&!u.known?.[key]);});
      const empty=sections.some(k=>answer(s,k)==='yes'&&!(k==='pvd'?s.portfolios.some(r=>r.type==='PVD'):s[k]?.length));
      if(deferred.includes(key)||unanswered||incomplete||empty)issues.push(`<button data-flow-step="${i}">${steps[i][1]} · ${deferred.includes(key)?'พักไว้':'ยังต้องเติม / ยืนยัน'}</button>`);
    }
    return `${issues.length?`<section class="card pending-steps"><h2>กลับมาเติมเมื่อพร้อม</h2><p>ผลด้านล่างยังเป็นเบื้องต้น ข้อมูลที่ยังไม่ทราบไม่ได้แปลว่าไม่มี</p><div class="topic-links">${issues.join('')}</div></section>`:''}<section class="card"><h2>ข้อมูลของฉัน</h2><div class="topic-links">${steps.slice(0,4).map((x,i)=>`<button data-flow-step="${i}">${['ข้อมูลส่วนตัว','รายได้','รายจ่ายและหนี้','สินทรัพย์และเงินออม'][i]}</button>`).join('')}</div></section><section class="card"><h2>อยากวางแผนเรื่องไหนต่อ?</h2><p class="help">ใช้ข้อมูลที่กรอกแล้วต่อได้ เลือกเฉพาะเรื่องที่ต้องการ</p><div class="topic-links">${Object.entries(topics).sort(([a],[b])=>Number(planning(s).focus.includes(b))-Number(planning(s).focus.includes(a))).map(([k,v])=>`<button data-open-topic="${k}">${v}${planning(s).focus.includes(k)?' · ที่คุณสนใจ':''}</button>`).join('')}</div></section>`;
  }
  function reportTools(s){
    const h=health(s),cf=h.cf,p=planning(s),suggested=suggestions(s);
    const metrics=h.unresolved?'<p>ยังมีจำนวนเงินที่ไม่ทราบ</p>':`<div class="plan-metrics">${metric('ความมั่งคั่งสุทธิ',money(cf.net)+' บาท')}${metric('เงินสำรองครอบคลุม',h.runway===null?'ยังคำนวณไม่ได้':h.runway.toFixed(1)+' เดือน')}${metric('เงินเหลือเฉลี่ยหลังออม',money(cf.remaining)+' บาท/เดือน')}</div><details><summary>ดูองค์ประกอบและวิธีคำนวณ</summary><p>เงินสดและเงินฝาก ${money(h.liquid)} · พอร์ตลงทุน ${money(h.invested)} · ทรัพย์สินใช้ส่วนตัว/อื่น ${money(h.personal)} บาท</p><p>เงินสำรอง ÷ ค่าใช้จ่ายจำเป็นรวมค่างวดและเบี้ยเฉลี่ย ไม่รวมบ้านและรถเป็นเงินพร้อมใช้</p><p>ภาระผ่อน ${h.debtRatio===null?'—':(h.debtRatio*100).toFixed(1)+'%'} · เงินออม ${h.savingRatio===null?'—':(h.savingRatio*100).toFixed(1)+'%'} ของเงินรับหลังรายการหัก โดยบวกเงินออมผ่านสลิปกลับในฐานเท่านั้น เงินออมไม่รวมส่วนนายจ้าง</p><p>อัตราส่วนใช้เพื่ออธิบายแผน ไม่มีคะแนนตัดสินหรือเกณฑ์ผ่านตายตัว</p></details>`;
    return `<div class="page-heading"><div><div class="eyebrow">YOUR FINANCIAL PLAN</div><h1>แผนการเงินและสิ่งที่จะทำต่อ</h1><p class="sub">สถานะวันนี้ · เป้าหมายของคุณ · ขั้นตอนถัดไป</p></div></div><div class="no-print">${button('report-details',reportDetails?'ซ่อนรายงานรายละเอียด':'เปิดรายงานรายละเอียดทุกหมวด')}</div><section class="card" id="overview-metrics"><h2>ตอนนี้เป็นอย่างไร?</h2><p class="help">${h.complete?'ข้อมูลการเงินจำเป็นครบ':'ผลเบื้องต้น ยังมีข้อมูลต้องเติม'} · ณ ${esc(s.profile.asOf)}</p>${metrics}<p class="help">เงินเหลือเป็นค่าเฉลี่ยทั้งปี รวมโบนัสและรายจ่ายรายปี ไม่ใช่ยอดเงินในบัญชีเดือนนี้</p></section>${overviewLinks(s)}<section class="card"><h2>เลือกสิ่งที่จะเริ่มทำ</h2><p class="help">ข้อเสนอแต่ละข้อยังไม่เปลี่ยนยอดเงินในแผน เลือกและตรวจงบก่อนลงมือทำ</p>${suggested.map((x,i)=>`<div class="suggestion"><div><h3>${esc(x.title)}</h3><p>${esc(x.why)}${x.amount?' · '+money(x.amount)+' บาท':''}</p></div><button data-accept="${i}" class="no-print">เพิ่มในรายการลงมือทำ</button></div>`).join('')}</section><section class="card" id="action-items"><h2>แผนลงมือทำของฉัน</h2><div id="task-list">${p.tasks.map(t=>`<div class="task" data-task="${esc(t.id)}"><div class="task-presentation"><h3>${esc(t.title)}</h3><p>${money(t.amount)} บาท · ${esc(t.date||'ยังไม่กำหนดวัน')} · ${esc({todo:'ยังไม่เริ่ม',doing:'กำลังทำ',done:'ทำแล้ว'}[t.status])}</p></div><label>สิ่งที่จะทำ<input data-task-field="title" value="${esc(t.title)}" maxlength="2000"></label><div class="form-grid"><label>จำนวนเงินที่เกี่ยวข้อง (บาท)<input data-task-field="amount" inputmode="decimal" value="${t.amount}"></label><label>ผู้รับผิดชอบ<input data-task-field="owner" value="${esc(t.owner)}" maxlength="160"></label><label>วันที่ตั้งใจทำ<input type="date" data-task-field="date" value="${esc(t.date)}"></label><label>สถานะ<select data-task-field="status">${Object.entries({todo:'ยังไม่เริ่ม',doing:'กำลังทำ',done:'ทำแล้ว'}).map(([k,v])=>`<option value="${k}" ${t.status===k?'selected':''}>${v}</option>`).join('')}</select></label></div><button data-delete-task="${esc(t.id)}" class="danger no-print">ลบรายการนี้</button></div>`).join('')||'<p>ยังไม่มีรายการ เลือกข้อเสนอด้านบนหรือเพิ่มเองได้</p>'}</div>${button('add-task','เพิ่มสิ่งที่จะทำ')}</section><section class="card"><h2>ติดตามผลตามวันที่ประเมิน</h2><p>ปรับข้อมูลจริงและวันที่ประเมินก่อนบันทึก แต่ละบันทึกเป็นภาพสถานะ ณ วันนั้น ไม่ใช่ผลตอบแทนลงทุน</p><label class="no-print">บันทึกสิ่งที่เปลี่ยนไป<textarea id="snapshot-note" maxlength="2000"></textarea></label>${button('snapshot','บันทึกสถานะ ณ วันที่ประเมิน')}<div class="table-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>สินทรัพย์สุทธิ</th><th>หนี้</th><th>เงินสำรอง</th><th>ออม/เดือน</th><th>หมายเหตุ</th></tr></thead><tbody>${p.history.map(x=>`<tr><td>${esc(x.date)}</td><td class="num">${money(x.net)}</td><td class="num">${money(x.debt)}</td><td class="num">${money(x.reserves)}</td><td class="num">${money(x.saving)}</td><td>${esc(x.note)}</td></tr>`).join('')}</tbody></table></div>${p.history.length>=2?`<p>เทียบสองบันทึกล่าสุด: หนี้เปลี่ยน ${money(p.history.at(-1).debt-p.history.at(-2).debt)} บาท · เงินสำรองเปลี่ยน ${money(p.history.at(-1).reserves-p.history.at(-2).reserves)} บาท</p>`:''}</section>`;
  }
  function scenarioForm(s){return `<section class="card no-print"><h2>ถ้าปรับแผน จะเปลี่ยนเท่าไร?</h2><p class="help">ทดลองจากแผนปัจจุบัน ผลจะยังไม่ถูกนำไปบันทึกจนกดยืนยันใช้</p><div class="form-grid"><label>รายจ่ายรายเดือนที่จะลด<select id="sim-expense"><option value="">ไม่ปรับ</option>${s.expenses.filter(e=>e.frequency==='monthly').map(e=>`<option value="${esc(e.id)}">${esc(e.name)} · ${money(e.amount)} บาท</option>`).join('')}</select></label><label>ลดลง (บาท/เดือน)<input id="sim-reduction" value="0" inputmode="decimal"></label><label>เพิ่มออมเกษียณ (บาท/เดือน)<input id="sim-saving" value="0" inputmode="decimal"></label><label>หนี้ที่จะโปะ<select id="sim-debt"><option value="">ไม่ปรับ</option>${s.debts.filter(d=>d.method==='reducing').map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label><label>โปะเพิ่ม (บาท/เดือน)<input id="sim-payment" value="0" inputmode="decimal"></label><label>อายุเกษียณทดลอง (ปี)<input id="sim-age" type="number" min="${s.profile.age}" max="${s.retirement.end-1}" value="${s.retirement.age}"></label></div>${button('simulate','ดูผลเปรียบเทียบ',true)}<div id="simulation-result" aria-live="polite"></div></section>`;}
  function refresh(){
    const s=bridge.get(),route=location.hash.slice(1)||'finance';if(route==='finance'&&index===4)index=0;renderShell(s,route);applyLayout(s,route);renderSummary(s,route);
    const alerts=$('#alerts');if(mode==='guided'&&alerts.innerHTML&&!alerts.querySelector('.guided-alerts')){const d=document.createElement('details');d.className='guided-alerts';d.innerHTML='<summary>มีข้อมูลที่ควรตรวจทาน · แตะเพื่อดูรายละเอียด</summary>';while(alerts.firstChild)d.append(alerts.firstChild);alerts.append(d);}
    if(tools.dataset.route!==route||tools.dataset.revision!==String(bridge.revision())){const focused=tools.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea');if(!focused){tools.innerHTML=(route==='report'?reportTools(s):'')+(route==='report'?`<details class="card flow-simulation"><summary>ทดลองปรับแผนและเปรียบเทียบผล</summary>${scenarioForm(s)}</details>`:'');tools.dataset.route=route;tools.dataset.revision=String(bridge.revision());scenario=null;}}
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
    const link=e.target.closest('a.linked');if(link?.getAttribute('href')==='#finance'&&mode==='guided'){e.preventDefault();go(3);return;}
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.flowStep!==undefined){go(Number(b.dataset.flowStep));return;}
    if(b.dataset.openTopic){location.hash=b.dataset.openTopic;return;}
    if(b.dataset.planMode){mode=b.dataset.planMode;try{localStorage.setItem('catnay.interface',mode);}catch{}bridge.render();return;}
    if(b.dataset.focus){const key=b.dataset.focus;commit(s=>{const p=planning(s);p.focus=p.focus.includes(key)?p.focus.filter(x=>x!==key):[...p.focus,key];});return;}
    if(b.dataset.accept!==undefined){const suggestion=suggestions(bridge.get())[Number(b.dataset.accept)];if(suggestion)commit(s=>{const p=planning(s);if(p.tasks.length>=100)throw Error('รายการลงมือทำเต็มแล้ว');p.tasks.push(taskFromSuggestion(suggestion));});return;}
    if(b.dataset.deleteTask){commit(s=>{planning(s).tasks=planning(s).tasks.filter(t=>t.id!==b.dataset.deleteTask);});note('ลบแล้ว ใช้ปุ่มเลิกทำเพื่อคืนรายการ');return;}
    const a=b.dataset.planAction;if(!a)return;
    try{
      if(a==='report-details'){reportDetails=!reportDetails;tools.dataset.revision='';refresh();if(reportDetails)layout.scrollIntoView({behavior:'smooth'});}
      if(a==='next'||a==='skip'){const key=steps[index][2];if(a==='skip'||planning(bridge.get()).deferred?.includes(key)){commit(s=>{const p=planning(s);p.deferred=(p.deferred||[]).filter(x=>x!==key);if(a==='skip'&&index<4)p.deferred.push(key);},false);$('#toast').replaceChildren();}go(index+1);}
      if(a==='overview')go(4);
      if(a==='guided'){mode='guided';localStorage.setItem('catnay.interface',mode);go(0);}
      if(a==='all'){mode='all';localStorage.setItem('catnay.interface',mode);bridge.render();}
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
  const settings=document.querySelector('.settings-body');if(settings){const b=document.createElement('button');b.dataset.planAction='all';b.textContent='เปิดทุกหมวดสำหรับแก้ไขรายละเอียด';settings.append(b);}
  refresh();
}
