'use client';
import { useEffect, useId, useState } from 'react';
import type { Location } from '@/lib/location-time';
import styles from './LocationSettings.module.css';

export default function CityPicker({ label, value, onChange }: { label: string; value: Location | null; onChange: (v: Location | null) => void }) {
  const id = useId();
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<Location[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (value || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search-birth-place?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
        const found = (data.results ?? []).filter((p: Location) => p.timezone).map((p: Location) => ({ label: p.label, country: p.country, lat: p.lat, lon: p.lon, timezone: p.timezone }));
        setResults(found);
        setMessage(found.length ? '' : 'No encontramos esa ciudad. Probá agregar el país.');
      } catch { if (!controller.signal.aborted) setMessage('No pudimos buscar la ciudad. Intentá nuevamente.'); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, value]);
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <input id={id} autoComplete="off" value={query} placeholder="Ciudad, país" onChange={e => { setQuery(e.target.value); onChange(null); setResults([]); setMessage(''); }} />
    {!!results.length && <ul className={styles.results} aria-label={`Resultados: ${label}`}>{results.map((p, i) => <li key={`${p.lat}-${p.lon}-${i}`}><button type="button" onClick={() => { onChange(p); setQuery(p.label); setResults([]); setMessage(''); }}>{p.label}<small>{p.timezone}</small></button></li>)}</ul>}
    {value && <small>✓ {value.country} · {value.timezone}</small>}
    {message && <small role="status">{message}</small>}
  </div>;
}
