"use server";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMercadoPagoSubscription } from "@/lib/mercadopago-subscription";

const MONTHLY_PRICE_ARS = 4990;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!userId || !email) {
      return NextResponse.json(
        { ok: false, error: "Faltan userId o email" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select(
        "id,email,subscription_status,mercadopago_subscription_id,mercadopago_subscription_init_point"
      )
      .eq("auth_user_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (profile.email?.trim().toLowerCase() !== email) {
      return NextResponse.json(
        { ok: false, error: "El email no coincide con el usuario" },
        { status: 400 }
      );
    }

    if (profile.subscription_status === "active") {
      return NextResponse.json(
        { ok: false, alreadyActive: true, error: "La suscripción ya está activa" },
        { status: 409 }
      );
    }

    if (profile.mercadopago_subscription_id) {
      try {
        const existingSubscription = await getMercadoPagoSubscription(
          profile.mercadopago_subscription_id
        );

        if (
          existingSubscription.status === "pending" &&
          existingSubscription.init_point
        ) {
          return NextResponse.json({
            ok: true,
            subscriptionId: existingSubscription.id,
            init_point: existingSubscription.init_point,
            reused: true,
          });
        }

        if (existingSubscription.status === "authorized") {
          await supabaseAdmin
            .from("users")
            .update({
              subscription_status: "active",
              mercadopago_subscription_status: "authorized",
              subscription_next_payment_at:
                existingSubscription.next_payment_date ?? null,
            })
            .eq("id", profile.id);

          return NextResponse.json(
            { ok: false, alreadyActive: true, error: "La suscripción ya está activa" },
            { status: 409 }
          );
        }
      } catch (error) {
        console.error(
          "[mp-create-checkout] No se pudo reutilizar la suscripción anterior:",
          error
        );
      }
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://idastral.com";

    const backUrl =
      `${appUrl}/gracias?userId=${encodeURIComponent(userId)}`;

    const response = await fetch(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "ID Astral - Suscripción mensual",
          external_reference: userId,
          payer_email: email,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: MONTHLY_PRICE_ARS,
            currency_id: "ARS",
          },
          back_url: backUrl,
          status: "pending",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data?.id || !data?.init_point) {
      console.error("[mp-create-checkout] Mercado Pago error:", data);

      return NextResponse.json(
        {
          ok: false,
          error: "Error creando la suscripción en Mercado Pago",
          details: data,
        },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        mercadopago_subscription_id: String(data.id),
        mercadopago_subscription_status: data.status || "pending",
        mercadopago_subscription_init_point: data.init_point,
        subscription_next_payment_at: data.next_payment_date ?? null,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error(
        "[mp-create-checkout] Error guardando la suscripción:",
        updateError
      );

      return NextResponse.json(
        { ok: false, error: "Error guardando la suscripción" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: String(data.id),
      init_point: data.init_point,
      reused: false,
    });
  } catch (err: any) {
    console.error("[mp-create-checkout]", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Error creando la suscripción",
      },
      { status: 500 }
    );
  }
}
