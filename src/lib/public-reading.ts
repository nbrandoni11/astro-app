import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from './supabase-admin';
import { getNatalChart } from './astro-engine';
import { assertChart, planetNames, signNames } from './chart-data';
import { localDate } from './location-time';
export const sectionKeys=['panorama_general','trabajo_dinero','relaciones','energia_interna','sintesis_dia','base_astrologica'] as const;
export type ReadingSections=Record<typeof sectionKeys[number],string>;
export async function ensurePublicReading() {
 const date=localDate(new Date(),'America/Argentina/Buenos_Aires');
 const {error:insertError}=await supabaseAdmin.from('public_daily_readings').upsert({reading_date:date},{onConflict:'reading_date',ignoreDuplicates:true});if(insertError)throw insertError;
 const token=randomUUID();const stale=new Date(Date.now()-30*60*1000).toISOString();
 const {data:claim,error:claimError}=await supabaseAdmin.from('public_daily_readings').update({status:'processing',claim_token:token,updated_at:new Date().toISOString()}).eq('reading_date',date).or(`status.eq.pending,and(status.in.(processing,error),updated_at.lt.${stale})`).select('reading_date').maybeSingle();if(claimError)throw claimError;if(!claim)return;
 try {
  const [year,month,day]=date.split('-').map(Number);
  const chart=await getNatalChart({year,month,day,hour:12,min:0,lat:-34.6037,lon:-58.3816,tzone:-3});assertChart(chart);
  const planets=chart.houses.flatMap(h=>h.planets).filter(p=>['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name));
  if(new Set(planets.map(p=>p.name)).size!==10)throw Error('Posiciones planetarias incompletas.');
  const positions=planets.map(p=>`${planetNames[p.name]} en ${signNames[Math.floor(((p.full_degree%360)+360)%360/30)]}${p.is_retro===true||p.is_retro==='true'?' retrógrado':''}`);
  const aspects:string[]=[];
  for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){
   const raw=Math.abs(planets[i].full_degree-planets[j].full_degree)%360;const distance=Math.min(raw,360-raw);
   for(const [angle,label,orb] of [[0,'conjunción',6],[60,'sextil',4],[90,'cuadratura',5],[120,'trígono',5],[180,'oposición',6]] as const)if(Math.abs(distance-angle)<=orb){aspects.push(`${planetNames[planets[i].name]} ${label} ${planetNames[planets[j].name]}`);break;}
  }
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1',temperature:0.5,response_format:{type:'json_object'},messages:[{role:'system',content:`Escribí una lectura astrológica GENERAL para Argentina en español rioplatense. No es personal, no uses cartas natales, casas o ascendente, ni supongas situaciones del lector. Usá solamente las posiciones y aspectos provistos; no inventes eventos, ingresos ni datos. Expresá tendencias como posibilidades y propuestas de reflexión, nunca certezas, decisiones financieras/médicas ni resultados garantizados. Respondé JSON con estas seis claves: ${sectionKeys.join(', ')}. Cada valor de 200 a 350 caracteres, excepto base_astrologica de 200 a 450 caracteres. Sin títulos internos ni markdown. Explicá la base astrológica con factores provistos. Formato y tono equivalente al horóscopo diario por WhatsApp, pero explícitamente general.`},{role:'user',content:JSON.stringify({date,reference:'Buenos Aires, 12:00 ART. Sin casas ni ascendente.',positions,aspects})}]}),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(`Generación no disponible (${response.status}).`);
  const result=await response.json();const sections=JSON.parse(result.choices?.[0]?.message?.content??'null');
  if(!sections||!sectionKeys.every(k=>typeof sections[k]==='string'&&sections[k].trim().length>=40&&sections[k].length<=650))throw Error('Lectura general incompleta.');
  const {error}=await supabaseAdmin.from('public_daily_readings').update({status:'ready',sections:Object.fromEntries(sectionKeys.map(k=>[k,sections[k].trim()])),updated_at:new Date().toISOString(),error:null}).eq('reading_date',date).eq('claim_token',token);if(error)throw error;
 }catch(error){await supabaseAdmin.from('public_daily_readings').update({status:'error',error:error instanceof Error?error.message:'No disponible',updated_at:new Date().toISOString()}).eq('reading_date',date).eq('claim_token',token);throw error;}
}
