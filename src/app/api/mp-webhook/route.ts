import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  syncMercadoPagoAuthorizedPaymentById,
  syncMercadoPagoSubscriptionById,
} from "@/lib/mercadopago-subscription";

function parseSignatureHeader(xSignature: string) {
  const values = new Map<string, string[]>();

  for (const rawPart of xSignature.split(",")) {
    const [rawKey, ...rawValueParts] = rawPart.split("=");
    const key = rawKey?.trim();
    const value = rawValueParts.join("=").trim();

    if (!key || !value) continue;

    const current = values.get(key) ?? [];
    current.push(value);
    values.set(key, current);
  }

  return values;
}

function safeHexEquals(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function validateMercadoPagoSignature(req: Request, body: any) {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    return {
      ok: false as const,
      status: 503,
      error: "Webhook secret not configured",
    };
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    return {
      ok: false as const,
      status: 401,
      error: "Missing Mercado Pago signature headers",
    };
  }

  const url = new URL(req.url);

  // Mercado Pago signs the data.id value sent in the webhook URL.
  // Keep fallbacks for integrations that expose it as data_id or only in body.
  const rawDataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("data_id") ??
    body?.data?.id;

  if (rawDataId === undefined || rawDataId === null || rawDataId === "") {
    return {
      ok: false as const,
      status: 401,
      error: "Missing Mercado Pago data.id",
    };
  }

  const dataId = String(rawDataId).toLowerCase();
  const signatureParts = parseSignatureHeader(xSignature);
  const ts = signatureParts.get("ts")?.[0];
  const receivedHashes = signatureParts.get("v1") ?? [];

  if (!ts || receivedHashes.length === 0) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid Mercado Pago signature format",
    };
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const valid = receivedHashes.some((hash) =>
    safeHexEquals(expectedHash, hash)
  );

  if (!valid) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid Mercado Pago signature",
    };
  }

  return {
    ok: true as const,
    dataId,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/mp-webhook",
    message: "Mercado Pago webhook activo",
    signatureValidationConfigured: !!process.env.MP_WEBHOOK_SECRET,
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

    const signature = validateMercadoPagoSignature(req, body);

    if (!signature.ok) {
      console.error("[mp-webhook] Signature rejected:", signature.error);

      return NextResponse.json(
        {
          ok: false,
          error: signature.error,
        },
        { status: signature.status }
      );
    }

    const type = body.type;
    const resourceId = body.data?.id;

    if (!type || !resourceId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (String(resourceId).toLowerCase() !== signature.dataId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Webhook data.id mismatch",
        },
        { status: 401 }
      );
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
