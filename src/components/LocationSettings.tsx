'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CityPicker from './CityPicker';
import { Button } from './ui/Button';
import { effectiveLocation, type Location, type Trip } from '@/lib/location-time';
import styles from './LocationSettings.module.css';
function LocationIcon({travel=false}:{travel?:boolean}) {
 return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">{travel?<><path d="M3 17 21 7M5 6l6 7 2 8M3 17l4 1 14-11-17 6"/></>:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>}</svg>;
}
export default function LocationSettings({residence,trips,now}:{residence:Location|null;trips:Trip[];now:string}) {
 const router=useRouter();
 const [home,setHome]=useState(residence);const [destination,setDestination]=useState<Location|null>(null);
 const [starts,setStarts]=useState('');const [ends,setEnds]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [editingHome,setEditingHome]=useState(!residence);const [editingTrip,setEditingTrip]=useState(false);const [clock,setClock]=useState(()=>Date.parse(now));
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer);},[]);
 const current=effectiveLocation(residence,trips,new Date(clock));
 const upcoming=trips.filter(t=>!t.cancelled_at&&Date.parse(t.ends_at)>clock);
 const travelling=upcoming.some(t=>Date.parse(t.starts_at)<=clock);
 async function save(body:object){
  setBusy(true);setMessage('');
  try{const res=await fetch('/api/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error);setMessage('Guardado. Se aplicará en las próximas lecturas y cálculos.');router.refresh();return true;}
  catch(e){setMessage(e instanceof Error?e.message:'No pudimos guardar.');return false;}finally{setBusy(false);}
 }
 return <div className={styles.form}>
  <div className={styles.currentCity}>
   <span className={styles.currentIcon}><LocationIcon/></span>
   <div className={styles.cityCopy}><p className={styles.eyebrow}>Tu ciudad actual</p><h3>{current?.label??'Todavía no informaste tu ciudad'}</h3><p className={styles.note}>{current?`${travelling?'Destino del viaje vigente':'Residencia habitual'} · ${current.timezone}`:'Elegí dónde estás para usar la zona horaria correcta. No usamos tu ubicación GPS.'}</p></div>
   <button type="button" className={styles.editButton} aria-expanded={editingHome} aria-controls="residence-editor" disabled={busy} onClick={()=>setEditingHome(v=>!v)}>{editingHome?'Cerrar':residence?'Cambiar residencia':'Elegir ciudad'}<span aria-hidden="true">{editingHome?'−':'↗'}</span></button>
  </div>
  <p className={styles.note}>Tu lectura llegará desde la hora que elegiste, según la zona horaria de esta ciudad. El horario de verano se ajusta automáticamente.</p>
  {editingHome&&<form id="residence-editor" className={styles.editor} onSubmit={async e=>{e.preventDefault();if(home&&await save({action:'residence',location:home}))setEditingHome(false);}}>
   <div className={styles.editorHeading}><h4>Tu residencia habitual</h4><p>La ciudad donde vivís. Si estás de viaje, informalo por separado.</p></div>
   <CityPicker label="Ciudad y país de residencia" value={home} onChange={setHome}/>
   <div className={styles.formActions}><Button type="submit" disabled={busy||!home}>{busy?'Guardando…':'Guardar residencia'}</Button><button type="button" className={styles.textButton} onClick={()=>{setHome(residence);setEditingHome(false);}}>Cancelar</button></div>
  </form>}
  <div className={styles.travelCard}>
   <div className={styles.travelHeader}><span className={styles.travelIcon}><LocationIcon travel/></span><div><h3>¿Vas a viajar?</h3><p>Tu lectura te acompaña, estés donde estés.</p></div><button type="button" className={styles.editButton} aria-expanded={editingTrip} aria-controls="trip-editor" onClick={()=>setEditingTrip(v=>!v)}>{editingTrip?'Cerrar':'Agregar viaje'}<span aria-hidden="true">{editingTrip?'−':'+'}</span></button></div>
   {!editingTrip&&<p className={styles.travelDescription}>Informá el destino y las fechas. Durante el viaje usamos su zona horaria; al volver, se retoma tu residencia habitual.</p>}
   {editingTrip&&<div id="trip-editor" className={styles.travelEditor}><p className={styles.note}>Indicá llegada y salida según el reloj del destino. Tu carta natal no cambia.</p>
    <form className={styles.form} onSubmit={async e=>{e.preventDefault();if(destination&&await save({action:'trip',location:destination,starts,ends})){setEditingTrip(false);setDestination(null);setStarts('');setEnds('');}}}>
     <CityPicker label="¿A dónde viajás?" value={destination} onChange={setDestination}/>
     <div className={styles.dateGrid}><div className={styles.field}><label htmlFor="trip-start">Llegada · hora del destino</label><input id="trip-start" type="datetime-local" required value={starts} onChange={e=>setStarts(e.target.value)}/></div><div className={styles.field}><label htmlFor="trip-end">Salida · hora del destino</label><input id="trip-end" type="datetime-local" required value={ends} onChange={e=>setEnds(e.target.value)}/></div></div>
     {!residence&&<p className={styles.notice}>Guardá primero tu residencia habitual para poder agregar un viaje.</p>}
     <div className={styles.formActions}><Button type="submit" disabled={busy||!destination||!residence}>{busy?'Guardando…':'Guardar viaje'}</Button><button type="button" className={styles.textButton} onClick={()=>setEditingTrip(false)}>Cancelar</button></div>
    </form>
   </div>}
  </div>
  {upcoming.length>0&&<div className={styles.tripList}><h4>Tus viajes</h4>{upcoming.map(t=><article className={styles.trip} key={t.id}><div><span className={styles.tripBadge}>{Date.parse(t.starts_at)<=clock?'En curso':'Próximo viaje'}</span><h3>{t.location.label}</h3><p>{new Intl.DateTimeFormat('es-AR',{timeZone:t.location.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(t.starts_at))} → {new Intl.DateTimeFormat('es-AR',{timeZone:t.location.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(t.ends_at))}</p><small>Hora del destino · {t.location.timezone}</small></div><button type="button" className={styles.textButton} disabled={busy} onClick={()=>void save({action:'cancel-trip',id:t.id})}>Cancelar viaje</button></article>)}</div>}
  {message&&<p role="status" className={styles.message}>{message}</p>}
 </div>;
}
