export const GRACE_DAYS = 10;
export type BillingProfile = { subscription_status?: string | null; subscription_paid_until?: string | null; subscription_grace_until?: string | null };
export function subscriptionAccess(p: BillingProfile, now = new Date()) {
  const paid = Date.parse(p.subscription_paid_until ?? '');
  const grace = Date.parse(p.subscription_grace_until ?? '');
  const allowed = p.subscription_status === 'active' && Number.isFinite(paid) && Number.isFinite(grace) && now.getTime() < grace;
  return { allowed, inGrace: allowed && now.getTime() >= paid, paused: !allowed };
}
// Calendar months, clamping 29/30/31 to the last day of the destination month.
export function nextMonthlyDate(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid payment period');
  const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d.toISOString();
}
