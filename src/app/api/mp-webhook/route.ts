import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
            const { error } = await supabaseAdmin
                .from("users")
                .update({
                    subscription_status: "active",
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

            return NextResponse.json({
                ok: true,
                paymentStatus: payment.status,
                userId,
                subscription_status: "active",
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