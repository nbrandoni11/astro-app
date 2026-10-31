'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deliveryPreferences, deliveryTimeLabel, type DeliveryPreferences } from '@/lib/delivery-schedule';
import styles from './DeliverySettings.module.css';
export default function DeliverySettings({preferences,timezone,active}:{preferences:DeliveryPreferences;timezone:string;active:boolean}) {
 const initial=deliveryPreferences(preferences);const [day,setDay]=useState(initial.day);const [minute,setMinute]=useState(initial.minute);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const router=useRouter();
 return <section className={styles.section} id="horario"><h2>Tu horario de lectura</h2><p>Por defecto, a las 22 del día anterior. Elegí cuándo preferís recibirla.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setNotice('');try{const res=await fetch('/api/delivery-preferences',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day,minute})});const data=await res.json();if(!res.ok)throw Error(data.error);setNotice('Horario guardado. Se aplicará a las próximas lecturas que aún no recibiste.');router.refresh();}catch(e){setNotice(e instanceof Error?e.message:'No pudimos guardar el horario.');}finally{setBusy(false);}}}>
 <div className={styles.fields}><label>Cuándo<select value={day} onChange={e=>setDay(e.target.value)}><option value="previous_day">El día anterior</option><option value="same_day">El mismo día</option></select></label><label>Hora local<select value={minute} onChange={e=>setMinute(Number(e.target.value))}>{Array.from({length:96},(_,i)=>i*15).map(m=><option key={m} value={m}>{deliveryTimeLabel({delivery_minute:m})}</option>)}</select></label></div>
 <p>{timezone}. Si informás un viaje, se usa la zona horaria del destino mientras estés allí.</p><p>La preparación comienza desde la hora elegida. La entrega puede demorar unos minutos y depende de WhatsApp. Cambiar el horario no vuelve a enviar una lectura ya recibida.</p>
 {!active&&<p>Podés guardar tu preferencia; los envíos se reanudan al activar la suscripción.</p>}<button disabled={busy} type="submit">{busy?'Guardando…':'Guardar horario'}</button><p role="status">{notice}</p></form></section>;
}
