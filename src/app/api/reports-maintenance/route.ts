import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureAnnualReports } from '@/lib/annual-reports';
export const maxDuration = 300;
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({error:'Unauthorized'},{status:401});
  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') return NextResponse.json({error:'userId required'},{status:400});
    const { data: p } = await supabaseAdmin.from('users').select('*').eq('id',userId).eq('subscription_status','active').single();
    if (!p) return NextResponse.json({error:'Active profile not found'},{status:404});
    const { data: trips, error } = await supabaseAdmin.from('user_trips').select('*').eq('user_id',p.id).is('cancelled_at',null);
    if(error) throw error;
    await ensureAnnualReports(p,trips??[]);
    return NextResponse.json({ok:true});
  } catch(e) {
    console.error('[reports-maintenance]',e instanceof Error?e.message:'failed');
    return NextResponse.json({error:e instanceof Error?e.message:'Report generation failed'},{status:502});
  }
}
