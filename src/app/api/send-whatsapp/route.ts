import { NextResponse } from "next/server";

const SUBSCRIPTION_WELCOME_CONTENT_SID =
    "HXba5928745719adf63b13840c57d1050a";

async function sendTwilioWhatsAppText(to: string, message: string) {
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
                Body: message,
            }),
        }
    );
}

async function sendTwilioWhatsAppTemplate(to: string, name: string) {
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
                ContentSid: SUBSCRIPTION_WELCOME_CONTENT_SID,
                ContentVariables: JSON.stringify({
                    "1": name,
                }),
            }),
        }
    );
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const to = body.to;
        const message = body.message;
        const template = body.template;
        const name = body.name;

        if (!to) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta el campo: to",
                },
                { status: 400 }
            );
        }

        if (!to.startsWith("+")) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El número debe estar en formato internacional. Ejemplo: +5491167598881",
                },
                { status: 400 }
            );
        }

        let response: Response;

        // Template aprobado para iniciar conversación
        if (template === "subscription_welcome") {
            if (!name) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Falta el campo: name",
                    },
                    { status: 400 }
                );
            }

            response = await sendTwilioWhatsAppTemplate(to, name);
        } else {
            // Mensaje de texto libre
            if (!message) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Falta el campo: message",
                    },
                    { status: 400 }
                );
            }

            if (message.length > 1500) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "El mensaje es demasiado largo. Máximo recomendado: 1500 caracteres.",
                    },
                    { status: 400 }
                );
            }

            response = await sendTwilioWhatsAppText(to, message);
        }

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
            message:
                template === "subscription_welcome"
                    ? "Template de bienvenida enviado"
                    : "WhatsApp enviado",
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