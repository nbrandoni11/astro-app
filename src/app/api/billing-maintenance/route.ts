import { checkWhatsAppDelivery } from '@/lib/delivery-check';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { syncMercadoPagoSubscriptionById } from '@/lib/mercadopago-subscription';
import { processBillingDeliveries } from '@/lib/billing-delivery';
export const maxDuration=300;
export async function POST(req:Request) {
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await req.json().catch(()=>({}));
 if(body.checkDeliveryUserId && typeof body.checkDeliveryUserId==='string')return NextResponse.json(await checkWhatsAppDelivery(body.checkDeliveryUserId));
 if(body.checkProvider===true) {
  const response=await fetch('https://api.mercadopago.com/users/me',{headers:{Authorization:`Bearer ${process.env.MP_ACCESS_TOKEN}`},cache:'no-store'});
  const account=await response.json();
  return NextResponse.json({ok:response.ok,providerStatus:response.status,argentina:account.site_id==='MLA',webhookSignatureConfigured:!!process.env.MP_WEBHOOK_SECRET,monthlyFrequency:1,currency:'ARS'});
 }
 const {error}=await supabaseAdmin.rpc('expire_subscription_access');
 if(error)return NextResponse.json({error:'Billing maintenance failed'},{status:500});
 const {data:profiles,error:pError}=await supabaseAdmin.from('users').select('id,mercadopago_subscription_id').not('mercadopago_subscription_id','is',null).order('billing_checked_at',{ascending:true,nullsFirst:true}).limit(20);
 if(pError)return NextResponse.json({error:'Billing lookup failed'},{status:500});
 const checked=[];
 for(const profile of profiles??[]) {
  try {await syncMercadoPagoSubscriptionById(profile.mercadopago_subscription_id);checked.push({id:profile.id,ok:true});}
  catch(e){console.error('[billing-maintenance]',e instanceof Error?e.message:'Reconciliation error');checked.push({id:profile.id,ok:false});}
  await supabaseAdmin.from('users').update({billing_checked_at:new Date().toISOString()}).eq('id',profile.id);
 }
 const deliveries=await processBillingDeliveries();
 return NextResponse.json({ok:true,checked,deliveries});
}
