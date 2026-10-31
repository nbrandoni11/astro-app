import { supabaseAdmin } from './supabase-admin';
import { deliveryTimezone, localDate } from './location-time';
import { ensureNatalChart } from './mercadopago-subscription';
import { subscriptionAccess } from './subscription-access';

export async function processBillingDeliveries(userId?: string) {
  let query = supabaseAdmin.from('billing_delivery_jobs').select('*').in('status', ['pending','error']).lt('attempts', 5).order('created_at').limit(5);
  if (userId) query = query.eq('user_id', userId);
  const {data: jobs, error} = await query;
  if(error) throw error;
  const results=[];
  for(const job of jobs ?? []) {
    const token=crypto.randomUUID();
    const {data: claimed,error: claimError}=await supabaseAdmin.from('billing_delivery_jobs').update({status:'processing',claimed_at:new Date().toISOString(),claim_token:token,attempts:job.attempts+1}).eq('id',job.id).eq('status',job.status).select('id').maybeSingle();
    if(claimError || !claimed) continue;
    try {
      const {data: profile,error:pError}=await supabaseAdmin.from('users').select('*').eq('id',job.user_id).single();
      if(pError || !profile || !subscriptionAccess(profile).allowed) throw new Error('Suscripción sin acceso vigente');
      await ensureNatalChart(profile.auth_user_id);
      const {data: trips}=await supabaseAdmin.from('user_trips').select('*').eq('user_id',profile.id).is('cancelled_at',null);
      const date=localDate(new Date(),deliveryTimezone(profile.residence,trips??[],profile.timezone),0);
      const base=process.env.APP_URL || 'https://idastral.com';
      const headers={'Content-Type':'application/json',Authorization:`Bearer ${process.env.CRON_SECRET}`};
      const response=await fetch(`${base}/api/run-daily`,{method:'POST',headers,body:JSON.stringify({userId:profile.id,targetDate:date}),cache:'no-store'});
      if(!response.ok) throw new Error(`Generación inmediata: ${response.status}`);
      const {data: reading,error:rError}=await supabaseAdmin.from('daily_horoscopes').select('id,send_status,twilio_status_1,twilio_status_2').eq('user_id',profile.id).eq('horoscope_date',date).is('superseded_at',null).single();
      if(rError || !reading) throw new Error('Lectura inmediata no disponible');
      if(reading.send_status==='pending') {
        const sent=await fetch(`${base}/api/send-pending-horoscopes?horoscopeId=${reading.id}`,{headers,cache:'no-store'});
        if(!sent.ok) throw new Error(`Envío inmediato: ${sent.status}`);
      } else {
        for(const part of [1,2] as const) {
          const status=reading[`twilio_status_${part}`];
          if(status==='failed' || status==='undelivered') {
            const retry=await fetch(`${base}/api/send-pending-horoscopes`,{method:'POST',headers,body:JSON.stringify({horoscopeId:reading.id,part}),cache:'no-store'});
            if(!retry.ok) throw new Error(`Reintento inmediato: ${retry.status}`);
          }
        }
      }
      const {data: latest}=await supabaseAdmin.from('daily_horoscopes').select('twilio_status_1,twilio_status_2').eq('id',reading.id).single();
      if(!latest || [latest.twilio_status_1,latest.twilio_status_2].some(s=>!s || ['failed','undelivered','retrying'].includes(s))) throw new Error('Entrega pendiente de reconciliar');
      await supabaseAdmin.from('billing_delivery_jobs').update({status:'submitted',horoscope_id:reading.id,last_error:null}).eq('id',job.id).eq('claim_token',token);
      results.push({id:job.id,status:'submitted'});
    } catch(e) {
      await supabaseAdmin.from('billing_delivery_jobs').update({status:'error',last_error:e instanceof Error?e.message:'Error procesando lectura'}).eq('id',job.id).eq('claim_token',token);
      results.push({id:job.id,status:'error'});
    }
  }
  return results;
}
