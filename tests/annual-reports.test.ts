import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
process.env.OPENAI_API_KEY='test-only';
const chart={houses:Array.from({length:12},(_,i)=>({house_id:i+1,start_degree:i*30,end_degree:((i+1)*30)%360,sign:'Aries',planets:i===0?[{name:'Sun',sign:'Aries',full_degree:10}]:[]})),aspects:[]};
const home={label:'Reference City',country:'Example',lat:0,lon:0,timezone:'Etc/UTC'};
const profile=()=>({id:'test-user',natal_chart:chart,natal_interpretation:'Stored natal reading',residence:home,birth_day:15,birth_month:6,birth_year:1990,birth_hour:12,birth_min:0,birth_lat:0,birth_lon:0,birth_tzone:-3});
async function setup({badSun=false,denied=false}={}) {
 const {supabaseAdmin}=await import('../src/lib/supabase-admin');
 const {ensureAnnualReports}=await import('../src/lib/annual-reports');
 const rows:Record<string,any>[]=[]; let calls=0;
 (supabaseAdmin as any).from=()=>{
   let mode='select', values:any,filters:Record<string,any>={};
   const q:any={insert(v:any){mode='insert';values=v;return q;},update(v:any){mode='update';values=v;return q;},select(){return q;},match(v:any){Object.assign(filters,v);return q;},eq(k:string,v:any){filters[k]=v;return q;},single(){return Promise.resolve(exec());},maybeSingle(){return Promise.resolve(exec());},then(resolve:any,reject:any){return Promise.resolve(exec()).then(resolve,reject);}};
   function exec(){
     if(mode==='insert'){
       if(rows.some(r=>r.user_id===values.user_id&&r.kind===values.kind&&r.year===values.year&&r.location_key===values.location_key)) return {data:null,error:{code:'23505'}};
       const row={...values,id:`id-${rows.length}`,updated_at:new Date().toISOString()};rows.push(row);return {data:row,error:null};
     }
     const row=rows.find(r=>Object.entries(filters).every(([k,v])=>r[k]===v));
     if(mode==='update'&&row)Object.assign(row,values);
     return {data:row??null,error:null};
   }
   return q;
 };
 globalThis.fetch=async(input,init)=>{
   calls++;const url=String(input);
   if(url.includes('solar_return_details')){const b=JSON.parse(String(init?.body)); return Response.json(denied?{status:false}:{solar_return_date:`${String(b.month).padStart(2,'0')}-${String(b.day).padStart(2,'0')}-${b.solar_year} 12:00:00`},{status:denied?403:200});}
   if(url.includes('western_chart_data'))return Response.json(badSun?{...chart,houses:chart.houses.map((h,i)=>i? h:{...h,planets:[{name:'Sun',sign:'Aries',full_degree:11}]})}:chart);
   if(url.includes('chat/completions'))return Response.json({choices:[{message:{content:'# Panorama del ciclo\nLectura anual de prueba.'}}]});
   throw new Error('Unexpected external call');
 };
 return {ensureAnnualReports,rows,getCalls:()=>calls};
}
test('annual report uses exact return instant and declared place; repeat reuses stored report',async()=>{
 const s=await setup();await s.ensureAnnualReports(profile(),[],new Date('2026-07-01T00:00:00Z'));
 const report=s.rows.find(r=>r.kind==='solar');assert.equal(report?.status,'ready');assert.equal(report?.return_at,'2026-06-15T15:00:00.000Z');assert.equal(report?.location.lat,0);
 const calls=s.getCalls();await s.ensureAnnualReports(profile(),[],new Date('2026-07-02'));assert.equal(s.getCalls(),calls);
});
test('return location follows trip at exact instant and creates a separate location version',async()=>{
 const s=await setup();const p=profile();await s.ensureAnnualReports(p,[],new Date('2026-07-01'));
 const trip={location:{...home,lat:20,lon:10,label:'Destination'},starts_at:'2026-06-15T14:00:00Z',ends_at:'2026-06-16T14:00:00Z'};
 await s.ensureAnnualReports(p,[trip],new Date('2026-07-02'));
 assert.equal(s.rows.filter(r=>r.kind==='solar').length,2);
 assert.equal(s.rows.find(r=>r.location_basis==='trip')?.location.label,'Destination');
});
test('wrong solar position blocks publication and records the failure',async()=>{
 const s=await setup({badSun:true});await assert.rejects(s.ensureAnnualReports(profile(),[],new Date('2026-07-01')),/verificación solar/);
 assert.equal(s.rows.filter(r=>r.kind==='solar').length,0);assert.equal(s.rows[0].status,'error');
});
test('provider entitlement failure is explicit, without a fabricated annual interpretation',async()=>{
 const s=await setup({denied:true});await assert.rejects(s.ensureAnnualReports(profile(),[],new Date('2026-07-01')),/403/);
 assert.equal(s.rows.some(r=>r.kind==='solar'&&r.status==='ready'),false);
});

test('prepare upcoming cycle only inside 30-day window, keeping current cycle',async()=>{
 const s=await setup();await s.ensureAnnualReports(profile(),[],new Date('2026-05-01'));
 assert.deepEqual(s.rows.filter(r=>r.kind==='solar').map(r=>r.year),[2025]);
 await s.ensureAnnualReports(profile(),[],new Date('2026-05-20'));
 assert.deepEqual(s.rows.filter(r=>r.kind==='solar').map(r=>r.year),[2025,2026]);
});
test('January birthday is prepared in December and missing residence never invents a place',async()=>{
 const s=await setup();await s.ensureAnnualReports({...profile(),birth_day:5,birth_month:1},[],new Date('2026-12-20'));
 assert.deepEqual(s.rows.filter(r=>r.kind==='solar').map(r=>r.year),[2026,2027]);
 const empty=await setup();await empty.ensureAnnualReports({...profile(),residence:null},[],new Date('2026-07-01'));
 assert.equal(empty.rows.filter(r=>r.kind==='solar').length,0);
 assert.equal(empty.rows.find(r=>r.kind==='solar-event')?.status,'ready');
});
