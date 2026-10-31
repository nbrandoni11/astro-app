import { NextResponse } from 'next/server';
import { clientHash,resolveGooglePlace,validSelection,validSession } from '@/lib/google-places';
export async function POST(req:Request) {
  const headers={'Cache-Control':'no-store'};
  try {
    const b=await req.json();
    if(!validSession(b.session)||!validSelection(b.place_id,b.session,b.selection_token))return NextResponse.json({ok:false,error:'La selección venció. Buscá el lugar nuevamente.'},{status:400,headers});
    const location=await resolveGooglePlace(b.place_id,b.session,clientHash(req));
    return NextResponse.json({ok:true,location},{headers});
  } catch(e) { console.error('[places] Resolution failed');return NextResponse.json({ok:false,error:e instanceof Error?e.message:'No pudimos confirmar el lugar.'},{status:503,headers}); }
}
