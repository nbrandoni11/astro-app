'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/Button';
export default function GenerateReportsButton() {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const router=useRouter();
  return <><Button variant="outline" disabled={busy} onClick={async()=>{
    setBusy(true);setMessage('');
    try { const r=await fetch('/api/my-reports',{method:'POST'}); const d=await r.json(); if(!r.ok) throw new Error(d.error); setMessage('Consulta completada. Los informes disponibles aparecen en esta página.'); router.refresh(); }
    catch(e){setMessage(e instanceof Error?e.message:'No pudimos completar la consulta.');} finally{setBusy(false);}
  }}>{busy?'Preparando informes…':'Preparar mis informes'}</Button>{message&&<p role="status">{message}</p>}</>;
}
