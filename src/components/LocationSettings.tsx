'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CityPicker from './CityPicker';
import { Button } from './ui/Button';
import type { Location, Trip } from '@/lib/location-time';
import styles from './LocationSettings.module.css';

export default function LocationSettings({ residence, trips, now }: { residence: Location | null; trips: Trip[]; now: string }) {
  const router = useRouter();
  const [home, setHome] = useState(residence);
  const [destination, setDestination] = useState<Location | null>(null);
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(body: object) {
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Guardado. Se aplicará en las próximas lecturas y cálculos.'); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No pudimos guardar.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.form}>
    <p className={styles.note}>Elegí dónde vivís para recibir la lectura a las 22:00 de tu ciudad. El horario de verano se ajusta automáticamente.</p>
    <form className={styles.form} onSubmit={e => { e.preventDefault(); if (home) void save({ action: 'residence', location: home }); }}>
      <CityPicker label="Ciudad y país de residencia" value={home} onChange={setHome} />
      <Button type="submit" variant="outline" disabled={busy || !home}>Guardar residencia</Button>
    </form>
    <details><summary className={styles.toggle}>Viaje · informar destino y fechas</summary>
      <p className={styles.note}>Entre la llegada y la salida usaremos el horario del destino. Después volveremos a tu residencia. Indicá ambos horarios según el reloj del destino.</p>
      <form className={styles.form} onSubmit={e => { e.preventDefault(); if (destination) void save({ action: 'trip', location: destination, starts, ends }); }}>
        <CityPicker label="Ciudad y país de destino" value={destination} onChange={setDestination} />
        <div className={styles.field}><label htmlFor="trip-start">Llegada · hora del destino</label><input id="trip-start" type="datetime-local" required value={starts} onChange={e => setStarts(e.target.value)} /></div>
        <div className={styles.field}><label htmlFor="trip-end">Salida · hora del destino</label><input id="trip-end" type="datetime-local" required value={ends} onChange={e => setEnds(e.target.value)} /></div>
        <Button type="submit" disabled={busy || !destination || !residence}>Guardar viaje</Button>
      </form>
      {!residence && <p className={styles.note}>Guardá primero tu residencia.</p>}
    </details>
    {trips.filter(t => !t.cancelled_at && Date.parse(t.ends_at) > Date.parse(now)).map(t => <div className={styles.trip} key={t.id}>
      <strong>{t.location.label}</strong>
      <p>{new Intl.DateTimeFormat('es-AR', { timeZone: t.location.timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.starts_at))} → {new Intl.DateTimeFormat('es-AR', { timeZone: t.location.timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.ends_at))}</p>
      <p className={styles.note}>{t.location.timezone}</p>
      <Button variant="outline" disabled={busy} onClick={() => void save({ action: 'cancel-trip', id: t.id })}>Cancelar viaje</Button>
    </div>)}
    {message && <p role="status" className={styles.message}>{message}</p>}
  </div>;
}
