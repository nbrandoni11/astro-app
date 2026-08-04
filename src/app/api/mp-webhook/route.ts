import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateNatalChart } from "@/lib/generate-natal-chart";

export async function GET() {
    return NextResponse.json({
        ok: true,
        route: "/api/mp-webhook",
        message: "Mercado Pago webhook activo",
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (body.type !== "payment") {
            return NextResponse.json({ ok: true, ignored: true });
        }

        const paymentId = body.data?.id;

        if (!paymentId) {
            return NextResponse.json(
                { ok: false, error: "Falta paymentId" },
                { status: 400 }
            );
        }

        const paymentRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                },
            }
        );

        const payment = await paymentRes.json();

        if (!paymentRes.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error consultando pago en Mercado Pago",
                    details: payment,
                },
                { status: 500 }
            );
        }

        const userId = payment.metadata?.userId || payment.metadata?.user_id;

        if (!userId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pago sin userId en metadata",
                    metadata: payment.metadata,
                },
                { status: 400 }
            );
        }

        if (payment.status === "approved") {

            // Activar suscripción
            const { error } = await supabaseAdmin
                .from("users")
                .update({
                    subscription_status: "active",
                    last_payment_at: new Date().toISOString(),
                    mercadopago_payment_id: String(paymentId),
                })
                .eq("id", userId);

            if (error) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Error activando usuario",
                        details: error.message,
                    },
                    { status: 500 }
                );
            }

            // Obtener datos natales del usuario
            const { data: user, error: userError } = await supabaseAdmin
                .from("users")
                .select(
                    `
                    birth_day,
                    birth_month,
                    birth_year,
                    birth_hour,
                    birth_min,
                    birth_lat,
                    birth_lon,
                    birth_tzone,
                    natal_chart,
                    natal_interpretation
                    `
                )
                .eq("id", userId)
                .single();

            if (userError || !user) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "No se pudieron obtener los datos natales del usuario",
                    },
                    { status: 500 }
                );
            }

            // Check if natal chart already exists to avoid redundant calls
            if (user.natal_chart && user.natal_interpretation) {
                return NextResponse.json({
                    ok: true,
                    paymentStatus: payment.status,
                    userId,
                    subscription_status: "active",
                    mercadopago_payment_id: String(paymentId),
                    natal_chart_generated: false,
                    message: "Natal chart already exists, skipped generation."
                });
            }

            // Generar carta natal
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

            // Guardarla
            const { error: natalError } = await supabaseAdmin
                .from("users")
                .update({
                    natal_chart: astroData,
                    natal_interpretation: interpretation,
                    natal_chart_generated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            if (natalError) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Error guardando la carta natal",
                        details: natalError.message,
                    },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                ok: true,
                paymentStatus: payment.status,
                userId,
                subscription_status: "active",
                mercadopago_payment_id: String(paymentId),
                natal_chart_generated: true,
            });
        }

        return NextResponse.json({
            ok: true,
            paymentStatus: payment.status,
            userId,
            message: "Pago no aprobado todavía",
        });

    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err?.message || "Error en mp-webhook",
            },
            { status: 500 }
        );
    }
}