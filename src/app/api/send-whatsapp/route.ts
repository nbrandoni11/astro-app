import { NextResponse } from "next/server";

async function sendTwilioWhatsApp(to: string, body: string) {
    return fetch(
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
                To: `whatsapp:${to}`,
                Body: body,
            }),
        }
    );
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const to = body.to;
        const message = body.message;

        if (!to || !message) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Faltan campos: to y message",
                },
                { status: 400 }
            );
        }

        if (!to.startsWith("+")) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El número debe estar en formato internacional. Ejemplo: +5491167598881",
                },
                { status: 400 }
            );
        }

        if (message.length > 1500) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El mensaje es demasiado largo. Máximo recomendado: 1500 caracteres.",
                },
                { status: 400 }
            );
        }

        const response = await sendTwilioWhatsApp(to, message);

        const responseText = await response.text();

        if (!response.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Twilio rechazó el envío",
                    details: responseText,
                },
                { status: response.status }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "WhatsApp enviado",
            twilioResponse: responseText,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err?.message || "Error enviando WhatsApp",
            },
            { status: 500 }
        );
    }
}