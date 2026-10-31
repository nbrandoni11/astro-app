import {supabaseAdmin} from './supabase-admin';
import {fitThreeSections,smartTrim} from './whatsapp-content';
import {DAILY_HOROSCOPE_1_CONTENT_SID,DAILY_HOROSCOPE_2_CONTENT_SID,sendTwilioTemplate} from './whatsapp-templates';
// Admin-only diagnostic: reuse an existing reading, never invent a payment or change access.
export async function checkWhatsAppDelivery(userId:string) {
 const {data:profile}=await supabaseAdmin.from('users').select('id,full_name,phone_whatsapp').eq('id',userId).single();
 if(!profile?.phone_whatsapp)throw new Error('Test profile not found');
 const {data:reading}=await supabaseAdmin.from('daily_horoscopes').select('horoscope_date,whatsapp_message_1,whatsapp_message_2').eq('user_id',userId).is('superseded_at',null).order('horoscope_date',{ascending:false}).limit(1).single();
 if(!reading)throw new Error('No stored reading available');
 const first=JSON.parse(reading.whatsapp_message_1),second=JSON.parse(reading.whatsapp_message_2);
 const date=reading.horoscope_date.split('-').reverse().join('/');
 const [a,b,c]=fitThreeSections(first.panorama_general,first.trabajo_dinero,first.relaciones,1125);
 const [d,e,f]=fitThreeSections(second.energia_interna,second.sintesis_dia,second.base_astrologica,900);
 const results=[];
 const parts=[{sid:DAILY_HOROSCOPE_1_CONTENT_SID,variables:{'1':smartTrim(profile.full_name?.split(' ')[0]||'Astral',60),'2':date,'3':a,'4':b,'5':c}}, {sid:DAILY_HOROSCOPE_2_CONTENT_SID,variables:{'1':date,'2':d,'3':e,'4':f}}];
 for(const [index,part] of parts.entries()) {
  if(index)await new Promise(r=>setTimeout(r,4000));
  const response=await sendTwilioTemplate(profile.phone_whatsapp,part.sid,part.variables as Record<string,string>,'');
  const data=await response.json();
  results.push({part:index+1,sid:data.sid,status:data.status,code:data.error_code??data.code});
  if(!response.ok)break;
 }
 await new Promise(r=>setTimeout(r,3000));
 for(const part of results) {
  if(!part.sid)continue;
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages/${part.sid}.json`,{headers:{Authorization:'Basic '+Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')},cache:'no-store'});
  const data=await response.json();if(response.ok){part.status=data.status;part.code=data.error_code;}
 }
 return {ok:results.length===2&&results.every(r=>['delivered','read'].includes(r.status)),readingDate:reading.horoscope_date,results};
}
