import { nextMonthlyDate } from "./subscription-access";
import { resolveBirthProfile } from "./google-places";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateNatalChart } from "@/lib/generate-natal-chart";

export type MercadoPagoSubscription = {
  id: string;
  status?: string;
  external_reference?: string | number | null;
  init_point?: string | null;
  next_payment_date?: string | null;
  payer_email?: string | null;
  auto_recurring?: {frequency:number;frequency_type:string;transaction_amount?:number};
};

async function mpFetch(path: string) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Mercado Pago respondió ${response.status}`
    );
  }

  return data;
}

export async function getMercadoPagoSubscription(id: string) {
  return (await mpFetch(
    `/preapproval/${encodeURIComponent(id)}`
  )) as MercadoPagoSubscription;
}

async function ensureNatalChart(authUserId: string) {
  const { data: rawUser, error } = await supabaseAdmin
    .from("users")
    .select(
      "birth_day,birth_month,birth_year,birth_hour,birth_min,birth_lat,birth_lon,birth_tzone,birth_google_place_id,natal_chart,natal_interpretation"
    )
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !rawUser) {
    throw new Error("No se pudieron obtener los datos natales del usuario");
  }

  if (rawUser.natal_chart && rawUser.natal_interpretation) {
    return false;
  }
  const user = await resolveBirthProfile(rawUser);

  const { astroData, interpretation } = await generateNatalChart({
    day: user.birth_day,
    month: user.birth_month,
    year: user.birth_year,
    hour: user.birth_hour,
    min: user.birth_min,
    lat: user.birth_lat,
    lon: user.birth_lon,
    tzone: user.birth_tzone,
  });

  const { error: saveError } = await supabaseAdmin
    .from("users")
    .update({
      natal_chart: astroData,
      natal_interpretation: interpretation,
      natal_chart_generated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", authUserId);

  if (saveError) {
    throw new Error("Error guardando la carta natal");
  }

  return true;
}

// Authorization of automatic debits is not proof that an installment was paid.
export async function syncMercadoPagoSubscriptionById(subscriptionId: string) {
  const subscription = await getMercadoPagoSubscription(subscriptionId);
  const {data: profile,error}=await supabaseAdmin.from("users").select("*").eq("mercadopago_subscription_id",subscription.id).maybeSingle();
  if(error || !profile || String(subscription.external_reference)!==profile.auth_user_id) throw new Error("Suscripción no vinculada al perfil");
  const mpStatus=subscription.status || "unknown";
  // Never extend local paid access merely because next_payment_date advances.
  const {error:updateError}=await supabaseAdmin.from("users").update({
    mercadopago_subscription_status:mpStatus,
    mercadopago_subscription_init_point:subscription.init_point??null,
    subscription_next_payment_at:subscription.next_payment_date??null,
    ...(["cancelled","canceled"].includes(mpStatus)?{subscription_status:"inactive"}:{}),
  }).eq("id",profile.id).eq("mercadopago_subscription_id",subscription.id);
  if(updateError) throw updateError;
  const invoices=await mpFetch(`/authorized_payments/search?preapproval_id=${encodeURIComponent(subscription.id)}&limit=100`);
  if((invoices.paging?.total??0)>100) throw new Error("Se requiere paginar historial de cobros");
  for(const invoice of (invoices.results??[]).sort((a:any,b:any)=>Date.parse(a.debit_date)-Date.parse(b.debit_date))) {
    if(invoice.payment?.status==="approved") await syncMercadoPagoAuthorizedPaymentById(String(invoice.id));
  }
  const {error:expiryError}=await supabaseAdmin.rpc("expire_subscription_access");
  if(expiryError)throw expiryError;
  const {data: updated}=await supabaseAdmin.from("users").select("subscription_status").eq("id",profile.id).single();
  return {subscription,authUserId:profile.auth_user_id,userId:profile.id,subscription_status:updated?.subscription_status,natalChartGenerated:false};
}

export async function syncMercadoPagoAuthorizedPaymentById(authorizedPaymentId:string) {
 const invoice=await mpFetch(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`);
 const subscriptionId=String(invoice.preapproval_id||"");
 if(!subscriptionId) throw new Error("Factura sin suscripción");
 const subscription=await getMercadoPagoSubscription(subscriptionId);
 const {data:profile,error}=await supabaseAdmin.from("users").select("id,auth_user_id,mercadopago_subscription_id").eq("mercadopago_subscription_id",subscriptionId).maybeSingle();
 if(error||!profile||String(subscription.external_reference)!==profile.auth_user_id) throw new Error("Factura no vinculada al perfil");
 const paymentId=invoice.payment?.id?String(invoice.payment.id):null;
 if(!paymentId || invoice.payment.status!=="approved")return {approved:false,paymentId,userId:profile.id};
 const payment=await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
 const amount=Number(invoice.transaction_amount);
 if(payment.status!=="approved" || payment.currency_id!=="ARS" || invoice.currency_id!=="ARS" || amount<4990 || Number(payment.transaction_amount)!==amount || Number(payment.transaction_amount_refunded??0)>0 || payment.live_mode!==true) {
   return {approved:false,paymentId,userId:profile.id};
 }
 const recurring=subscription.auto_recurring;
 if(recurring?.frequency!==1 || recurring.frequency_type!=="months")throw new Error("La suscripción no es mensual");
 const paidAt=new Date(payment.date_approved).toISOString();
 const debitAt=new Date(invoice.debit_date).toISOString();
 const periodEnd=nextMonthlyDate(paidAt>debitAt?paidAt:debitAt);
 const {data,error:saveError}=await supabaseAdmin.rpc("record_subscription_payment",{p_user_id:profile.id,p_subscription_id:subscriptionId,p_payment_id:paymentId,p_invoice_id:String(invoice.id),p_paid_at:paidAt,p_period_end:periodEnd,p_amount:amount});
 if(saveError)throw saveError;
 return {approved:true,paymentId,userId:profile.id,result:data};
}

export async function syncMercadoPagoPaymentById(paymentId:string) {
 const invoices=await mpFetch(`/authorized_payments/search?payment_id=${encodeURIComponent(paymentId)}`);
 const matching=(invoices.results??[]).filter((v:any)=>String(v.payment?.id)===paymentId);
 if(!matching.length)return {approved:false,ignored:true};
 const results=[];
 for(const invoice of matching) results.push(await syncMercadoPagoAuthorizedPaymentById(String(invoice.id)));
 return {approved:results.some(r=>r.approved),results};
}

export {ensureNatalChart};
