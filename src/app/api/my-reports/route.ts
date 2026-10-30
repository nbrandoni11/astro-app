import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/current-profile';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureAnnualReports } from '@/lib/annual-reports';
export const maxDuration = 300;
export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return NextResponse.json({ error:'Ingresá a tu cuenta.' },{ status:401 });
  if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({ error:'Origen inválido.' },{ status:403 });
  if (p.subscription_status !== 'active') return NextResponse.json({ error:'Necesitás una suscripción activa para generar nuevos informes.' },{ status:403 });
  try {
    const { data: trips, error } = await supabaseAdmin.from('user_trips').select('*').eq('user_id',p.id).is('cancelled_at',null);
    if (error) throw error;
    await ensureAnnualReports(p,trips??[]);
    return NextResponse.json({ok:true});
  } catch(e) {
    console.error('[my-reports]', e instanceof Error ? e.message : 'generation failed');
    return NextResponse.json({error:'No se pudo completar el informe. Conservamos tus informes anteriores y volveremos a intentarlo.'},{status:502});
  }
}
