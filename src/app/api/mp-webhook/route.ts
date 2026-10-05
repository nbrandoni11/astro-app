import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  syncMercadoPagoAuthorizedPaymentById,
  syncMercadoPagoSubscriptionById,
} from "@/lib/mercadopago-subscription";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/mp-webhook",
    message: "Mercado Pago webhook activo",
  });
}

async function handlePayment(paymentId: string) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  const payment = await response.json();

  if (!response.ok) {
    throw new Error(
      payment?.message || "Error consultando el pago en Mercado Pago"
    );
  }

  const userId =
    payment.external_reference ||
    payment.metadata?.userId ||
    payment.metadata?.user_id;

  if (!userId) {
    return { ignored: true, reason: "payment_without_user_reference" };
  }

  if (payment.status === "approved") {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "active",
        mercadopago_subscription_status: "authorized",
        last_payment_at: new Date().toISOString(),
        mercadopago_payment_id: String(paymentId),
      })
      .eq("auth_user_id", String(userId));

    if (error) {
      throw new Error("Error registrando el pago aprobado");
    }
  }

  return {
    paymentId,
    paymentStatus: payment.status,
    userId: String(userId),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body.type;
    const resourceId = body.data?.id;

    if (!type || !resourceId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (type === "subscription_preapproval") {
      const result = await syncMercadoPagoSubscriptionById(String(resourceId));

      return NextResponse.json({
        ok: true,
        type,
        mercadoPagoStatus: result.subscription.status,
        subscriptionStatus: result.subscription_status,
      });
    }

    if (type === "subscription_authorized_payment") {
      const result = await syncMercadoPagoAuthorizedPaymentById(
        String(resourceId)
      );

      return NextResponse.json({
        ok: true,
        type,
        approved: result.approved,
        paymentId: result.paymentId,
      });
    }

    if (type === "payment") {
      const result = await handlePayment(String(resourceId));

      return NextResponse.json({
        ok: true,
        type,
        result,
      });
    }

    return NextResponse.json({
      ok: true,
      ignored: true,
      type,
    });
  } catch (err: any) {
    console.error("[mp-webhook]", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Error en mp-webhook",
      },
      { status: 500 }
    );
  }
}
