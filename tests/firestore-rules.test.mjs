import {test} from 'node:test';
import fs from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,serverTimestamp} from 'firebase/firestore';
import {fresh} from '../dist/model.mjs';
import {meta} from '../dist/experience.mjs';
test('Firestore rules enforce owner, timestamps, schema and revision',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-catnayplan',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  const a=env.authenticatedContext('A').firestore(),b=env.authenticatedContext('B').firestore(),anon=env.unauthenticatedContext().firestore();
  const cp='users/A/clients/c',pp=cp+'/plans/p';
  const client={name:'Client',archived:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(a,cp),client));await assertFails(getDoc(doc(b,cp)));await assertFails(setDoc(doc(b,cp),client));await assertFails(getDoc(doc(anon,cp)));
  const data=fresh();meta(data);data.profile.name='Test';const plan={planName:'Plan',data,schemaVersion:7,revision:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(a,pp),plan));await assertSucceeds(getDoc(doc(a,pp)));await assertFails(getDoc(doc(b,pp)));await assertFails(setDoc(doc(b,pp),plan));await assertFails(getDoc(doc(anon,pp)));
  await assertFails(updateDoc(doc(a,pp),{revision:1,updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(a,pp),{revision:2,data:{},updatedAt:serverTimestamp()}));await assertSucceeds(updateDoc(doc(a,pp),{revision:2,updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(a,cp),{archived:true,updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(a,pp),{revision:3,updatedAt:serverTimestamp()}));
 }finally{await env.cleanup();}
});
