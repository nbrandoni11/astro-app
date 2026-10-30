import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryTimezone, effectiveLocation, localDate, localParts, offsetHours, validateLocation, wallTimeToUtc } from '../src/lib/location-time';
const home = { label:'Buenos Aires, Argentina',country:'Argentina',lat:-34.6,lon:-58.4,timezone:'America/Argentina/Buenos_Aires' };
const madrid = { label:'Madrid, Spain',country:'Spain',lat:40.4,lon:-3.7,timezone:'Europe/Madrid' };
test('residence and timezone preserve zero coordinates and validate inputs',()=>{
 assert.equal(validateLocation({...home,lat:0,lon:0}).lat,0);
 assert.throws(()=>validateLocation({...home,timezone:'Not/AZone'}));
 assert.throws(()=>validateLocation({...home,lat:NaN}));
});
test('target date follows local calendar, including year boundaries and fractional zones',()=>{
 const now=new Date('2026-12-31T23:00:00Z');
 assert.equal(localDate(now,home.timezone,1),'2027-01-01');
 assert.equal(localDate(now,'Pacific/Auckland',1),'2027-01-02');
 assert.equal(localParts(new Date('2026-01-01T16:15:00Z'),'Asia/Kathmandu').hour,22);
 assert.equal(offsetHours(now,'Asia/Kathmandu'),5.75);
});
test('trip begins at arrival and residence resumes at departure; cancelled trip ignored',()=>{
 const trip={location:madrid,starts_at:'2026-10-31T10:00:00Z',ends_at:'2026-11-04T10:00:00Z'};
 assert.equal(effectiveLocation(home,[trip],new Date('2026-10-31T09:59:59Z'))?.label,home.label);
 assert.equal(effectiveLocation(home,[trip],new Date(trip.starts_at))?.label,madrid.label);
 assert.equal(effectiveLocation(home,[trip],new Date(trip.ends_at))?.label,home.label);
 assert.equal(deliveryTimezone(home,[{...trip,cancelled_at:'2026-10-01'}],null,new Date(trip.starts_at)),home.timezone);
});
test('destination wall-clock conversion follows DST and rejects ambiguous and nonexistent times',()=>{
 assert.equal(wallTimeToUtc('2026-07-01T22:00','Europe/Madrid').toISOString(),'2026-07-01T20:00:00.000Z');
 assert.equal(wallTimeToUtc('2026-12-01T22:00','Europe/Madrid').toISOString(),'2026-12-01T21:00:00.000Z');
 assert.throws(()=>wallTimeToUtc('2026-03-29T02:30','Europe/Madrid'));
 assert.throws(()=>wallTimeToUtc('2026-10-25T02:30','Europe/Madrid'));
 assert.throws(()=>wallTimeToUtc('2026-02-30T12:00',home.timezone));
});
