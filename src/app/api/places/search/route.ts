import { NextResponse } from 'next/server';
import { autocomplete,clientHash,googleConfigured,validSession } from '@/lib/google-places';
export async function GET(req:Request) {
  const url=new URL(req.url),q=url.searchParams.get('q')?.trim()??'',session=url.searchParams.get('session');
  const headers={'Cache-Control':'no-store'};
  if(q.length<3)return NextResponse.json({ok:true,provider:'none',results:[]},{headers});
  if(q.length>200||!validSession(session))return NextResponse.json({ok:false,error:'Búsqueda inválida'},{status:400,headers});
  if(!googleConfigured())return NextResponse.json({ok:true,provider:'local',fallback:true},{headers});
  try { return NextResponse.json({ok:true,provider:'google',results:await autocomplete(q,session,clientHash(req),url.searchParams.get('kind')!=='birth')},{headers}); }
  catch { return NextResponse.json({ok:true,provider:'local',fallback:true},{headers}); }
}
