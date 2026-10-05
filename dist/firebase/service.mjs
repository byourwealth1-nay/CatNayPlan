import { firebaseConfig } from './config.mjs';
import { validatePlan, meaningful } from './sync.mjs';
export async function connectFirebase(config = firebaseConfig) {
  if (!config?.apiKey || !config?.projectId || !config?.authDomain || !config?.appId || Object.values(config).some(v => String(v).includes('YOUR_'))) return null;
  const [appSDK, authSDK, dbSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')
  ]);
  const app = appSDK.initializeApp(config), auth = authSDK.getAuth(app), db = dbSDK.getFirestore(app);
  const {doc, collection, getDocs, getDocFromServer, runTransaction, serverTimestamp} = dbSDK;
  const owner = () => { if (!auth.currentUser) throw Error('unauthenticated'); return auth.currentUser.uid; };
  const id = v => { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(v)) throw Error('invalid-id'); return v; };
  const clientRef = cid => doc(db, 'users', owner(), 'clients', id(cid));
  const planRef = (cid,pid) => doc(clientRef(cid), 'plans', id(pid));
  const name = v => { if (typeof v !== 'string' || !v.trim() || v.length > 160) throw Error('invalid-name'); return v.trim(); };
  const map = snap => snap.exists() ? {id:snap.id,...snap.data(),updatedAt:snap.data().updatedAt?.toMillis?.() || 0,createdAt:snap.data().createdAt?.toMillis?.() || 0} : null;
  const api = {
    onAuth: cb => authSDK.onAuthStateChanged(auth, cb),
    login: () => authSDK.signInWithPopup(auth, new authSDK.GoogleAuthProvider()),
    logout: () => authSDK.signOut(auth),
    async createClient(value) {
      const ref = doc(collection(db,'users',owner(),'clients')), clientName=name(value);
      await runTransaction(db, async tx => {tx.set(ref,{name:clientName,archived:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});});
      return ref.id;
    },
    async getClients() { const res=await getDocs(collection(db,'users',owner(),'clients')); if(res.metadata.fromCache)throw Error('offline'); return res.docs.map(map); },
    async updateClient(cid, changes) {
      const ref=clientRef(cid);
      await runTransaction(db,async tx=>{const s=await tx.get(ref);if(!s.exists())throw Error('missing-client');const patch={updatedAt:serverTimestamp()};if('name'in changes)patch.name=name(changes.name);if('archived'in changes)patch.archived=changes.archived===true;tx.update(ref,patch);});
    },
    archiveClient(cid) {return api.updateClient(cid,{archived:true});},
    async getPlans(cid) {const res=await getDocs(collection(clientRef(cid),'plans'));if(res.metadata.fromCache)throw Error('offline');return res.docs.map(map);},
    async loadPlan(cid,pid) {return map(await getDocFromServer(planRef(cid,pid)));},
    async createPlan(cid, planName, data) {
      const pid=doc(collection(clientRef(cid),'plans')).id;
      await api.savePlan(cid,pid,{data,planName,revision:0,updatedAt:0});return pid;
    },
    async savePlan(cid,pid,input) {
      const data=validatePlan(input.data);if(!meaningful(data))throw Error('blank-plan');
      if(new TextEncoder().encode(JSON.stringify(data)).length>750000)throw Error('plan-too-large');
      const ref=planRef(cid,pid), uid=owner(), title=name(input.planName);
      return runTransaction(db,async tx=>{
        if(owner()!==uid)throw Error('account-changed');
        const parent=await tx.get(clientRef(cid));if(!parent.exists()||parent.data().archived)throw Error('archived-client');
        const snap=await tx.get(ref), current=map(snap);
        if((current?.revision||0)!==input.revision || (current?.updatedAt||0)!==input.updatedAt)throw Object.assign(Error('conflict'),{code:'conflict'});
        const next={planName:title,data,schemaVersion:7,revision:input.revision+1,createdAt:current?snap.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
        tx.set(ref,next);return next.revision;
      });
    }
  };
  return api;
}
