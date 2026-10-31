import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from './supabase-admin';
import { offsetHours, validateLocation, wallTimeToUtc, type Location } from './location-time';

export type GoogleLocation = Location & { provider: 'google'; place_id: string; input_label?: string };
export type PlaceSuggestion = { label: string; place_id: string; selection_token: string };
type Operation = 'autocomplete' | 'details' | 'timezone';
const apiKey = () => process.env.GOOGLE_MAPS_API_KEY;
export const googleConfigured = () => !!apiKey();
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_+=\/-]{5,512}$/.test(id);
export function clientHash(req: Request) {
  return createHmac('sha256', process.env.CRON_SECRET || 'no-google-access').update(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').digest('hex');
}
async function logProviderFailure(res: Response, operation: string) {
  const data = await res.json().catch(() => null);
  const details = data?.error?.details as Array<{ reason?: string }> | undefined;
  const reasons = details?.map(d => d.reason).filter(Boolean).join(',');
  const safeMessage = String(data?.error?.message || '').split(apiKey() || '__no_key__').join('[redacted]').slice(0, 400);
  console.error('[places] Provider rejected request', JSON.stringify({ operation, http: res.status, status: data?.error?.status, reasons, message: safeMessage }));
}
async function reserve(operation: Operation, client: string) {
  const { data, error } = await supabaseAdmin.rpc('reserve_google_places_request', { operation, client });
  if (error || data !== true) throw new Error('Google no está disponible por el momento. Podés usar la búsqueda de respaldo.');
}
function sign(id: string, session: string, expires: number) {
  return createHmac('sha256', process.env.CRON_SECRET!).update(JSON.stringify([id,session,expires])).digest('hex');
}
export function selectionToken(id: string, session: string, expires = Date.now()+10*60000) {
  return `${expires}.${sign(id,session,expires)}`;
}
export function validSelection(id: string, session: string, token: unknown) {
  if (!validId(id) || typeof token !== 'string' || !process.env.CRON_SECRET) return false;
  const [raw,hash] = token.split('.'); const expiry = Number(raw);
  if (!Number.isSafeInteger(expiry) || expiry < Date.now() || expiry > Date.now()+11*60000 || !/^[a-f0-9]{64}$/.test(hash??'')) return false;
  return timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(sign(id,session,expiry),'hex'));
}
export function validSession(s: unknown): s is string { return typeof s === 'string' && /^[a-f0-9-]{36}$/.test(s); }
export async function autocomplete(input: string, session: string, client: string, citiesOnly: boolean): Promise<PlaceSuggestion[]> {
  if (!apiKey() || !process.env.CRON_SECRET) throw new Error('Google no configurado');
  await reserve('autocomplete',client);
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method:'POST', headers:{'Content-Type':'application/json','X-Goog-Api-Key':apiKey()!, 'X-Goog-FieldMask':'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text'},
    body:JSON.stringify({input,sessionToken:session,languageCode:'es',regionCode:'ar',...(citiesOnly?{includedPrimaryTypes:['(cities)']}:{})}),
    cache:'no-store', signal:AbortSignal.timeout(8000),
  });
  if (!res.ok) { await logProviderFailure(res,'autocomplete'); throw new Error('No pudimos consultar Google.'); }
  const data=await res.json();
  return (data.suggestions??[]).flatMap((s: {placePrediction?:{placeId?:string;text?:{text?:string}}})=>{
    const p=s.placePrediction;
    return p?.placeId && validId(p.placeId) && p.text?.text ? [{place_id:p.placeId,label:p.text.text,selection_token:selectionToken(p.placeId,session)}] : [];
  });
}
export async function cachedGooglePlace(id: string): Promise<GoogleLocation | null> {
  const { data }=await supabaseAdmin.from('google_places_cache').select('location').eq('place_id',id).gt('expires_at',new Date().toISOString()).maybeSingle();
  return data?.location ?? null;
}
export async function resolveGooglePlace(id: string, session?: string, client = 'internal'): Promise<GoogleLocation> {
  if (!validId(id)) throw new Error('Lugar inválido. Volvé a seleccionarlo.');
  const cached=await cachedGooglePlace(id); if(cached)return cached;
  if(!apiKey())throw new Error('Google no configurado');
  // Reserve both calls before contacting Google; failed attempts still consume a slot.
  await reserve('details',client); await reserve('timezone',client);
  const params=new URLSearchParams({languageCode:'es',...(session?{sessionToken:session}:{})});
  const res=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?${params}`,{headers:{'X-Goog-Api-Key':apiKey()!,'X-Goog-FieldMask':'id,formattedAddress,addressComponents,location'},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!res.ok){await logProviderFailure(res,'details');throw new Error('No pudimos obtener las coordenadas del lugar.');}
  const d=await res.json(); const lat=d.location?.latitude,lon=d.location?.longitude;
  if(typeof lat!=='number'||typeof lon!=='number')throw new Error('Ese lugar no tiene coordenadas disponibles.');
  const country=d.addressComponents?.find((p:{types:string[]})=>p.types?.includes('country'))?.longText;
  const tzParams=new URLSearchParams({location:`${lat},${lon}`,timestamp:String(Math.floor(Date.now()/1000)),language:'es',key:apiKey()!});
  const tzResponse=await fetch(`https://maps.googleapis.com/maps/api/timezone/json?${tzParams}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  const tz=await tzResponse.json();
  if(!tzResponse.ok||tz.status!=='OK') { console.error('[places] Timezone status',tz.status); throw new Error('No pudimos confirmar el huso horario de ese lugar.'); }
  const location:GoogleLocation={...validateLocation({label:d.formattedAddress,country,lat,lon,timezone:tz.timeZoneId}),provider:'google',place_id:id};
  const { error }=await supabaseAdmin.from('google_places_cache').upsert({place_id:id,location,expires_at:new Date(Date.now()+29*86400000).toISOString()});
  if(error)throw new Error('No se pudo confirmar el lugar. Intentá nuevamente.');
  return location;
}
// Permanent records keep a place ID and the user's own search text, not a
// permanent copy of Google's coordinates/address. The cache expires in 29 days.
export function storedLocation(p: Location) {
  const g=p as GoogleLocation;
  return g.provider==='google' && validId(g.place_id)
    ? {provider:'google',place_id:g.place_id,label:(g.input_label||'Ubicación seleccionada').slice(0,200),timezone:g.timezone}
    : p;
}
export async function resolveSavedLocation(p: unknown): Promise<Location | null> {
  if(!p)return null;
  const g=p as GoogleLocation;
  if(g.provider==='google')return {...await resolveGooglePlace(g.place_id),input_label:g.input_label||g.label} as GoogleLocation;
  return validateLocation(p);
}
export async function submittedLocation(p: unknown): Promise<Location> {
  const g=p as GoogleLocation;
  if(g?.provider!=='google')return validateLocation(p);
  const cached=await cachedGooglePlace(g.place_id);
  if(!cached)throw new Error('Buscá y seleccioná el lugar nuevamente antes de guardar.');
  return {...cached,input_label:typeof g.input_label==='string'?g.input_label.slice(0,200):g.label};
}
export async function displayLocation(p: unknown): Promise<Location | null> {
  if(!p)return null;
  const g=p as GoogleLocation;
  if(g.provider!=='google')return g;
  const cached=await cachedGooglePlace(g.place_id);
  return cached?{...cached,input_label:g.label}:g;
}
type BirthFields={birth_google_place_id?:string|null;birth_year:number;birth_month:number;birth_day:number;birth_hour:number;birth_min:number};
export async function resolveBirthProfile<T extends BirthFields>(p:T):Promise<T> {
  if(!p.birth_google_place_id)return p;
  const place=await resolveGooglePlace(p.birth_google_place_id);
  const wall=`${p.birth_year}-${String(p.birth_month).padStart(2,'0')}-${String(p.birth_day).padStart(2,'0')}T${String(p.birth_hour).padStart(2,'0')}:${String(p.birth_min).padStart(2,'0')}`;
  const instant=wallTimeToUtc(wall,place.timezone);
  return {...p,birth_lat:place.lat,birth_lon:place.lon,birth_tzone:offsetHours(instant,place.timezone)};
}
