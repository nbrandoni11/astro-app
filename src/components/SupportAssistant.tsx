'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SupportAssistant.module.css';
import { helpTopics, findHelpTopic, normalizeQuestion, type HelpTopic } from '@/lib/support-knowledge';

type Message = { text: string; from: 'you' | 'guide' };
export default function SupportAssistant() {
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [suggestions,setSuggestions]=useState(['delivery','payment','login','birth-data','personal','schedule']);
  const [unknownCount,setUnknownCount]=useState(0);
  const [lastTopic,setLastTopic]=useState<HelpTopic|null>(null);
  const field=useRef<HTMLInputElement>(null);
  const launcher=useRef<HTMLButtonElement>(null);
  const log=useRef<HTMLDivElement>(null);
  useEffect(()=>{ if(open) field.current?.focus(); },[open]);
  useEffect(()=>{ log.current?.scrollTo({top:log.current.scrollHeight}); },[messages]);
  function ask(question:string, topicId?:string) {
    const normalized=normalizeQuestion(question);
    const topic=topicId?helpTopics.find(t=>t.id===topicId):findHelpTopic(question);
    let reply:string;
    if(topic){reply=topic.answer;setSuggestions(topic.next??['delivery','payment','login']);setLastTopic(topic);setUnknownCount(0);}
    else if(/^(hola|buenas|buen dia|buenas tardes|buenas noches|hey)[!. ]*$/.test(normalized)){reply='Hola. Contame qué necesitás y lo vemos paso a paso. ¿Es una consulta sobre tu lectura, un pago o el acceso a tu cuenta?';setSuggestions(['delivery','payment','login','personal']);}
    else if(/gracias|perfecto|resuelto/.test(normalized)){reply='De nada. Si te surge otra duda, podés seguir preguntando por acá.';setSuggestions(['schedule','personal','payment']);}
    else if(lastTopic&&/^(si|no|como|y ahora|que hago)[?!. ]*$/.test(normalized)){reply='Para orientarte mejor, elegí cuál de estas situaciones se parece a la tuya.';setSuggestions(lastTopic.next??['contact']);}
    else {reply=unknownCount===0?'Quiero orientarte bien. ¿La consulta tiene que ver con una lectura, un pago, el acceso o tus datos? Elegí una opción y seguimos desde ahí.':'Con esa información todavía no puedo darte una respuesta segura. Podemos revisar otro tema de la guía o escribir al equipo con lo que me contaste.';setSuggestions(unknownCount===0?['delivery','payment','login','birth-data','travel','reports']:['contact','personal','privacy']);setUnknownCount(n=>n+1);}
    setMessages(old=>[...old.slice(-38),{text:question,from:'you'},{text:reply,from:'guide'}]);setInput('');
  }
  function close(){setOpen(false);launcher.current?.focus();}
  const conversation=messages.slice(-10).map(m=>`${m.from==='you'?'Consulta':'Guía'}: ${m.text}`).join('\n\n');
  const email='mailto:nbrandoni.exe@gmail.com?subject='+encodeURIComponent('Ayuda con ID Astral')+'&body='+encodeURIComponent(`Hola, necesito ayuda con ID Astral.\n\nConsulta: ${conversation}\n\nCorreo de mi cuenta:\nFecha del problema:\n\n`);
  return <div className={styles.support}>
    {open && <section className={styles.panel} role="dialog" aria-label="Ayuda de ID Astral" onKeyDown={e=>{if(e.key==='Escape')close();}}>
      <header><div><strong>¿En qué te ayudamos?</strong><p>Guía automática · sin acceso a tu cuenta</p></div><button type="button" onClick={close} aria-label="Cerrar ayuda">×</button></header>
      <div ref={log} className={styles.log} role="log" aria-live="polite" aria-relevant="additions">
        <p>Elegí un tema o contame qué sucede. Si esta guía no lo resuelve, podés escribirnos.</p>

        {messages.map((m,i)=><div key={i} className={m.from==='you'?styles.question:styles.answer}><span>{m.from==='you'?'Vos':'ID Astral · guía'}</span><p>{m.text}</p></div>)}
        <div className={styles.topics}>{suggestions.map(id=>helpTopics.find(t=>t.id===id)).filter((t):t is HelpTopic=>!!t).map(t=><button type="button" key={t.id} onClick={()=>ask(t.title,t.id)}>{t.title} ↗</button>)}</div>
      </div>
      <form onSubmit={e=>{e.preventDefault();if(input.trim())ask(input.trim());}}><label className={styles.srOnly} htmlFor="support-question">Tu consulta</label><input ref={field} id="support-question" value={input} onChange={e=>setInput(e.target.value)} maxLength={500} placeholder="Escribí tu consulta…"/><button type="submit" disabled={!input.trim()} aria-label="Enviar consulta">→</button></form>
      <footer><a href={email}>No se resolvió: escribir por correo ↗</a><small>Abre tu correo. Atención humana por email, sin respuesta inmediata garantizada.</small></footer>
    </section>}
    <button ref={launcher} type="button" className={styles.launcher} aria-expanded={open} onClick={()=>open?close():setOpen(true)}>{open?'Cerrar ayuda':'¿Necesitás ayuda?'} <span aria-hidden="true">{open?'−':'↗'}</span></button>
  </div>;
}
