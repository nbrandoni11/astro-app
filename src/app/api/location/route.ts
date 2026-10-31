import { NextResponse } from 'next/server';
import { submittedLocation, storedLocation } from '@/lib/google-places';
import { currentProfile } from '@/lib/current-profile';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { wallTimeToUtc } from '@/lib/location-time';

export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: 'Ingresá a tu cuenta.' }, { status: 401 });
  if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({ error: 'Origen inválido.' }, { status: 403 });
  try {
    const body = await req.json();
    if (body.action === 'cancel-trip') {
      const { error } = await supabaseAdmin.from('user_trips').update({ cancelled_at: new Date().toISOString() }).eq('id', body.id).eq('user_id', profile.id);
      if (error) throw error;
    } else if (body.action === 'residence') {
      const residence = await submittedLocation(body.location);
      const { error } = await supabaseAdmin.from('users').update({ residence: storedLocation(residence), timezone: residence.timezone }).eq('id', profile.id);
      if (error) throw error;
    } else if (body.action === 'trip') {
      if (!profile.residence) throw new Error('Guardá primero tu residencia habitual.');
      const location = await submittedLocation(body.location);
      const starts = wallTimeToUtc(body.starts, location.timezone);
      const ends = wallTimeToUtc(body.ends, location.timezone);
      if (starts >= ends || ends.getTime() < Date.now()) throw new Error('La salida debe ser posterior a la llegada y el viaje no puede haber terminado.');
      const { error } = await supabaseAdmin.from('user_trips').insert({ user_id: profile.id, location: storedLocation(location), starts_at: starts.toISOString(), ends_at: ends.toISOString() });
      if (error?.code === '23P01') throw new Error('Ya tenés un viaje en ese horario. Cancelalo antes de agregar otro.');
      if (error) throw error;
    } else return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[location] Save failed', error instanceof Error ? error.message : 'database error');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos guardar la ubicación.' }, { status: 400 });
  }
}
