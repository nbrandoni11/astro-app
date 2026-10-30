import { assertChart, planetNames, signNames } from '@/lib/chart-data';
import styles from '@/app/panel/panel.module.css';
const symbols: Record<string, string> = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Node: '☊', Chiron: '⚷' };
const zodiac = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

export default function AstroChart({ data, title }: { data: unknown; title: string }) {
  try { assertChart(data); } catch { return <p className={styles.helpText}>El gráfico estará disponible cuando se complete el cálculo.</p>; }
  const asc = data.houses[0].start_degree;
  const point = (degree: number, r: number) => {
    const rad = (180 - degree + asc) * Math.PI / 180;
    return [200 + r * Math.cos(rad), 200 - r * Math.sin(rad)];
  };
  const planets = data.houses.flatMap(h => h.planets.map(p => ({ ...p, house: h.house_id }))).sort((a,b) => a.full_degree-b.full_degree);
  return <>
    <svg viewBox="0 0 400 400" className={styles.chart} role="img" aria-label={title}>
      <title>{title}</title><desc>Rueda zodiacal con doce casas y posiciones planetarias. Los valores exactos se muestran en la tabla.</desc>
      {[185,157,112].map(r => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" opacity=".3" />)}
      {zodiac.map((symbol,i) => { const [x,y]=point(i*30+15,173); const [x1,y1]=point(i*30,157); const [x2,y2]=point(i*30,185); return <g key={symbol}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" opacity=".3" /><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="19" fill="currentColor">{symbol}</text></g>; })}
      {data.houses.map(h => { const [x,y]=point(h.start_degree,157); const [x2,y2]=point(h.start_degree,112); const mid=h.start_degree+((h.end_degree-h.start_degree+360)%360)/2; const [tx,ty]=point(mid,100); return <g key={h.house_id}><line x1={x} y1={y} x2={x2} y2={y2} stroke="currentColor" opacity=".4" /><text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="currentColor">{h.house_id}</text></g>; })}
      {planets.map((p,i) => { const near=planets.some((other,j)=>j<i && Math.abs(((other.full_degree-p.full_degree+540)%360)-180)<9); const [x,y]=point(p.full_degree,near ? 122 : 143); return <text key={p.name} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="15"><title>{planetNames[p.name]??p.name}: {p.full_degree.toFixed(2)}°, casa {p.house}</title>{symbols[p.name]??'•'}</text>; })}
      <text x="200" y="197" textAnchor="middle" fill="currentColor" fontSize="15">ID Astral</text><text x="200" y="216" textAnchor="middle" fill="currentColor" fontSize="10">Tropical · Placidus</text>
    </svg>
    <div className={styles.tableWrap}><table className={styles.chartTable}><caption>Posiciones planetarias</caption><thead><tr><th>Planeta</th><th>Posición</th><th>Casa</th></tr></thead><tbody>{planets.map(p=><tr key={p.name}><td>{planetNames[p.name]??p.name}{p.is_retro === true || p.is_retro === 'true' ? ' ℞' : ''}</td><td>{(p.full_degree%30).toFixed(2)}° {signNames[Math.floor(p.full_degree/30)%12]}</td><td>{p.house}</td></tr>)}</tbody></table></div>
  </>;
}
