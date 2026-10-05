import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateNatalChart } from "@/lib/generate-natal-chart";

export type MercadoPagoSubscription = {
  id: string;
  status?: string;
  external_reference?: string | number | null;
  init_point?: string | null;
  next_payment_date?: string | null;
  payer_email?: string | null;
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
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "birth_day,birth_month,birth_year,birth_hour,birth_min,birth_lat,birth_lon,birth_tzone,natal_chart,natal_interpretation"
    )
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !user) {
    throw new Error("No se pudieron obtener los datos natales del usuario");
  }

  if (user.natal_chart && user.natal_interpretation) {
    return false;
  }

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

async function sendWelcomeWhatsAppBestEffort(authUserId: string) {
  try {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("full_name,phone_whatsapp")
      .eq("auth_user_id", authUserId)
      .single();

    if (!user?.phone_whatsapp) return;

    const contentSid =
      process.env.TWILIO_WELCOME_CONTENT_SID ||
      "HXba5928745719adf63b13840c57d1050a";

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_WHATSAPP_NUMBER!,
          To: `whatsapp:${user.phone_whatsapp}`,
          ContentSid: contentSid,
          ContentVariables: JSON.stringify({
            "1": user.full_name?.split(" ")[0] || "Astral",
          }),
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "[mp-subscription] Welcome WhatsApp failed:",
        await response.text()
      );
    }
  } catch (error) {
    console.error("[mp-subscription] Welcome WhatsApp error:", error);
  }
}

export async function syncMercadoPagoSubscriptionById(subscriptionId: string) {
  const subscription = await getMercadoPagoSubscription(subscriptionId);
  const externalReference = subscription.external_reference
    ? String(subscription.external_reference)
    : null;

  let profileQuery = supabaseAdmin
    .from("users")
    .select(
      "id,auth_user_id,subscription_status,mercadopago_subscription_id"
    );

  if (externalReference) {
    profileQuery = profileQuery.eq("auth_user_id", externalReference);
  } else {
    profileQuery = profileQuery.eq(
      "mercadopago_subscription_id",
      subscription.id
    );
  }

  const { data: profile, error: profileError } =
    await profileQuery.maybeSingle();

  if (profileError || !profile) {
    throw new Error("No se encontró el usuario de la suscripción");
  }

  const wasActive = profile.subscription_status === "active";
  const mpStatus = subscription.status || "unknown";

  let localStatus = profile.subscription_status;
  if (mpStatus === "authorized") localStatus = "active";
  if (
    mpStatus === "cancelled" ||
    mpStatus === "canceled" ||
    mpStatus === "paused"
  ) {
    localStatus = "inactive";
  }

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      mercadopago_subscription_id: subscription.id,
      mercadopago_subscription_status: mpStatus,
      mercadopago_subscription_init_point: subscription.init_point ?? null,
      subscription_next_payment_at: subscription.next_payment_date ?? null,
      subscription_status: localStatus,
    })
    .eq("id", profile.id);

  if (updateError) {
    throw new Error("Error actualizando la suscripción");
  }

  let natalChartGenerated = false;

  if (mpStatus === "authorized" && profile.auth_user_id) {
    natalChartGenerated = await ensureNatalChart(profile.auth_user_id);

    if (!wasActive) {
      await sendWelcomeWhatsAppBestEffort(profile.auth_user_id);
    }
  }

  return {
    subscription,
    authUserId: profile.auth_user_id,
    subscription_status: localStatus,
    natalChartGenerated,
  };
}

export async function syncMercadoPagoAuthorizedPaymentById(
  authorizedPaymentId: string
) {
  const invoice = await mpFetch(
    `/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`
  );

  const externalReference = invoice.external_reference
    ? String(invoice.external_reference)
    : null;

  if (!externalReference) {
    throw new Error("Factura recurrente sin external_reference");
  }

  const approved = invoice.payment?.status === "approved";
  const paymentId = invoice.payment?.id
    ? String(invoice.payment.id)
    : null;

  if (approved) {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "active",
        mercadopago_subscription_status: "authorized",
        last_payment_at: new Date().toISOString(),
        mercadopago_payment_id: paymentId,
      })
      .eq("auth_user_id", externalReference);

    if (error) {
      throw new Error("Error registrando el cobro recurrente");
    }
  }

  return {
    externalReference,
    approved,
    paymentId,
    invoice,
  };
}
