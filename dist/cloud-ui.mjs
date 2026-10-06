import {installPlanner} from './planner-ui.mjs?v=2.6-taxflow1';
import './app.mjs?v=2.6-taxflow1';
import {connectFirebase} from './firebase/service.mjs';
import {SyncEngine,meaningful,validatePlan} from './firebase/sync.mjs';
installPlanner(window.catnayPlan);
const bridge=window.catnayPlan, root=document.querySelector('#cloud-panel');
const labels={local:'บันทึกในอุปกรณ์',ready:'เลือกลูกค้าและแผน หรือบันทึกแผนนี้ขึ้น Cloud',syncing:'☁ กำลังซิงก์...',pending:'☁ รอซิงก์...',synced:'☁ ซิงก์แล้ว',offline:'○ ออฟไลน์ — บันทึกข้อมูลไว้ในอุปกรณ์แล้ว',error:'⚠ ซิงก์ไม่สำเร็จ ข้อมูลในเครื่องยังอยู่ กดลองซิงก์อีกครั้ง',conflict:'พบข้อมูลในอุปกรณ์นี้และ Cloud ที่ต่างกัน',corrupt:'ข้อมูลสำเนาในเครื่องเสียหาย ระงับซิงก์เพื่อป้องกันการเขียนทับ',invalid:'ข้อมูลไม่ถูกต้อง จึงยังไม่ส่งขึ้น Cloud',blank:'แผนว่าง จึงยังไม่ส่งขึ้น Cloud',missing:'ไม่พบแผนบน Cloud ระงับการเขียนทับ', 'local-error':'บันทึกในอุปกรณ์ไม่สำเร็จ จึงระงับ Cloud Sync','other-tab':'พบการแก้ไขจากอีกแท็บ หยุดซิงก์ในแท็บนี้ กรุณาใช้งานทีละแท็บและรีเฟรช'};
let api=null, engine=null, user=null, generation=0, working=false;
root.innerHTML=`<h3>☁ Cloud Sync</h3><p id="cloud-status" role="status" aria-live="polite">กำลังตรวจการตั้งค่า...</p><div id="cloud-account"></div><button id="cloud-login">เข้าสู่ระบบด้วย Google</button><div id="cloud-controls" hidden><button id="cloud-logout">ออกจากระบบ</button><label>ลูกค้า<select id="cloud-clients"><option value="">เลือกลูกค้า</option></select></label><label>แผน<select id="cloud-plans"><option value="">เลือกแผน</option></select></label><button id="cloud-open">เปิดแผนที่เลือก</button><button id="cloud-retry">ลองซิงก์อีกครั้ง / โหลดรายการ</button><details><summary>จัดการลูกค้าและสำรองขึ้น Cloud</summary><label>ชื่อลูกค้าใหม่<input id="cloud-client-name" maxlength="160"></label><button id="cloud-create-client">เพิ่มลูกค้า</button><button id="cloud-rename-client">เปลี่ยนชื่อลูกค้าที่เลือก</button><button id="cloud-archive-client">เก็บลูกค้าที่เลือกเข้าคลัง</button><p>พบแผนที่บันทึกอยู่ในอุปกรณ์นี้ ต้องการสำรองขึ้น Cloud หรือไม่</p><label>ชื่อแผนใหม่<input id="cloud-plan-name" maxlength="160"></label><button id="cloud-upload">บันทึกขึ้น Cloud เป็นแผนใหม่</button><p class="help">เลือกลูกค้าก่อน การบันทึกนี้ส่งข้อมูลแผนทั้งหมดไปยังบัญชี Firebase ของคุณ</p></details></div><div id="cloud-conflict" hidden><p>เวลาบนอุปกรณ์อาจคลาดเคลื่อน จึงไม่เลือก “ล่าสุด” ให้อัตโนมัติ สำรองไฟล์ก่อนเลือกได้ในตั้งค่า</p><button id="cloud-use-local">ใช้ข้อมูลในเครื่อง</button><button id="cloud-use-remote">ใช้ข้อมูลจาก Cloud</button></div>`;
const el=id=>root.querySelector('#'+id), status=text=>{el('cloud-status').textContent=text;};
function showStatus(code){status(labels[code]||labels.error);el('cloud-conflict').hidden=code!=='conflict';}
function options(id,rows,field){const select=el(id),prev=select.value;select.replaceChildren(new Option(id==='cloud-clients'?'เลือกลูกค้า':'เลือกแผน',''));for(const r of rows)select.add(new Option(r[field],r.id));select.value=prev;}
async function cachedList(key,read){try{const rows=await read();localStorage.setItem(key,JSON.stringify(rows.map(({id,name,planName,archived})=>({id,name,planName,archived}))));return rows;}catch(error){if(navigator.onLine===false){const rows=JSON.parse(localStorage.getItem(key)||'[]');showStatus('offline');return rows;}throw error;}}
async function clients(){const g=generation;const rows=await cachedList('catnay.clients.'+user.uid,()=>api.getClients());if(g!==generation)return;options('cloud-clients',rows.filter(x=>!x.archived),'name');}
async function plans(){const cid=el('cloud-clients').value,g=generation;options('cloud-plans',[],'planName');if(!cid)return;const rows=await cachedList('catnay.plans.'+user.uid+'.'+cid,()=>api.getPlans(cid));if(g===generation&&cid===el('cloud-clients').value)options('cloud-plans',rows,'planName');}
async function action(fn){if(working)return;working=true;try{await fn();}catch(error){const code=error?.code||'';status(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request'?'ยกเลิกการเข้าสู่ระบบแล้ว':code==='auth/popup-blocked'?'เบราว์เซอร์ปิดกั้นหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง':code==='auth/unauthorized-domain'?'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication':code.startsWith('auth/')?'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง':labels.error);}finally{working=false;}}
function preserve(){bridge.flush();if(bridge.blocked())throw Error('local-blocked');const data=bridge.get();if(meaningful(data))localStorage.setItem('catnay.recovery.'+Date.now(),JSON.stringify({data,app:'FP',version:7}));}
function requireClient(){const cid=el('cloud-clients').value;if(!cid)throw Error('select-client');return cid;}
el('cloud-login').onclick=()=>action(()=>api.login());
el('cloud-logout').onclick=()=>action(async()=>{bridge.flush();await api.logout();});
el('cloud-clients').onchange=()=>action(plans);
el('cloud-open').onclick=()=>action(async()=>{const cid=requireClient(),pid=el('cloud-plans').value;if(!pid){status('กรุณาเลือกแผน');return;}if(!confirm('เปิดแผนที่เลือกแทนแผนบนหน้าจอ? ระบบจะเก็บสำเนาปัจจุบันในอุปกรณ์'))return;preserve();await engine.open(cid,pid);});
el('cloud-retry').onclick=()=>action(async()=>{await clients();await plans();await engine.reconcile();});
el('cloud-create-client').onclick=()=>action(async()=>{const id=await api.createClient(el('cloud-client-name').value);await clients();el('cloud-clients').value=id;await plans();status('เพิ่มลูกค้าแล้ว');});
el('cloud-rename-client').onclick=()=>action(async()=>{await api.updateClient(requireClient(),{name:el('cloud-client-name').value});await clients();});
el('cloud-archive-client').onclick=()=>action(async()=>{const cid=requireClient();if(!confirm('เก็บลูกค้านี้เข้าคลัง? ข้อมูลแผนจะยังอยู่บน Cloud'))return;bridge.flush();await api.archiveClient(cid);if(engine.active?.[0]===cid)engine.detach();await clients();await plans();});
el('cloud-upload').onclick=()=>action(async()=>{
  const cid=requireClient(),data=validatePlan(bridge.get()),title=el('cloud-plan-name').value.trim();
  if(!title){status('กรุณาระบุชื่อแผน');return;}if(!meaningful(data)){status('กรุณากรอกข้อมูลแผนก่อนบันทึกขึ้น Cloud');return;}
  if(!confirm('บันทึกข้อมูลแผนทั้งหมดขึ้น Cloud ในบัญชีนี้เป็นแผนใหม่?'))return;
  preserve();const g=generation, snapshot=JSON.stringify(bridge.get());const pid=await api.createPlan(cid,title,data);if(g!==generation)return;
  await plans();el('cloud-plans').value=pid;
  // Do not replace edits typed while the network request was in flight.
  if(snapshot!==JSON.stringify(bridge.get())){status('สำรองสำเร็จ มีข้อมูลใหม่ในหน้าจอ กรุณาเปิดแผนหรือสำรองเพิ่มเมื่อตรวจทานแล้ว');return;}
  await engine.open(cid,pid);
});
el('cloud-use-local').onclick=()=>action(()=>{bridge.flush();return engine.resolve('local');});
el('cloud-use-remote').onclick=()=>action(()=>{bridge.flush();return engine.resolve('cloud');});
async function boot(){
  try {api=await connectFirebase();if(!api){status('Cloud Sync ยังไม่ได้ตั้งค่า ข้อมูลของคุณยังคงบันทึกในอุปกรณ์นี้ตามปกติ');el('cloud-login').disabled=true;return;}
    engine=new SyncEngine({storage:localStorage,service:api,apply:bridge.replace,read:bridge.get,status:showStatus,online:()=>navigator.onLine!==false});
    bridge.subscribe(data=>engine.change(data));bridge.onDetach(()=>engine.detach());
    api.onAuth(next=>{generation++;user=next;engine.setUser(next);el('cloud-account').replaceChildren();el('cloud-login').hidden=!!next;el('cloud-controls').hidden=!next;el('cloud-conflict').hidden=true;options('cloud-clients',[],'name');options('cloud-plans',[],'planName');if(!next)return;
      for(const value of [next.displayName,next.email]){const p=document.createElement('p');p.textContent=value||'';el('cloud-account').append(p);}
      if(next.photoURL?.startsWith('https://')){const img=document.createElement('img');img.src=next.photoURL;img.alt='รูปโปรไฟล์';img.width=36;img.height=36;img.referrerPolicy='no-referrer';el('cloud-account').prepend(img);}
      // Login only lists plans; never uploads the shared local draft to another account.
      clients().catch(()=>{if(user?.uid===next.uid)showStatus('error');});
    });
    window.addEventListener('offline',()=>showStatus('offline'));
    window.addEventListener('online',()=>{if(user)action(async()=>{await clients();await engine.reconcile();});});
    window.addEventListener('storage',e=>{if(e.key==='fp.plan.v2.3'||e.key?.startsWith('catnay.v24.'))engine.pause();});
  }catch{status('เชื่อมต่อ Cloud ไม่สำเร็จ ยังใช้และบันทึกแผนในอุปกรณ์ได้ กรุณารีเฟรชเมื่อต่ออินเทอร์เน็ต');el('cloud-login').disabled=true;}
}
boot();
