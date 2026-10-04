import {decodePlan} from '../model.mjs';
import {normalizeMeta,meta} from '../experience.mjs';
export function validatePlan(data) {
  const copy=structuredClone(data); const result=decodePlan({app:'FP',version:6,data:copy});
  if(!result.ux)throw Error('invalid-plan');normalizeMeta(result);return result;
}
export function meaningful(data) {
  return (!!data?.profile?.name?.trim() && data.profile.name.trim()!=='แผนการเงินใหม่') || ['incomes','expenses','assets','debts','policies','portfolios','goals'].some(k=>data?.[k]?.length) || !!data?.review?.notes?.trim();
}
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const localKey=(uid,cid,pid)=>'catnay.v24.'+[uid,cid,pid].map(encodeURIComponent).join('.');
// Device times are advisory. Revision + last server timestamp are the write precondition.
export class SyncEngine {
  constructor({storage,service,apply,status=()=>{},online=()=>true,read=null,delay=1500}) {
    Object.assign(this,{storage,service,apply,status,online,read,delay});this.user=null;this.active=null;this.record=null;this.epoch=0;this.timer=null;this.busy=false;this.conflict=null;this.blocked=false;
  }
  emit(value){this.status(value);}
  cancel(){clearTimeout(this.timer);this.timer=null;this.epoch++;this.busy=false;this.conflict=null;}
  setUser(user){this.cancel();this.user=user;this.active=null;this.record=null;this.blocked=false;this.emit(user?'ready':'local');}
  detach(){this.cancel();this.active=null;this.record=null;this.emit(this.user?'ready':'local');}
  persist(){try{this.storage.setItem(localKey(this.user.uid,...this.active),JSON.stringify(this.record));return true;}catch{this.blocked=true;this.emit('local-error');return false;}}
  async open(cid,pid) {
    if(!this.user)throw Error('unauthenticated');this.cancel();const epoch=this.epoch;this.blocked=false;
    this.active=[cid,pid];this.record=null;const key=localKey(this.user.uid,cid,pid);
    try {const raw=this.storage.getItem(key);if(raw){const r=JSON.parse(raw);r.data=validatePlan(r.data);if(!Number.isInteger(r.revision)||r.revision<1||typeof r.dirty!=='boolean'||!Number.isFinite(r.updatedAt))throw Error('invalid-record');this.record=r;}}
    catch{this.blocked=true;this.emit('corrupt');return;}
    if(this.record){if(!this.apply(this.record.data)){this.blocked=true;this.emit('local-error');return;}}
    await this.reconcile(epoch);
  }
  async reconcile(epoch=this.epoch) {
    if(!this.user||!this.active||this.blocked)return;
    if(!this.online()){this.emit('offline');return;}
    this.emit('syncing');const screen=this.read?JSON.stringify(this.read()):null;
    try {
      const remote=await this.service.loadPlan(...this.active);if(epoch!==this.epoch)return;
      if(!remote){this.blocked=true;this.emit('missing');return;}
      remote.data=validatePlan(remote.data);
      if(!Number.isInteger(remote.revision)||remote.revision<1||!remote.updatedAt)throw Error('invalid-cloud');
      if(!this.record&&this.read&&screen!==JSON.stringify(this.read())){this.record={...remote,data:validatePlan(this.read()),dirty:true,localUpdatedAt:Date.now()};this.conflict=remote;if(this.persist())this.emit('conflict');return;}
      if(this.record?.dirty){
        if(same(this.record.data,remote.data)){this.record={...remote,dirty:false};if(this.persist())this.emit('synced');}
        else if(this.record.revision===remote.revision&&this.record.updatedAt===remote.updatedAt){await this.flush();}
        else {this.conflict=remote;this.emit('conflict');}
      } else {if(!this.apply(remote.data)){this.blocked=true;this.emit('local-error');return;}this.record={...remote,dirty:false};if(this.persist())this.emit('synced');}
    }catch{if(epoch===this.epoch)this.emit(this.online()?'error':'offline');}
  }
  change(data){
    if(!this.user||!this.active||!this.record||this.blocked)return;
    try{data=validatePlan(data);}catch{this.emit('invalid');return;}
    if(same(data,this.record.data))return;
    this.record={...this.record,data,dirty:true,localUpdatedAt:Date.now()};
    if(!this.persist())return;
    if(this.conflict){this.emit('conflict');return;}
    clearTimeout(this.timer);
    if(!this.online()){this.emit('offline');return;}
    this.emit('pending');this.timer=setTimeout(()=>this.flush(),this.delay);
  }
  async flush(){
    if(!this.user||!this.active||!this.record?.dirty||this.busy||this.conflict||this.blocked)return;
    clearTimeout(this.timer);if(!this.online()){this.emit('offline');return;}
    if(!meaningful(this.record.data)){this.emit('blank');return;}
    const epoch=this.epoch, sent=structuredClone(this.record), target=[...this.active];this.busy=true;this.emit('syncing');
    try{
      const revision=await this.service.savePlan(...target,sent);if(epoch!==this.epoch)return;
      const remote=await this.service.loadPlan(...target);if(epoch!==this.epoch)return;
      if(!remote||remote.revision!==revision||!same(remote.data,sent.data)){this.busy=false;await this.reconcile(epoch);return;}
      this.record={...this.record,revision,updatedAt:remote.updatedAt,createdAt:remote.createdAt,dirty:!same(this.record.data,sent.data)};
      this.busy=false;if(!this.persist())return;
      this.emit(this.record.dirty?'pending':'synced');if(this.record.dirty)this.timer=setTimeout(()=>this.flush(),this.delay);
    }catch(error){if(epoch!==this.epoch)return;this.busy=false;if(error.code==='conflict'){await this.reconcile(epoch);}else this.emit(this.online()?'error':'offline');}
  }
  async resolve(choice){
    if(!this.conflict||!this.record)return;
    const cloud=this.conflict;
    // Keep the losing local version before any explicit replacement.
    try{this.storage.setItem(localKey(this.user.uid,...this.active)+'.recovery.'+Date.now(),JSON.stringify(this.record));}catch{this.emit('local-error');return;}
    this.conflict=null;
    if(choice==='cloud'){if(!this.apply(cloud.data)){this.conflict=cloud;this.emit('local-error');return;}this.record={...cloud,dirty:false};if(this.persist())this.emit('synced');}
    else if(choice==='local'){this.record={...this.record,revision:cloud.revision,updatedAt:cloud.updatedAt,dirty:true};if(this.persist())await this.flush();}
  }
  pause(){this.cancel();this.blocked=true;this.emit('other-tab');}
}
