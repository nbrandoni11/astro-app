import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
process.env.GOOGLE_MAPS_API_KEY='test-only';
process.env.CRON_SECRET='test-only';
const placeId='ChIJ_Test12345',session='12345678-1234-1234-1234-123456789012';
async function setup(allowed=true) {
 const {supabaseAdmin}=await import('../src/lib/supabase-admin');
 const g=await import('../src/lib/google-places');
 let cached:unknown=null;const requests:Array<{url:string;init?:RequestInit}>=[];const operations:string[]=[];
 (supabaseAdmin as any).rpc=async(_name:string,args:{operation:string})=>{operations.push(args.operation);return {data:allowed,error:null};};
 (supabaseAdmin as any).from=()=>{
  const q:any={select(){return q;},eq(){return q;},gt(){return q;},maybeSingle:async()=>({data:cached?{location:cached}:null,error:null}),upsert:async(v:{location:unknown})=>{cached=v.location;return{error:null};}};return q;
 };
 globalThis.fetch=async(input,init)=>{
  const url=String(input);requests.push({url,init});
  if(url.includes('places:autocomplete'))return Response.json({suggestions:[{placePrediction:{placeId,text:{text:'Lugar de prueba, País'}}}]});
  if(url.includes('/places/'))return Response.json({id:placeId,formattedAddress:'Lugar de prueba, País',location:{latitude:0,longitude:0},addressComponents:[{types:['country'],longText:'País'}]});
  if(url.includes('/timezone/'))return Response.json({status:'OK',timeZoneId:'Etc/UTC'});
  throw new Error('Unexpected fetch');
 };
 return {g,requests,operations};
}
test('signed selections are bound to the place/session, expire, and reject tampering',async()=>{
 const {g}=await setup();const token=g.selectionToken(placeId,session);
 assert.equal(g.validSelection(placeId,session,token),true);
 assert.equal(g.validSelection('ChIJ_Other12345',session,token),false);
 assert.equal(g.validSelection(placeId,session+'x',token),false);
 assert.equal(g.validSelection(placeId,session,g.selectionToken(placeId,session,Date.now()-1)),false);
 assert.equal(g.validSelection(placeId,session,'bad'),false);
});
test('autocomplete and resolution use minimal Essentials fields; zero coordinates are accepted',async()=>{
 const {g,requests,operations}=await setup();const results=await g.autocomplete('Lugar',session,'client',false);
 assert.equal(results.length,1);assert.ok(g.validSelection(placeId,session,results[0].selection_token));
 const resolved=await g.resolveGooglePlace(placeId,session,'client');
 assert.equal(resolved.lat,0);assert.equal(resolved.timezone,'Etc/UTC');
 assert.deepEqual(operations,['autocomplete','details','timezone']);
 const details=requests.find(r=>r.url.includes('/places/'))!;
 assert.equal((details.init?.headers as Record<string,string>)['X-Goog-FieldMask'],'id,formattedAddress,addressComponents,location');
 const count=requests.length;await g.resolveGooglePlace(placeId,session,'client');assert.equal(requests.length,count);
 const stored=g.storedLocation({...resolved,input_label:'Mi búsqueda'});
 assert.equal('lat' in stored,false);assert.equal('lon' in stored,false);assert.equal(stored.label,'Mi búsqueda');
});
test('quota rejection prevents all Google traffic and search returns the local fallback',async()=>{
 const {g,requests}=await setup(false);
 await assert.rejects(g.autocomplete('Lugar',session,'client',false));assert.equal(requests.length,0);
 const {GET}=await import('../src/app/api/places/search/route');
 const r=await GET(new Request(`https://example.com/api/places/search?q=Lugar&session=${session}`));
 assert.equal((await r.json()).fallback,true);assert.equal(requests.length,0);
});
test('invalid public lookup never reaches Google and no key is returned to clients',async()=>{
 const {requests}=await setup();const {POST}=await import('../src/app/api/places/resolve/route');
 const r=await POST(new Request('https://example.com/api/places/resolve',{method:'POST',body:JSON.stringify({place_id:placeId,session,selection_token:'bad'})}));
 assert.equal(r.status,400);assert.equal(requests.length,0);assert.ok(!(await r.text()).includes(process.env.GOOGLE_MAPS_API_KEY!));
});
test('provider rejection diagnostics redact the API key',async()=>{
 const {g}=await setup();const oldError=console.error;const messages:string[]=[];
 console.error=(...args:unknown[])=>{messages.push(args.map(String).join(' '));};
 globalThis.fetch=async()=>Response.json({error:{status:'PERMISSION_DENIED',message:`Rejected key ${process.env.GOOGLE_MAPS_API_KEY}`,details:[{reason:'API_KEY_SERVICE_BLOCKED'}]}},{status:403});
 try{await assert.rejects(g.autocomplete('Lugar',session,'client',false));}
 finally{console.error=oldError;}
 assert.ok(messages.join('').includes('API_KEY_SERVICE_BLOCKED'));
 assert.ok(!messages.join('').includes(process.env.GOOGLE_MAPS_API_KEY!));
});
