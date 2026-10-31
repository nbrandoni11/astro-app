'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { Location } from '@/lib/location-time';
import styles from './LocationSettings.module.css';
type Suggestion = Partial<Location> & {label:string;place_id?:string;selection_token?:string};
export default function CityPicker({label,value,onChange,kind='city'}:{label:string;value:Location|null;onChange:(v:Location|null)=>void;kind?:'city'|'birth'}) {
 const id=useId(),session=useRef('');
 const [query,setQuery]=useState(value?.label??'');
 const [results,setResults]=useState<Suggestion[]>([]);
 const [provider,setProvider]=useState('');
 const [message,setMessage]=useState('');
 const [resolving,setResolving]=useState(false);
 useEffect(()=>{
  if(value||query.trim().length<3)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   if(!session.current)session.current=crypto.randomUUID();
   try{
    const params=new URLSearchParams({q:query,session:session.current,kind});
    const response=await fetch(`/api/places/search?${params}`,{signal:controller.signal,cache:'no-store'});
    let data=await response.json();
    if(!response.ok||!data.ok)throw new Error();
    if(data.fallback){
     const local=await fetch(`/api/search-birth-place?q=${encodeURIComponent(query)}`,{signal:controller.signal});
     data=await local.json();data.provider='local';
     if(!local.ok||!data.ok)throw new Error();
    }
    if(controller.signal.aborted)return;
    const found=(data.results??[]).filter((p:Suggestion)=>data.provider==='google'||p.timezone);
    setResults(found);setProvider(data.provider);
    setMessage(found.length?(data.provider==='local'?'Búsqueda de respaldo · verificá la ciudad y el país.':''):'No encontramos ese lugar. Probá agregar la ciudad y el país.');
   }catch{if(!controller.signal.aborted)setMessage('No pudimos buscar el lugar. Intentá nuevamente.');}
  },500);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,value,kind]);
 async function select(p:Suggestion){
  setResolving(true);setResults([]);setMessage('');
  try{
   let location:Location;
   if(p.place_id){
    const res=await fetch('/api/places/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({place_id:p.place_id,selection_token:p.selection_token,session:session.current})});
    const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error);
    location={...data.location,input_label:query};
   }else location={label:p.label,country:p.country!,lat:p.lat!,lon:p.lon!,timezone:p.timezone!};
   onChange(location);setQuery(location.label);session.current='';
  }catch(e){setMessage(e instanceof Error?e.message:'No pudimos confirmar el lugar.');}
  finally{setResolving(false);}
 }
 return <div className={styles.field}>
  <label htmlFor={id}>{label}</label>
  <input id={id} autoComplete="off" disabled={resolving} value={query} placeholder={kind==='birth'?'Ciudad, barrio o maternidad, país':'Ciudad, país'} aria-describedby={`${id}-status`} onChange={e=>{setQuery(e.target.value);onChange(null);setResults([]);setProvider('');setMessage('');}} />
  {results.length>0&&<ul className={styles.results} aria-label={`Resultados: ${label}`}>{results.map((p,i)=><li key={p.place_id??`${p.lat}-${p.lon}-${i}`}><button type="button" disabled={resolving} onClick={()=>void select(p)}>{p.label}{provider==='local'&&<small>Referencia de ciudad</small>}</button></li>)}</ul>}
  {provider==='google'&&<span className={styles.googleAttribution} translate="no">Google Maps</span>}
  <small id={`${id}-status`} role="status">{resolving?'Confirmando coordenadas y huso horario…':message|| (value?`✓ ${value.label} · ${value.timezone}`:'Escribí al menos 3 caracteres y seleccioná un resultado.')}</small>
  <small><a href="/privacidad" target="_blank" rel="noreferrer">Privacidad</a> · <a href="/terminos" target="_blank" rel="noreferrer">Condiciones de uso</a></small>
 </div>;
}
