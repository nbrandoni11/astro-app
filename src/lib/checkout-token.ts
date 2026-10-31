import { createHmac, timingSafeEqual } from 'node:crypto';
export function checkoutToken(userId:string,email:string) {
 const data=Buffer.from(JSON.stringify({userId,email:email.toLowerCase(),expires:Date.now()+86400000})).toString('base64url');
 const key=process.env.CRON_SECRET; if(!key) throw new Error('Checkout signing not configured');
 return `${data}.${createHmac('sha256',key).update(data).digest('base64url')}`;
}
export function validCheckoutToken(token:unknown,userId:string,email?:string) {
 try {
  if(typeof token!=='string'||token.length>2000||!process.env.CRON_SECRET)return false;
  const [data,sig]=token.split('.');
  const a=Buffer.from(sig??'','base64url'), b=createHmac('sha256',process.env.CRON_SECRET).update(data).digest();
  if(a.length!==b.length||!timingSafeEqual(a,b))return false;
  const p=JSON.parse(Buffer.from(data,'base64url').toString());
  return p.userId===userId && (!email||p.email===email.toLowerCase()) && p.expires>Date.now();
 }catch{return false;}
}
