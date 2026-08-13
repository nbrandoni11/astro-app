import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DAILY_HOROSCOPE_1_CONTENT_SID =
    "HX1bc424e37b2485ade3467907a7076e03";

const DAILY_HOROSCOPE_2_CONTENT_SID =
    "HX40e951cdf092a089c91fbf5f8f269792";

type PendingHoroscope = {
    id: string;
    user_id: string;
    horoscope_text: string;
    whatsapp_message_1: string | null;
    whatsapp_message_2: string | null;
};

type WhatsAppMessage1 = {
    panorama_general: string;
    trabajo_dinero: string;
    relaciones: string;
};

type WhatsAppMessage2 = {
    energia_interna: string;
    sintesis_dia: string;
    base_astrologica: string;
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
                        send_error:
                            userError?.message || "Usuario no encontrado",
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

            // ─────────────────────────────────────────────
            // PARSEAR LAS SECCIONES GUARDADAS POR RUN-DAILY
            // ─────────────────────────────────────────────

            let message1Data: WhatsAppMessage1;
            let message2Data: WhatsAppMessage2;

            try {
                message1Data = JSON.parse(rawMessage1);
                message2Data = JSON.parse(rawMessage2);
            } catch {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error:
                            "Los mensajes WhatsApp no contienen JSON válido",
                    })
                    .eq("id", item.id);

                continue;
            }

            // ─────────────────────────────────────────────
            // VALIDAR LAS 6 SECCIONES
            // ─────────────────────────────────────────────

            if (
                !message1Data.panorama_general ||
                !message1Data.trabajo_dinero ||
                !message1Data.relaciones ||
                !message2Data.energia_interna ||
                !message2Data.sintesis_dia ||
                !message2Data.base_astrologica
            ) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error:
                            "Faltan una o más secciones del horóscopo",
                    })
                    .eq("id", item.id);

                continue;
            }

            // ─────────────────────────────────────────────
            // LIMPIAR VARIABLES PARA TWILIO
            // ─────────────────────────────────────────────

            const firstName = sanitizeContentVariable(
                user.full_name?.split(" ")[0] || "Astral"
            );

            const panoramaGeneral = sanitizeContentVariable(
                message1Data.panorama_general
            );

            const trabajoDinero = sanitizeContentVariable(
                message1Data.trabajo_dinero
            );

            const relaciones = sanitizeContentVariable(
                message1Data.relaciones
            );

            const energiaInterna = sanitizeContentVariable(
                message2Data.energia_interna
            );

            const sintesisDia = sanitizeContentVariable(
                message2Data.sintesis_dia
            );

            const baseAstrologica = sanitizeContentVariable(
                message2Data.base_astrologica
            );

            try {
                // ─────────────────────────────────────────────
                // MENSAJE 1
                //
                // {{1}} = nombre
                // {{2}} = Panorama general
                // {{3}} = Trabajo y dinero
                // {{4}} = Relaciones
                // ─────────────────────────────────────────────

                const response1 = await sendTwilioTemplate(
                    user.phone_whatsapp,
                    DAILY_HOROSCOPE_1_CONTENT_SID,
                    {
                        "1": firstName,
                        "2": panoramaGeneral,
                        "3": trabajoDinero,
                        "4": relaciones,
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

                // ─────────────────────────────────────────────
                // ESPERAR 4 SEGUNDOS
                // ─────────────────────────────────────────────

                await sleep(4000);

                // ─────────────────────────────────────────────
                // MENSAJE 2
                //
                // {{1}} = Energía interna
                // {{2}} = Síntesis del día
                // {{3}} = Base astrológica
                // ─────────────────────────────────────────────

                const response2 = await sendTwilioTemplate(
                    user.phone_whatsapp,
                    DAILY_HOROSCOPE_2_CONTENT_SID,
                    {
                        "1": energiaInterna,
                        "2": sintesisDia,
                        "3": baseAstrologica,
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

                // ─────────────────────────────────────────────
                // MARCAR COMO ENVIADO
                // ─────────────────────────────────────────────

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
                        send_error:
                            err?.message || "Error desconocido",
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
                error:
                    err?.message ||
                    "Error en send-pending-horoscopes",
            },
            { status: 500 }
        );
    }
}