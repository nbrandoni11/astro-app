import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DAILY_HOROSCOPE_1_CONTENT_SID =
    "HXef0ea014c6f6f725382d791da5607c4b";

const DAILY_HOROSCOPE_2_CONTENT_SID =
    "HX2b143759542c2a6ea54bfbe3b050ed67";

type PendingHoroscope = {
    id: string;
    user_id: string;
    horoscope_text: string;
    whatsapp_message_1: string | null;
    whatsapp_message_2: string | null;
};

async function sendTwilioTemplate(
    to: string,
    contentSid: string,
    variables: Record<string, string>
) {
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
                ContentSid: contentSid,
                ContentVariables: JSON.stringify(variables),
            }),
        }
    );
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Twilio no acepta saltos de línea, tabs ni múltiples espacios
// dentro de las ContentVariables de estos templates.
function sanitizeContentVariable(value: string) {
    return value
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

export async function GET() {
    try {
        const { data: pending, error } = await supabaseAdmin
            .from("daily_horoscopes")
            .select(
                "id, user_id, horoscope_text, whatsapp_message_1, whatsapp_message_2"
            )
            .eq("send_status", "pending")
            .limit(10);

        if (error) {
            return NextResponse.json(
                {
                    ok: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        const results = [];

        for (const item of (pending || []) as PendingHoroscope[]) {
            const { data: users, error: userError } = await supabaseAdmin
                .from("users")
                .select("id, full_name, phone_whatsapp")
                .eq("id", item.user_id)
                .limit(1);

            const user = users?.[0];

            if (userError || !user) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: userError?.message || "Usuario no encontrado",
                    })
                    .eq("id", item.id);

                continue;
            }

            if (!user.phone_whatsapp) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: "Usuario sin teléfono",
                    })
                    .eq("id", item.id);

                continue;
            }

            const rawMessage1 = item.whatsapp_message_1?.trim();
            const rawMessage2 = item.whatsapp_message_2?.trim();

            if (!rawMessage1 || !rawMessage2) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: "Faltan mensajes WhatsApp",
                    })
                    .eq("id", item.id);

                continue;
            }

            // Limpiar el contenido antes de enviarlo como ContentVariable.
            // El contenido original en Supabase no se modifica.
            const message1Body = sanitizeContentVariable(rawMessage1);
            const message2Body = sanitizeContentVariable(rawMessage2);

            const firstName = sanitizeContentVariable(
                user.full_name?.split(" ")[0] || "Astral"
            );

            try {
                // ─────────────────────────────────────────────
                // MENSAJE 1
                // {{1}} = nombre
                // {{2}} = primera parte del horóscopo
                // ─────────────────────────────────────────────
                const response1 = await sendTwilioTemplate(
                    user.phone_whatsapp,
                    DAILY_HOROSCOPE_1_CONTENT_SID,
                    {
                        "1": firstName,
                        "2": message1Body,
                    }
                );

                if (!response1.ok) {
                    const text = await response1.text();

                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: `Error mensaje 1: ${text}`,
                        })
                        .eq("id", item.id);

                    continue;
                }

                // Esperar 4 segundos antes del segundo mensaje
                await sleep(4000);

                // ─────────────────────────────────────────────
                // MENSAJE 2
                // {{1}} = segunda parte del horóscopo
                // ─────────────────────────────────────────────
                const response2 = await sendTwilioTemplate(
                    user.phone_whatsapp,
                    DAILY_HOROSCOPE_2_CONTENT_SID,
                    {
                        "1": message2Body,
                    }
                );

                if (!response2.ok) {
                    const text = await response2.text();

                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: `Error mensaje 2: ${text}`,
                        })
                        .eq("id", item.id);

                    continue;
                }

                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "sent",
                        sent_at: new Date().toISOString(),
                        send_error: null,
                    })
                    .eq("id", item.id);

                results.push({
                    id: item.id,
                    userId: item.user_id,
                    ok: true,
                });
            } catch (err: any) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: err?.message || "Error desconocido",
                    })
                    .eq("id", item.id);
            }
        }

        return NextResponse.json({
            ok: true,
            processed: results.length,
            results,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err?.message || "Error en send-pending-horoscopes",
            },
            { status: 500 }
        );
    }
}