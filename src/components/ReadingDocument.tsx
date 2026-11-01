import ReactMarkdown from 'react-markdown';
import { readingChapters } from '@/lib/reading-format';
import styles from './ReadingDocument.module.css';
export default function ReadingDocument({text,kind='report',id='reading',collapsible=false}:{text:string;kind?:'daily'|'report';id?:string;collapsible?:boolean}){
 const chapters=readingChapters(text,kind);
 return <div className={styles.document}>
  <nav className={styles.contents} aria-label="Secciones de la lectura"><span>En esta lectura</span>{chapters.map((c,i)=><a key={i} href={`#${id}-${i}`}><small>{String(i+1).padStart(2,'0')}</small>{c.title.replace(/^\d+[.)]\s*/,'')}</a>)}</nav>
  <div className={styles.chapters}>{chapters.map((c,i)=>collapsible?<details key={i} className={styles.chapter} id={`${id}-${i}`} open={i===0}><summary><span className={styles.number}>{String(i+1).padStart(2,'0')}</span><h3>{c.title.replace(/^\d+[.)]\s*/,'')}</h3><span className={styles.toggle} aria-hidden="true">+</span></summary><div className={styles.prose}><ReactMarkdown>{c.body}</ReactMarkdown></div></details>:<section className={styles.chapter} key={i} id={`${id}-${i}`}><header><span className={styles.number}>{String(i+1).padStart(2,'0')}</span><h3>{c.title.replace(/^\d+[.)]\s*/,'')}</h3></header><div className={styles.prose}><ReactMarkdown>{c.body}</ReactMarkdown></div></section>)}</div>
 </div>;
}
