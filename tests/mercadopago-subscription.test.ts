import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';process.env.OPENAI_API_KEY='test-only';
const profile={id:'profile-1',auth_user_id:'auth-1',subscription_status:'inactive',mercadopago_subscription_id:'sub-1'};
async function setup({approved=true,live=true,amount=4990,reference='auth-1',frequency=1}={}) {
 const {supabaseAdmin}=await import('../src/lib/supabase-admin');
 const service=await import('../src/lib/mercadopago-subscription');
 const updates:any[]=[];const recorded:any[]=[];
 (supabaseAdmin as any).from=()=>{let values:any;const q:any={select(){return q},eq(){return q},update(v:any){values=v;return q},maybeSingle:async()=>({data:profile,error:null}),single:async()=>({data:profile,error:null}),then(resolve:any){if(values)updates.push(values);return Promise.resolve({data:profile,error:null}).then(resolve)}};return q};
 (supabaseAdmin as any).rpc=async(name:string,args:any)=>{if(name==='record_subscription_payment')recorded.push(args);return {data:{reactivated:true},error:null}};
 globalThis.fetch=async input=>{
  const url=String(input);
  if(url.includes('/preapproval/'))return Response.json({id:'sub-1',status:'authorized',external_reference:reference,next_payment_date:'2026-12-01T00:00:00Z',auto_recurring:{frequency,frequency_type:'months'}});
  if(url.includes('/authorized_payments/search'))return Response.json({paging:{total:0},results:[]});
  if(url.includes('/authorized_payments/'))return Response.json({id:123,preapproval_id:'sub-1',debit_date:'2026-11-01T00:00:00Z',currency_id:'ARS',transaction_amount:amount,payment:{id:456,status:approved?'approved':'rejected'}});
  if(url.includes('/v1/payments/'))return Response.json({status:approved?'approved':'rejected',date_approved:'2026-11-02T00:00:00Z',currency_id:'ARS',transaction_amount:amount,live_mode:live});
  throw new Error('Unexpected call');
 };
 return {service,updates,recorded};
}
test('authorized debit alone never activates access or records a paid period',async()=>{
 const s=await setup();await s.service.syncMercadoPagoSubscriptionById('sub-1');
 assert.equal(s.recorded.length,0);assert.equal(s.updates.some(v=>v.subscription_status==='active'),false);
});
test('approved live recurring invoice records one verified calendar-month period',async()=>{
 const s=await setup();const result=await s.service.syncMercadoPagoAuthorizedPaymentById('123');
 assert.equal(result.approved,true);assert.equal(s.recorded.length,1);
 assert.equal(s.recorded[0].p_period_end,'2026-12-02T00:00:00.000Z');
 assert.equal(s.recorded[0].p_user_id,'profile-1');assert.equal(s.recorded[0].p_payment_id,'456');
});
test('rejected, sandbox and insufficient payments never activate service',async()=>{
 for(const options of [{approved:false},{live:false},{amount:1}]) {
  const s=await setup(options);assert.equal((await s.service.syncMercadoPagoAuthorizedPaymentById('123')).approved,false);assert.equal(s.recorded.length,0);
 }
});
test('wrong account reference and non-monthly recurrence are rejected',async()=>{
 let s=await setup({reference:'other-user'});await assert.rejects(s.service.syncMercadoPagoAuthorizedPaymentById('123'),/vinculada/);
 s=await setup({frequency:2});await assert.rejects(s.service.syncMercadoPagoAuthorizedPaymentById('123'),/mensual/);
});
