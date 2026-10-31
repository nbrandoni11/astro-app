'use client';
import { useEffect, useState } from 'react';
import type { ReadingSections } from '@/lib/public-reading';
import styles from './PublicDailyReading.module.css';
const labels:Record<keyof ReadingSections,string>={panorama_general:'✨ Panorama general',trabajo_dinero:'💼 Trabajo y dinero',relaciones:'🤍 Relaciones',energia_interna:'🌙 Energía interna',sintesis_dia:'✨ Síntesis del día',base_astrologica:'🔭 Base astrológica'};
export default function PublicDailyReading(){
 const [data,setData]=useState<{reading_date:string;sections:ReadingSections}|null>(null);const [error,setError]=useState(false);
 useEffect(()=>{const abort=new AbortController();let timer:ReturnType<typeof setTimeout>;async function refresh(){try{const res=await fetch('/api/public-reading',{signal:abort.signal,cache:'no-store'});if(!res.ok)throw Error();const d=await res.json();if(!abort.signal.aborted){setData(d);setError(false);}}catch{if(!abort.signal.aborted){setData(null);setError(true);}}if(!abort.signal.aborted)timer=setTimeout(refresh,60000);}refresh();return()=>{abort.abort();clearTimeout(timer);};},[]);
 const date=data?new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${data.reading_date}T12:00:00Z`)):null;
 return <div className={styles.preview}><p className={styles.caption}>{date?`${date} · Argentina`:'Argentina · lectura diaria'}</p><p className={styles.note}>Lectura general del día, sin personalización. Las mismas secciones que recibís por WhatsApp; tu suscripción las interpreta sobre tu carta natal.</p>
 {!data?<p role="status">{error?'Estamos preparando la lectura de hoy. Volvé a consultar en unos minutos.':'Cargando la lectura de hoy…'}</p>:[['panorama_general','trabajo_dinero','relaciones'],['energia_interna','sintesis_dia','base_astrologica']].map((keys,i)=><article className={styles.bubble} key={i}><p>{i===0?`Tu lectura astral general del ${date}:`:`Continuamos con la lectura general del ${date}:`}</p>{keys.map(key=><section key={key}><h3>{labels[key as keyof ReadingSections]}</h3><p>{data.sections[key as keyof ReadingSections]}</p></section>)}<p>{i===0?'En unos instantes te envío la segunda parte de tu lectura.':'Que esta lectura te acompañe en tu día.'}</p></article>)}
 <p className={styles.note}>Referencia de cálculo: Buenos Aires, 12:00 ART. Se interpretan posiciones y aspectos planetarios, sin casas ni ascendente. Una herramienta de reflexión, sin predicciones garantizadas.</p></div>;
}
