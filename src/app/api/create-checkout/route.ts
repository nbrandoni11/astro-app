"use server";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const userId = body.userId;
        const email = body.email;

        if (!userId || !email) {
            return NextResponse.json(
                { ok: false, error: "Faltan userId o email" },
                { status: 400 }
            );
        }

        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "https://astro-app.vercel.app";

        const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                items: [
                    {
                        title: "Suscripción astrología diaria",
                        quantity: 1,
                        unit_price: 1000,
                        currency_id: "ARS",
                    },
                ],
                payer: {
                    email,
                },
                metadata: {
                    userId,
                },
                back_urls: {
                    success: `${appUrl}/gracias`,
                    failure: `${appUrl}/suscripcion`,
                    pending: `${appUrl}/suscripcion`,
                },
                auto_return: "approved",
                notification_url: `${appUrl}/api/mp-webhook`,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error creando preferencia de Mercado Pago",
                    details: data,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            preferenceId: data.id,
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err?.message || "Error en create-checkout",
            },
            { status: 500 }
        );
    }
}