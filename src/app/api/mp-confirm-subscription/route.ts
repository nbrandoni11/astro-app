import { createClient } from "@/lib/supabase-server";
import { validCheckoutToken } from "@/lib/checkout-token";
import { processBillingDeliveries } from "@/lib/billing-delivery";
export const maxDuration=300;
import { after, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncMercadoPagoSubscriptionById } from "@/lib/mercadopago-subscription";

export async function POST(req: Request) {
  try {
    const { userId, checkoutToken } = await req.json();
    const client=await createClient();
    const {data:{user: sessionUser}}=await client.auth.getUser();
    if(sessionUser?.id!==userId && !validCheckoutToken(checkoutToken,userId))return NextResponse.json({ok:false,error:"Ingresá a tu cuenta."},{status:401});

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Falta userId" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("mercadopago_subscription_id")
      .eq("auth_user_id", userId)
      .single();

    if (error || !user?.mercadopago_subscription_id) {
      return NextResponse.json(
        { ok: false, error: "No se encontró la suscripción" },
        { status: 404 }
      );
    }

    const result = await syncMercadoPagoSubscriptionById(
      user.mercadopago_subscription_id
    );

    after(async()=>{await processBillingDeliveries(result.userId);});
    return NextResponse.json({
      ok: true,
      mercadoPagoStatus: result.subscription.status,
      subscriptionStatus: result.subscription_status,
      natalChartGenerated: result.natalChartGenerated,
    });
  } catch (error: any) {
    console.error("[mp-confirm-subscription]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error confirmando la suscripción",
      },
      { status: 500 }
    );
  }
}
