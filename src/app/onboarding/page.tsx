'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import CityPicker from '@/components/CityPicker';
import { wallTimeToUtc,offsetHours,type Location } from '@/lib/location-time';
import { birthDateISO,birthDateLabel,monthNames } from '@/lib/birth-date';
import styles from './onboarding.module.css';
const steps=['Nacimiento','Contacto y ciudad','Revisar'];
export default function OnboardingPage(){
 const router=useRouter();const [step,setStep]=useState(1);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [confirmed,setConfirmed]=useState(false);
 const [values,setValues]=useState({full_name:'',email:'',phone_whatsapp:'',birth_day:'',birth_month:'',birth_year:'',birth_hour:'',birth_min:''});
 const [birthLocation,setBirthLocation]=useState<Location|null>(null);const [residence,setResidence]=useState<Location|null>(null);
 const heading=useRef<HTMLHeadingElement>(null);const errorBox=useRef<HTMLDivElement>(null);
 useEffect(()=>{heading.current?.focus();},[step]);useEffect(()=>{if(error)errorBox.current?.focus();},[error]);
 function change(name:keyof typeof values,value:string){setValues(old=>({...old,[name]:value}));setConfirmed(false);setError('');}
 function go(next:number){setError('');setStep(next);}
 function date(){return birthDateISO(Number(values.birth_day),Number(values.birth_month),Number(values.birth_year));}
 function offset(){
  const iso=date();if(!birthLocation)throw Error('Elegí tu lugar de nacimiento en la lista de resultados.');
  if(values.birth_hour===''||values.birth_min==='')throw Error('Completá la hora y los minutos de nacimiento.');
  const instant=wallTimeToUtc(`${iso}T${values.birth_hour.padStart(2,'0')}:${values.birth_min.padStart(2,'0')}`,birthLocation.timezone);
  return offsetHours(instant,birthLocation.timezone);
 }
 let dateLabel='';try{if(values.birth_day&&values.birth_month&&values.birth_year)dateLabel=birthDateLabel(Number(values.birth_day),Number(values.birth_month),Number(values.birth_year));}catch{}
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');
  try{
   const birthTzone=offset();
   if(step===1){go(2);return;}
   if(values.full_name.trim().length<2)throw Error('Escribí tu nombre para identificar tu cuenta.');
   const phone=values.phone_whatsapp.replace(/[\s().-]/g,'');
   if(!/^\+[1-9]\d{7,14}$/.test(phone))throw Error('Ingresá tu WhatsApp con + y código de país. Por ejemplo: +54 9 11 1234 5678.');
   if(!residence)throw Error('Elegí la ciudad donde vivís en la lista de resultados.');
   if(step===2){go(3);return;}
   if(!confirmed)throw Error('Confirmá que la fecha, la hora y el lugar de nacimiento son correctos.');
   setBusy(true);
   const res=await fetch('/api/create-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    full_name:values.full_name.trim(),email:values.email.trim().toLowerCase(),phone_whatsapp:phone,
    birth_day:Number(values.birth_day),birth_month:Number(values.birth_month),birth_year:Number(values.birth_year),birth_hour:Number(values.birth_hour),birth_min:Number(values.birth_min),birth_lat:birthLocation!.lat,birth_lon:birthLocation!.lon,birth_tzone:birthTzone,birth_location:birthLocation,timezone:residence.timezone,residence,birth_place_input:birthLocation!.input_label||birthLocation!.label,birth_place_resolved:birthLocation!.label,
   })});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'No pudimos continuar. Tus datos siguen en este formulario; intentá nuevamente.');
   router.push(`/suscripcion?userId=${encodeURIComponent(data.userId)}&email=${encodeURIComponent(data.email)}&checkoutToken=${encodeURIComponent(data.checkoutToken)}`);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos continuar. Intentá otra vez.');setBusy(false);}
 }
 return <div className={styles.root}><div className={styles.pageWrap}>
  <header className={styles.registrationHeader}><Link href="/" aria-label="Volver al inicio"><Image src="/id-astral-horizontal.png" alt="ID Astral" width={190} height={48}/></Link><Link href="/login">Ya tengo cuenta ↗</Link></header>
  <nav className={styles.stepper} aria-label="Progreso del registro">{steps.map((label,i)=><div key={label} className={step>=i+1?styles.stepActive:''} aria-current={step===i+1?'step':undefined}><span>{step>i+1?'✓':i+1}</span><p>{label}</p></div>)}</nav>
  <section className={styles.registrationCard}>
   <p className={styles.stepEyebrow}>Paso {step} de 3</p>
   <h1 ref={heading} tabIndex={-1} className={styles.registrationTitle}>{step===1?'Empecemos por tu nacimiento':step===2?'¿Dónde recibís tu lectura?':'Que todo esté bien, desde el inicio'}</h1>
   <p className={styles.registrationIntro}>{step===1?'La fecha, la hora y el lugar son la base de tu carta natal. Tomate un momento para revisarlos.':step===2?'Usamos tu correo para acceder a la cuenta, tu WhatsApp para las lecturas y tu ciudad actual para el horario.':'Revisá especialmente el día y el mes. Con estos datos vamos a calcular tu carta y tus lecturas personales.'}</p>
   <form onSubmit={submit} className={styles.registrationForm}>
    {step===1&&<>
     <fieldset className={styles.birthFields}><legend>Fecha de nacimiento</legend><div className={styles.birthDateGrid}>
      <label htmlFor="birth-day">Día<select id="birth-day" name="birth_day" autoComplete="bday-day" value={values.birth_day} onChange={e=>change('birth_day',e.target.value)} required><option value="">Día</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={String(d)}>{d}</option>)}</select></label>
      <label htmlFor="birth-month">Mes<select id="birth-month" name="birth_month" autoComplete="bday-month" value={values.birth_month} onChange={e=>change('birth_month',e.target.value)} required><option value="">Mes</option>{monthNames.map((m,i)=><option key={m} value={String(i+1)}>{m}</option>)}</select></label>
      <label htmlFor="birth-year">Año<input id="birth-year" name="birth_year" type="text" inputMode="numeric" autoComplete="bday-year" pattern="[0-9]{4}" maxLength={4} placeholder="1989" value={values.birth_year} onChange={e=>change('birth_year',e.target.value.replace(/\D/g,''))} required/></label>
     </div>{dateLabel&&<p className={styles.dateConfirmation} role="status">Tu fecha de nacimiento: <strong>{dateLabel}</strong></p>}</fieldset>
     <fieldset className={styles.birthFields}><legend>Hora de nacimiento</legend><div className={styles.birthTimeGrid}><label htmlFor="birth-hour">Hora · de 00 a 23<select id="birth-hour" value={values.birth_hour} onChange={e=>change('birth_hour',e.target.value)} required><option value="">Hora</option>{Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}</select></label><label htmlFor="birth-minute">Minutos<select id="birth-minute" value={values.birth_min} onChange={e=>change('birth_min',e.target.value)} required><option value="">Minutos</option>{Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(m=><option key={m} value={m}>{m}</option>)}</select></label></div><p className={styles.fieldHint}>Usá la hora local de donde naciste. Por ejemplo, 04:50 es de madrugada y 16:50 es por la tarde.</p><details className={styles.timeHelp}><summary>No conozco mi hora exacta</summary><p>Podés buscarla en tu partida de nacimiento o consultar a tu familia. No inventes una hora: influye en el cálculo. Si no la conseguís, escribinos desde Ayuda antes de contratar.</p></details></fieldset>
     <div className={styles.placeGroup}><CityPicker label="Ciudad y país donde naciste" kind="birth" value={birthLocation} onChange={p=>{setBirthLocation(p);setConfirmed(false);}}/><p className={styles.fieldHint}>Es tu lugar de nacimiento, aunque hoy vivas en otra ciudad.</p></div>
    </>}
    {step===2&&<>
     <Input id="registration-name" label="Tu nombre completo" name="full_name" autoComplete="name" maxLength={100} required value={values.full_name} onChange={e=>change('full_name',e.target.value)} placeholder="María Pérez"/>
     <Input id="registration-email" label="Tu correo electrónico" name="email" autoComplete="email" type="email" maxLength={254} required value={values.email} onChange={e=>change('email',e.target.value)} placeholder="maria@email.com"/><p className={styles.fieldHint}>Después ingresás con un enlace que llega a este correo. No necesitás contraseña.</p>
     <Input id="registration-phone" label="Tu WhatsApp" name="phone_whatsapp" autoComplete="tel" type="tel" inputMode="tel" maxLength={30} required value={values.phone_whatsapp} onChange={e=>change('phone_whatsapp',e.target.value)} placeholder="+54 9 11 1234 5678"/><p className={styles.fieldHint}>Incluí + y el código de país. Para un celular argentino, por ejemplo: +54 9 11 1234 5678, sin 0 ni 15.</p>
     <div className={styles.placeGroup}><CityPicker label="Tu ciudad y país actuales" value={residence} onChange={setResidence}/><p className={styles.fieldHint}>Por defecto, a las 22 del día anterior en esta zona horaria. Podés cambiarlo e informar viajes desde tu cuenta.</p></div>
    </>}
    {step===3&&<>
     <section className={styles.reviewBlock}><header><h2>Tu nacimiento</h2><button type="button" onClick={()=>go(1)}>Editar ↗</button></header><dl><div><dt>Fecha</dt><dd className={styles.reviewDate}>{dateLabel}</dd></div><div><dt>Hora local</dt><dd>{values.birth_hour}:{values.birth_min} · formato de 24 horas</dd></div><div><dt>Lugar</dt><dd>{birthLocation?.label}</dd></div></dl></section>
     <section className={styles.reviewBlock}><header><h2>Tu cuenta y entrega</h2><button type="button" onClick={()=>go(2)}>Editar ↗</button></header><dl>{[['Nombre',values.full_name],['Correo',values.email],['WhatsApp',values.phone_whatsapp],['Ciudad actual',residence?.label??''],['Horario inicial','22:00 del día anterior · hora de tu ciudad']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
     <label className={styles.confirmCheck}><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>Confirmo que la fecha, la hora y el lugar de nacimiento son correctos.</span></label>
     <p className={styles.fieldHint}>En el siguiente paso vas a ver el plan y el precio antes de pagar.</p>
    </>}
    {error&&<div ref={errorBox} tabIndex={-1} role="alert" className={styles.errorMsg}>{error}</div>}
    <div className={styles.registrationActions}><Button type="submit" fullWidth disabled={busy}>{busy?'Preparando tu cuenta…':step===1?'Continuar con mis datos de contacto':step===2?'Revisar mis datos':'Continuar al pago'}</Button>{step>1&&<button type="button" disabled={busy} className={styles.backBtn} onClick={()=>go(step-1)}>← Volver sin perder mis datos</button>}</div>
   </form>
   <p className={styles.registrationPrivacy}>Tus datos se usan para preparar y entregar las lecturas. <Link href="/privacidad" target="_blank">Privacidad</Link> · <Link href="/terminos" target="_blank">Condiciones</Link></p>
  </section>
 </div></div>;
}
