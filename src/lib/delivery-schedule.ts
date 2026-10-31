import { localDate, localParts } from './location-time';
export type DeliveryPreferences = { delivery_day?: string | null; delivery_minute?: number | null };
export function deliveryPreferences(p: DeliveryPreferences) {
  return {day:p.delivery_day==='same_day'?'same_day':'previous_day',minute:Number.isInteger(p.delivery_minute)&&p.delivery_minute!>=0&&p.delivery_minute!<1440?p.delivery_minute!:1320};
}
export function deliveryTimeLabel(p: DeliveryPreferences) {
 const {minute}=deliveryPreferences(p);return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
}
export function scheduledReadingDate(p:DeliveryPreferences,timezone:string,now=new Date()) {
 const pref=deliveryPreferences(p);const local=localParts(now,timezone);
 if(local.hour*60+local.minute<pref.minute)return null;
 return localDate(now,timezone,pref.day==='previous_day'?1:0);
}
export function readingIsDue(p:DeliveryPreferences,readingDate:string,timezone:string,now=new Date()) {
 const pref=deliveryPreferences(p);const today=localDate(now,timezone);const max=localDate(now,timezone,pref.day==='previous_day'?1:0);
 // Never replay yesterday's accumulated readings, nor release future readings early.
 if(readingDate<today||readingDate>max)return false;
 if(pref.day==='previous_day'&&readingDate===today)return true;
 return scheduledReadingDate(p,timezone,now)===readingDate;
}
