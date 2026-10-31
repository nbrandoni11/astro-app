import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryPreferences, deliveryTimeLabel, scheduledReadingDate, readingIsDue } from '../src/lib/delivery-schedule';
const zone='America/Argentina/Buenos_Aires';
test('default schedule releases tomorrow at 22 local, never before',()=>{
 assert.deepEqual(deliveryPreferences({}),{day:'previous_day',minute:1320});
 assert.equal(deliveryTimeLabel({}),'22:00');
 assert.equal(scheduledReadingDate({},zone,new Date('2026-11-01T00:59:00Z')),null);
 assert.equal(scheduledReadingDate({},zone,new Date('2026-11-01T01:00:00Z')),'2026-11-01');
});
test('same-day schedule follows the selected local hour including quarter hours',()=>{
 const p={delivery_day:'same_day',delivery_minute:8*60+15};
 assert.equal(scheduledReadingDate(p,zone,new Date('2026-10-31T11:14:59Z')),null);
 assert.equal(scheduledReadingDate(p,zone,new Date('2026-10-31T11:15:00Z')),'2026-10-31');
 assert.equal(deliveryTimeLabel(p),'08:15');
});
test('changing timezone and daylight saving follows local wall time',()=>{
 const p={delivery_day:'same_day',delivery_minute:8*60};
 assert.equal(scheduledReadingDate(p,'Europe/Madrid',new Date('2026-07-01T06:00:00Z')),'2026-07-01');
 assert.equal(scheduledReadingDate(p,'Europe/Madrid',new Date('2026-12-01T06:00:00Z')),null);
 assert.equal(scheduledReadingDate(p,'Europe/Madrid',new Date('2026-12-01T07:00:00Z')),'2026-12-01');
});
test('pending delivery respects a later changed preference and excludes stale readings',()=>{
 const now=new Date('2026-10-31T15:00:00Z');
 assert.equal(readingIsDue({delivery_day:'same_day',delivery_minute:18*60},'2026-10-31',zone,now),false);
 assert.equal(readingIsDue({delivery_day:'same_day',delivery_minute:8*60},'2026-11-01',zone,now),false);
 assert.equal(readingIsDue({},'2026-10-30',zone,now),false);
 assert.equal(readingIsDue({},'2026-10-31',zone,now),true);
});
