export type Location = { label: string; country: string; lat: number; lon: number; timezone: string; provider?: "google"; place_id?: string; input_label?: string };
export type Trip = { id?: string; location: Location; starts_at: string; ends_at: string; cancelled_at?: string | null };

export function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}
export function validateLocation(value: unknown): Location {
  const p = value as Location | null;
  if (!p || typeof p.label !== 'string' || !p.label.trim() || p.label.length > 200 ||
      typeof p.country !== 'string' || !p.country.trim() || p.country.length > 100 ||
      typeof p.lat !== 'number' || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 ||
      typeof p.lon !== 'number' || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180 || !validTimezone(p.timezone)) {
    throw new Error('Seleccioná una ciudad y país de la lista.');
  }
  return { label: p.label.trim(), country: p.country.trim(), lat: p.lat, lon: p.lon, timezone: p.timezone };
}
export function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = (key: string) => Number(parts.find(p => p.type === key)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}
export function offsetHours(instant: Date, timezone: string) {
  const p = localParts(instant, timezone);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant.getTime() / 1000) * 1000) / 3600000;
}
export function localDate(instant: Date, timezone: string, addDays = 0) {
  const p = localParts(instant, timezone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + addDays)).toISOString().slice(0, 10);
}
// Resolve a wall-clock time using the destination's IANA zone, including DST.
// Reject ambiguous/nonexistent times instead of silently choosing the wrong instant.
export function wallTimeToUtc(value: string, timezone: string) {
  if (!validTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Fecha u horario inválidos.');
  const wall = Date.parse(value + ':00Z');
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== value) throw new Error('Fecha inválida.');
  const offsets = new Set([-36, 0, 36].map(h => offsetHours(new Date(wall + h * 3600000), timezone)));
  const candidates = [...offsets].map(offset => new Date(wall - offset * 3600000)).filter(d => {
    const p = localParts(d, timezone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) === wall;
  });
  if (candidates.length !== 1) throw new Error('Ese horario coincide con un cambio de hora. Elegí un horario fuera de la transición.');
  return candidates[0];
}
export function effectiveLocation(residence: Location | null, trips: Trip[], instant = new Date()): Location | null {
  return trips.find(t => !t.cancelled_at && Date.parse(t.starts_at) <= instant.getTime() && instant.getTime() < Date.parse(t.ends_at))?.location ?? residence;
}
export function deliveryTimezone(residence: Location | null, trips: Trip[], fallback: string | null, instant = new Date()) {
  return effectiveLocation(residence, trips, instant)?.timezone ?? (validTimezone(fallback) ? fallback : 'America/Argentina/Buenos_Aires');
}
