'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SupportAssistant.module.css';

const topics = [
  { title: 'No recibí mi WhatsApp', words: ['whatsapp','mensaje','llega','recibi','envio'], answer: 'La lectura del día siguiente se programa a las 22 h de tu zona horaria. Revisá tu número, ubicación y estado de suscripción en el dashboard. Si Meta no entrega el mensaje, comprobá si la lectura está disponible en tu panel. Si persiste, escribinos con la fecha de la lectura y qué parte faltó.' },
  { title: 'Pagos y suscripción', words: ['pago','pagar','cobro','tarjeta','suscrip','pausa','mensual'], answer: 'El cobro es mensual por Mercado Pago. Si vence el período pagado, tenés 10 días de gracia. Después se pausan los mensajes y las lecturas nuevas; conservás acceso a tu cuenta e historial. Al confirmarse el pago se prepara la lectura del día y se intenta enviar enseguida. Podés regularizar el pago desde Gestionar suscripción.' },
  { title: 'No puedo entrar', words: ['entrar','acceso','login','correo','mail','enlace','sesion'], answer: 'Entrá en Mi cuenta con el correo que usaste al registrarte y solicitá un enlace de acceso. Revisá también spam y usá el enlace más reciente. Una suscripción pausada no bloquea el ingreso al dashboard. Nunca nos envíes contraseñas, códigos ni enlaces de acceso.' },
  { title: 'Mi lugar de nacimiento o viaje', words: ['lugar','ubicacion','mapa','maps','nacimiento','viaje','pais','hora'], answer: 'Buscá la ciudad y seleccioná una sugerencia completa con país y provincia. En el dashboard podés indicar tu residencia y viajes para ajustar la zona horaria de envío. Si no encontrás la ubicación correcta, no elijas una ciudad distinta: escribinos con el nombre de la localidad y país para revisarlo.' },
  { title: 'Carta natal y revolución solar', words: ['carta','natal','revolucion','solar','informe'], answer: 'Tu carta natal y los informes disponibles se consultan en el dashboard. La revolución solar se prepara cerca de tu cumpleaños usando la ubicación declarada. Si faltan datos o el informe no aparece, contactanos para revisar tu cuenta.' },
];
type Message = { text: string; from: 'you' | 'guide' };
export default function SupportAssistant() {
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const field=useRef<HTMLInputElement>(null);
  const launcher=useRef<HTMLButtonElement>(null);
  const log=useRef<HTMLDivElement>(null);
  useEffect(()=>{ if(open) field.current?.focus(); },[open]);
  useEffect(()=>{ log.current?.scrollTo({top:log.current.scrollHeight}); },[messages]);
  function ask(question:string) {
    const normalized=question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const ranked=topics.map(topic=>({topic,score:topic.words.filter(word=>normalized.includes(word)).length})).sort((a,b)=>b.score-a.score);
    const reply=ranked[0].score ? ranked[0].topic.answer : 'No tengo una respuesta segura para esa consulta. Podés escribirnos por correo con una descripción del problema. Esta guía no consulta tu cuenta ni modifica pagos o datos.';
    setMessages(old=>[...old,{text:question,from:'you'},{text:reply,from:'guide'}]);setInput('');
  }
  function close(){setOpen(false);launcher.current?.focus();}
  const lastQuestion=messages.filter(m=>m.from==='you').at(-1)?.text ?? '';
  const email='mailto:nbrandoni.exe@gmail.com?subject='+encodeURIComponent('Ayuda con ID Astral')+'&body='+encodeURIComponent(`Hola, necesito ayuda con ID Astral.\n\nConsulta: ${lastQuestion}\n\nCorreo de mi cuenta:\nFecha del problema:\n\n`);
  return <div className={styles.support}>
    {open && <section className={styles.panel} role="dialog" aria-label="Ayuda de ID Astral" onKeyDown={e=>{if(e.key==='Escape')close();}}>
      <header><div><strong>¿En qué te ayudamos?</strong><p>Guía automática · sin acceso a tu cuenta</p></div><button type="button" onClick={close} aria-label="Cerrar ayuda">×</button></header>
      <div ref={log} className={styles.log} role="log" aria-live="polite" aria-relevant="additions">
        <p>Elegí un tema o contame qué sucede. Si esta guía no lo resuelve, podés escribirnos.</p>
        <div className={styles.topics}>{topics.map(t=><button type="button" key={t.title} onClick={()=>ask(t.title)}>{t.title} ↗</button>)}</div>
        {messages.map((m,i)=><div key={i} className={m.from==='you'?styles.question:styles.answer}><span>{m.from==='you'?'Vos':'ID Astral · guía'}</span><p>{m.text}</p></div>)}
      </div>
      <form onSubmit={e=>{e.preventDefault();if(input.trim())ask(input.trim());}}><label className={styles.srOnly} htmlFor="support-question">Tu consulta</label><input ref={field} id="support-question" value={input} onChange={e=>setInput(e.target.value)} maxLength={500} placeholder="Escribí tu consulta…"/><button type="submit" disabled={!input.trim()} aria-label="Enviar consulta">→</button></form>
      <footer><a href={email}>No se resolvió: escribir por correo ↗</a><small>Abre tu correo. Atención humana por email, sin respuesta inmediata garantizada.</small></footer>
    </section>}
    <button ref={launcher} type="button" className={styles.launcher} aria-expanded={open} onClick={()=>open?close():setOpen(true)}>{open?'Cerrar ayuda':'¿Necesitás ayuda?'} <span aria-hidden="true">{open?'−':'↗'}</span></button>
  </div>;
}
