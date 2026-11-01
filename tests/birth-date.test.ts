import test from 'node:test';
import assert from 'node:assert/strict';
import {birthDateISO,birthDateLabel} from '../src/lib/birth-date';
test('birth dates remain unambiguous: April 12 and December 4 are distinct',()=>{
 assert.equal(birthDateISO(12,4,1989),'1989-04-12');assert.equal(birthDateLabel(12,4,1989),'12 de abril de 1989');
 assert.equal(birthDateISO(4,12,1989),'1989-12-04');assert.equal(birthDateLabel(4,12,1989),'4 de diciembre de 1989');
});
test('invalid calendar dates never silently roll into the next month',()=>{
 assert.throws(()=>birthDateISO(31,4,1989));assert.throws(()=>birthDateISO(29,2,2025));assert.throws(()=>birthDateISO(0,4,1989));assert.throws(()=>birthDateISO(12,0,1989));assert.throws(()=>birthDateISO(12,4,NaN));assert.equal(birthDateISO(29,2,2024),'2024-02-29');
});
test('future dates and incomplete years are rejected',()=>{
 assert.throws(()=>birthDateISO(2,1,2027,new Date('2027-01-01T12:00:00Z')));assert.throws(()=>birthDateISO(12,4,198));
});
