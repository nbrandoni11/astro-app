import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/current-profile';
import { supabaseAdmin } from '@/lib/supabase-admin';
export async function POST(req:Request) {
 const profile=await currentProfile();if(!profile)return NextResponse.json({error:'Ingresá a tu cuenta.'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Origen inválido.'},{status:403});
 try{
  const body=await req.json();
  if(!['previous_day','same_day'].includes(body.day)||!Number.isInteger(body.minute)||body.minute<0||body.minute>1439||body.minute%15!==0)return NextResponse.json({error:'Elegí un día y un horario válido.'},{status:400});
  const {error}=await supabaseAdmin.from('users').update({delivery_day:body.day,delivery_minute:body.minute}).eq('id',profile.id).eq('auth_user_id',profile.auth_user_id);
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'No pudimos guardar el horario. Intentá otra vez.'},{status:400});}
}
