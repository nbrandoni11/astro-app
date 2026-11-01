'use client';
import { useState } from 'react';
import { assertChart, planetNames, signNames, type ChartData } from '@/lib/chart-data';
import { aspectStyles, chartAspects, degreeLabel, type AspectType } from '@/lib/chart-aspects';
import styles from './AstroChart.module.css';
const symbols:Record<string,string>={Sun:'☉',Moon:'☽',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇',Node:'☊',Chiron:'⚷','Part of Fortune':'⊗'};
const zodiac=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const types=Object.keys(aspectStyles) as AspectType[];
export default function AstroChart({data,title}:{data:unknown;title:string}){
 try{assertChart(data);}catch{return <p>El gráfico estará disponible cuando se complete el cálculo.</p>;}
 return <ChartView data={data} title={title}/>;
}
function ChartView({data,title}:{data:ChartData;title:string}){
 const [enabled,setEnabled]=useState<AspectType[]>(types);const [selected,setSelected]=useState<string|null>(null);
 const asc=data.houses[0].start_degree;
 const point=(degree:number,r:number)=>{const rad=(180-degree+asc)*Math.PI/180;return [300+r*Math.cos(rad),300-r*Math.sin(rad)];};
 const planets=data.houses.flatMap(h=>h.planets.map(p=>({...p,house:h.house_id}))).sort((a,b)=>a.full_degree-b.full_degree);
 const aspects=chartAspects(data);const visible=aspects.filter(a=>enabled.includes(a.type as AspectType)&&(!selected||a.aspecting_planet===selected||a.aspected_planet===selected));
 const lookup=new Map(planets.map(p=>[p.name,p]));
 const bigThree=[{label:'Sol',planet:lookup.get('Sun')},{label:'Luna',planet:lookup.get('Moon')},{label:'Ascendente',planet:{name:'Ascendant',full_degree:asc,house:1}}];
 return <div className={styles.root}>
  <div className={styles.bigThree}>{bigThree.map(({label,planet})=>planet&&<div key={label}><span>{label}</span><strong>{signNames[Math.floor(((planet.full_degree%360)+360)%360/30)]}</strong><small>{degreeLabel(planet.full_degree)}</small></div>)}</div>
  <div className={styles.layout}>
   <div className={styles.wheelPanel}>
    <p className={styles.eyebrow}>Posiciones y aspectos</p>
    <svg viewBox="0 0 600 600" className={styles.chart} role="img" aria-label={title}>
     <title>{title}</title><desc>Rueda zodiacal con doce casas, planetas y aspectos principales en colores. Usá los filtros y la lista de aspectos para explorar las relaciones.</desc>
     <circle cx="300" cy="300" r="270" fill="#0c1525"/>
     {[264,226,180,151].map(r=><circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#bda778" opacity={r===151?'.14':'.35'}/>)}
     {Array.from({length:72},(_,i)=>{const [x1,y1]=point(i*5,260);const [x2,y2]=point(i*5,i%6===0?250:256);return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#bda778" opacity=".35"/>;})}
     {zodiac.map((symbol,i)=>{const [x,y]=point(i*30+15,244);const [x1,y1]=point(i*30,226);const [x2,y2]=point(i*30,264);return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#bda778" opacity=".3"/><text x={x} y={y} textAnchor="middle" dominantBaseline="central" className={styles.zodiac}>{symbol+'\uFE0E'}</text></g>;})}
     {data.houses.map(h=>{const [x,y]=point(h.start_degree,226);const [x2,y2]=point(h.start_degree,151);const mid=h.start_degree+((h.end_degree-h.start_degree+360)%360)/2;const [tx,ty]=point(mid,166);return <g key={h.house_id}><line x1={x} y1={y} x2={x2} y2={y2} stroke={h.house_id===1||h.house_id===10?'#d9c393':'#a4adc2'} opacity=".35"/><text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="#a6b0c2">{h.house_id}</text></g>;})}
     {visible.map((a,i)=>{const p1=lookup.get(a.aspecting_planet)!;const p2=lookup.get(a.aspected_planet)!;const [x1,y1]=point(p1.full_degree,149);const [x2,y2]=point(p2.full_degree,149);const spec=aspectStyles[a.type as AspectType];return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={spec.color} opacity={selected?'.9':'.58'} strokeWidth={selected?2:1.3} strokeDasharray={a.type==='Sextile'?'4 4':undefined}><title>{planetNames[p1.name]??p1.name} · {spec.label} · {planetNames[p2.name]??p2.name} · orbe {a.orb.toFixed(2)}°</title></line>;})}
     {planets.map((p,i)=>{const close=planets.filter((q,j)=>j<i&&Math.abs(((q.full_degree-p.full_degree+540)%360)-180)<11).length;const r=213-(close%3)*20;const [x,y]=point(p.full_degree,r);const [tx,ty]=point(p.full_degree,180);const active=selected===p.name;return <g key={p.name}><line x1={tx} y1={ty} x2={x} y2={y} stroke="#d6bf8e" opacity=".32"/><circle cx={x} cy={y} r="13" fill={active?'#d8bd87':'#0c1525'}/><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="21" fill={active?'#111b2d':'#e9d7b5'} className={styles.planet} role="button" tabIndex={0} aria-label={`Explorar aspectos de ${planetNames[p.name]??p.name}`} aria-pressed={active} onClick={()=>setSelected(active?null:p.name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(active?null:p.name);}}}><title>{planetNames[p.name]??p.name}: {degreeLabel(p.full_degree)}, casa {p.house}</title>{(symbols[p.name]??'•')+'\uFE0E'}</text></g>;})}
     {['ASC','MC'].map((label,i)=>{const house=data.houses[i===0?0:9];const [x,y]=point(house.start_degree,284);return <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" letterSpacing="1" fill="#e5c992">{label}</text>;})}
    </svg>
    <div className={styles.filters} aria-label="Filtrar aspectos">{types.map(type=><button type="button" key={type} aria-pressed={enabled.includes(type)} onClick={()=>setEnabled(old=>old.includes(type)?old.filter(t=>t!==type):[...old,type])}><span style={{color:aspectStyles[type].color}}>{aspectStyles[type].symbol}</span>{aspectStyles[type].label}</button>)}</div>
    <p className={styles.hint}>Tocá un planeta para destacar sus aspectos. Los colores distinguen tipos de relación, no resultados buenos o malos.</p>
    {selected&&<button type="button" className={styles.reset} onClick={()=>setSelected(null)}>Ver todos los planetas</button>}
   </div>
   <aside className={styles.details}>
    <h3>{selected?`Aspectos de ${planetNames[selected]??selected}`:'Relaciones planetarias'}</h3><p className={styles.hint}>Aspectos principales del cálculo guardado, ordenados por menor orbe.</p>
    <div className={styles.aspects}>{visible.length?visible.map((a,i)=><div className={styles.aspect} key={i}><span className={styles.aspectSymbol} style={{color:aspectStyles[a.type as AspectType].color}}>{aspectStyles[a.type as AspectType].symbol}</span><div><strong>{planetNames[a.aspecting_planet]??a.aspecting_planet} · {planetNames[a.aspected_planet]??a.aspected_planet}</strong><span>{aspectStyles[a.type as AspectType].label}</span></div><small>{a.orb.toFixed(2)}°<span>orbe</span></small></div>):<p className={styles.hint}>No hay aspectos principales para los filtros seleccionados.</p>}</div>
   </aside>
  </div>
  <details className={styles.positions}><summary>Explorar posiciones planetarias <span>Grados, signos y casas</span></summary><div className={styles.positionGrid}>{planets.map(p=><div key={p.name} className={styles.position}><span className={styles.positionSymbol}>{(symbols[p.name]??'•')+'\uFE0E'}</span><div><strong>{planetNames[p.name]??p.name}{p.is_retro===true||p.is_retro==='true'?' ℞':''}</strong><p>{signNames[Math.floor(((p.full_degree%360)+360)%360/30)]} · {degreeLabel(p.full_degree)}</p><small>Casa {p.house}</small></div></div>)}</div></details>
 </div>;
}
