import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select(
        "id,subscription_status,mercadopago_subscription_id"
      )
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    if (!profile.mercadopago_subscription_id) {
      return NextResponse.json(
        { ok: false, error: "No hay una suscripción de Mercado Pago asociada" },
        { status: 400 }
      );
    }

    if (profile.subscription_status !== "active") {
      return NextResponse.json({
        ok: true,
        alreadyInactive: true,
      });
    }

    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(
        profile.mercadopago_subscription_id
      )}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "canceled",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[mp-cancel-subscription] Mercado Pago error:", data);

      return NextResponse.json(
        {
          ok: false,
          error: "Mercado Pago no pudo cancelar la suscripción",
        },
        { status: 502 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        subscription_status: "inactive",
        mercadopago_subscription_status: "canceled",
        subscription_next_payment_at: null,
      })
      .eq("id", profile.id);

    if (updateError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La suscripción se canceló en Mercado Pago, pero no pudimos actualizar el estado local",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      subscriptionStatus: "inactive",
      mercadoPagoStatus: data.status || "canceled",
    });
  } catch (error: any) {
    console.error("[mp-cancel-subscription]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error cancelando la suscripción",
      },
      { status: 500 }
    );
  }
}
