import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionAccess,nextMonthlyDate} from '../src/lib/subscription-access';
import {checkoutToken,validCheckoutToken} from '../src/lib/checkout-token';
const p={subscription_status:'active',subscription_paid_until:'2026-11-01T10:00:00Z',subscription_grace_until:'2026-11-11T10:00:00Z'};
test('monthly renewal clamps month ends including leap years',()=>{
 assert.equal(nextMonthlyDate('2026-01-31T10:00:00Z'),'2026-02-28T10:00:00.000Z');
 assert.equal(nextMonthlyDate('2028-01-31T10:00:00Z'),'2028-02-29T10:00:00.000Z');
 assert.equal(nextMonthlyDate('2026-12-15T10:00:00Z'),'2027-01-15T10:00:00.000Z');
});
test('access continues for exactly ten days after monthly due time, then stops',()=>{
 assert.deepEqual(subscriptionAccess(p,new Date('2026-10-31')), {allowed:true,inGrace:false,paused:false});
 assert.equal(subscriptionAccess(p,new Date('2026-11-01T10:00:00Z')).inGrace,true);
 assert.equal(subscriptionAccess(p,new Date('2026-11-11T09:59:59Z')).allowed,true);
 assert.equal(subscriptionAccess(p,new Date('2026-11-11T10:00:00Z')).allowed,false);
 assert.equal(subscriptionAccess({...p,subscription_status:'paused'},new Date('2026-10-31')).allowed,false);
 assert.equal(subscriptionAccess({subscription_status:'active'}).allowed,false);
});
test('checkout authorization binds profile, email and expiry and rejects tampering',()=>{
 process.env.CRON_SECRET='test-signing-only';
 const token=checkoutToken('user-1','TEST@example.com');
 assert.equal(validCheckoutToken(token,'user-1','test@example.com'),true);
 assert.equal(validCheckoutToken(token,'user-2'),false);
 assert.equal(validCheckoutToken(token,'user-1','other@example.com'),false);
 assert.equal(validCheckoutToken(token+'x','user-1'),false);
 const realNow=Date.now;Date.now=()=>realNow()+86400001;
 try{assert.equal(validCheckoutToken(token,'user-1'),false);}finally{Date.now=realNow;}
});
