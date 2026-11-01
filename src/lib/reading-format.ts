export type ReadingChapter={title:string;body:string};
const dailyTitles=['Panorama general','Trabajo y dinero','Relaciones','Energía interna','Síntesis del día','Base astrológica'];
export function readingChapters(raw:string,kind:'daily'|'report'='report'):ReadingChapter[]{
 let text=raw.replace(/\\n/g,'\n').replace(/\r\n/g,'\n').trim();
 if(kind==='daily')for(const title of dailyTitles){
  text=text.replace(new RegExp(`(?:^|\\n)(?:#{1,4}\\s*|\\*\\*)?${title}(?:\\*\\*)?\\s*:?\\s*`,'g'),`\n\n## ${title}\n\n`);
 }
 text=text.replace(/^\s*\*\*((?:\d+[.)]\s*)?[^*\n]{3,90})\*\*\s*$/gm,'## $1');
 const blocks=text.split(/^#{1,4}\s+(.+)$/gm);const result:ReadingChapter[]=[];
 if(blocks[0].trim())result.push({title:kind==='daily'?'Tu lectura':'Introducción',body:blocks[0].trim()});
 for(let i=1;i<blocks.length;i+=2)result.push({title:blocks[i].replace(/\*\*/g,'').trim(),body:(blocks[i+1]??'').trim()});
 return result.length?result:[{title:'Tu lectura',body:text}];
}
