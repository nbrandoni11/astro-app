import type { ChartData } from './chart-data';
export const aspectStyles={Conjunction:{label:'Conjunción',symbol:'☌',color:'#d6bd8a'},Sextile:{label:'Sextil',symbol:'⚹',color:'#73b6a9'},Square:{label:'Cuadratura',symbol:'□',color:'#db8c86'},Trine:{label:'Trígono',symbol:'△',color:'#81a9db'},Opposition:{label:'Oposición',symbol:'☍',color:'#d8a177'}} as const;
export type AspectType=keyof typeof aspectStyles;
export function chartAspects(data:ChartData){
 const names=new Set(data.houses.flatMap(h=>h.planets.map(p=>p.name)));
 return (Array.isArray(data.aspects)?data.aspects:[]).filter(a=>a.type in aspectStyles&&names.has(a.aspecting_planet)&&names.has(a.aspected_planet)&&Number.isFinite(a.orb)).sort((a,b)=>a.orb-b.orb);
}
export function degreeLabel(longitude:number){const d=((longitude%360)+360)%360;const minutes=Math.floor((d%30)*60+1e-6);return `${Math.floor(minutes/60)}° ${String(minutes%60).padStart(2,'0')}′`;}
