import test from 'node:test';
import assert from 'node:assert/strict';
import {readingChapters} from '../src/lib/reading-format';
import {chartAspects,degreeLabel} from '../src/lib/chart-aspects';
import type {ChartData} from '../src/lib/chart-data';
test('legacy plain daily text gets six chapters without losing body',()=>{
 const titles=['Panorama general','Trabajo y dinero','Relaciones','Energía interna','Síntesis del día','Base astrológica'];
 const parsed=readingChapters(titles.map((t,i)=>`${t} Contenido original ${i}.`).join('\n'),'daily');
 assert.equal(parsed.length,6);titles.forEach((t,i)=>{assert.equal(parsed[i].title,t);assert.equal(parsed[i].body,`Contenido original ${i}.`);});
});
test('bold numbered natal headings and literal newlines retain paragraphs',()=>{
 const parsed=readingChapters('**1. Personalidad profunda**\\n\\nPrimer párrafo.\\n\\nSegundo párrafo.\\n\\n**2. Vínculos**\\n\\nOtro contenido.');
 assert.equal(parsed.length,2);assert.equal(parsed[0].title,'1. Personalidad profunda');assert.equal(parsed[0].body,'Primer párrafo.\n\nSegundo párrafo.');assert.equal(parsed[1].body,'Otro contenido.');
});
test('only existing principal aspects with valid endpoints are drawn, ordered by orb',()=>{
 const data={houses:[{planets:[{name:'Sun'},{name:'Moon'}]}],aspects:[{type:'Square',aspecting_planet:'Sun',aspected_planet:'Moon',orb:3},{type:'Trine',aspecting_planet:'Sun',aspected_planet:'Moon',orb:1},{type:'Quintile',aspecting_planet:'Sun',aspected_planet:'Moon',orb:0},{type:'Opposition',aspecting_planet:'Sun',aspected_planet:'Missing',orb:2}]} as unknown as ChartData;
 assert.deepEqual(chartAspects(data).map(a=>a.type),['Trine','Square']);assert.equal(degreeLabel(359.999),'29° 59′');assert.equal(degreeLabel(30),'0° 00′');
});
