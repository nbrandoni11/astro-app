import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';process.env.OPENAI_API_KEY='test-only';process.env.CRON_SECRET='test-only';process.env.APP_URL='https://example.test';
async function setup(paused=false) {
 const {supabaseAdmin}=await import('../src/lib/supabase-admin');
 const {processBillingDeliveries}=await import('../src/lib/billing-delivery');
 const job:any={id:'job-1',user_id:'user-1',status:'pending',attempts:0,created_at:new Date().toISOString()};
 const reading:any={id:'reading-1',send_status:'pending',twilio_status_1:null,twilio_status_2:null};
 const profile={id:'user-1',auth_user_id:'auth-1',subscription_status:paused?'paused':'active',subscription_paid_until:'2099-01-01',subscription_grace_until:'2099-01-11',timezone:'America/Argentina/Buenos_Aires',natal_chart:{cached:true},natal_interpretation:'Cached'};
 const calls:{url:string,body:any}[]=[];
 (supabaseAdmin as any).from=(table:string)=>{
  let patch:any;const filters:Record<string,any>={};const q:any={select(){return q},in(k:string,v:any){filters[k]=v;return q},lt(){return q},order(){return q},limit(){return q},eq(k:string,v:any){filters[k]=v;return q},is(){return q},update(v:any){patch=v;return q},single:async()=>exec(),maybeSingle:async()=>exec(),then(resolve:any,reject:any){return Promise.resolve(exec()).then(resolve,reject)}};
  function exec(){
   if(table==='users')return {data:profile,error:null};
   if(table==='user_trips')return {data:[],error:null};
   if(table==='daily_horoscopes')return {data:reading,error:null};
   if(table==='billing_delivery_jobs'){
    if(patch){if(filters.status&&filters.status!==job.status)return {data:null,error:null};Object.assign(job,patch);return {data:{id:job.id},error:null};}
    return {data:filters.status?.includes(job.status)?[job]:[],error:null};
   }
   throw new Error('Unexpected table');
  }return q;
 };
 globalThis.fetch=async(input,init)=>{const url=String(input);const body=init?.body?JSON.parse(String(init.body)):null;calls.push({url,body});
  if(url.endsWith('/api/run-daily'))return Response.json({ok:true});
  if(url.includes('/api/send-pending-horoscopes?horoscopeId=reading-1')){reading.twilio_status_1='queued';reading.twilio_status_2='queued';return Response.json({ok:true});}
  throw new Error('Unexpected request');
 };
 return {processBillingDeliveries,job,calls};
}
test('reactivation generates today and sends only its reading, once',async()=>{
 const s=await setup();await s.processBillingDeliveries('user-1');
 assert.equal(s.job.status,'submitted');assert.equal(s.job.horoscope_id,'reading-1');assert.equal(s.calls.length,2);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 assert.equal(s.calls[0].body.targetDate,today);
 await s.processBillingDeliveries('user-1');assert.equal(s.calls.length,2);
});
test('paused subscription never generates or sends despite a pending job',async()=>{
 const s=await setup(true);await s.processBillingDeliveries('user-1');assert.equal(s.calls.length,0);assert.equal(s.job.status,'error');
});
