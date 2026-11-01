export const monthNames=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export function birthDateISO(day:number,month:number,year:number,now=new Date()){
 if(![day,month,year].every(Number.isInteger)||year<1900||month<1||month>12||day<1||day>31)throw Error('Revisá el día, el mes y el año de nacimiento.');
 const date=new Date(Date.UTC(year,month-1,day,12));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw Error('Esa fecha no existe. Revisá el día y el mes.');
 if(date.toISOString().slice(0,10)>now.toISOString().slice(0,10))throw Error('La fecha de nacimiento no puede ser futura.');
 return date.toISOString().slice(0,10);
}
export function birthDateLabel(day:number,month:number,year:number){const iso=birthDateISO(day,month,year);return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`));}
