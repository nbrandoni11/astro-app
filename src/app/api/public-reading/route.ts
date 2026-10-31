import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { localDate } from '@/lib/location-time';
import { ensurePublicReading } from '@/lib/public-reading';
export const maxDuration=180;
export const dynamic='force-dynamic';
export async function GET(){
 const date=localDate(new Date(),'America/Argentina/Buenos_Aires');
 const {data,error}=await supabaseAdmin.from('public_daily_readings').select('reading_date,sections,calculation_reference').eq('reading_date',date).eq('status','ready').maybeSingle();
 if(error||!data)return NextResponse.json({ok:false,date,error:'Estamos preparando la lectura general de hoy.'},{status:503});
 return NextResponse.json({ok:true,...data},{headers:{'Cache-Control':'public, max-age=60'}});
}
export async function POST(req:Request){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{await ensurePublicReading();return GET();}catch{return NextResponse.json({error:'No pudimos preparar la lectura general.'},{status:503});}
}
