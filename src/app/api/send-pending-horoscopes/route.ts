import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DAILY_HOROSCOPE_1_CONTENT_SID =
    "HX1bc424e37b2485ade3467907a7076e03";

const DAILY_HOROSCOPE_2_CONTENT_SID =
    "HX40e951cdf092a089c91fbf5f8f269792";

// Límites conservadores para las variables.
// El mensaje final de Twilio tiene un límite de 1600 caracteres.
// Dejamos margen para todo el contenido fijo de los templates.
const MESSAGE_1_VARIABLES_MAX = 1125;
const MESSAGE_2_VARIABLES_MAX = 1200;

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

// Limpia caracteres que pueden generar problemas dentro de ContentVariables.
function sanitizeContentVariable(value: string) {
    return value
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

// Recorta intentando conservar una oración completa.
// Solo se utiliza como protección de emergencia si OpenAI supera el límite.
function smartTrim(value: string, maxLength: number) {
    const clean = sanitizeContentVariable(value);

    if (clean.length <= maxLength) {
        return clean;
    }

    const candidate = clean.slice(0, maxLength);

    // Intentar terminar en el último final de oración razonable.
    const sentenceEnd = Math.max(
        candidate.lastIndexOf(". "),
        candidate.lastIndexOf("! "),
        candidate.lastIndexOf("? ")
    );

    // Solo usamos el corte por oración si no elimina demasiado contenido.
    if (sentenceEnd >= Math.floor(maxLength * 0.7)) {
        return candidate.slice(0, sentenceEnd + 1).trim();
    }

    // Si no encontramos una oración suficientemente cerca,
    // cortar en la última palabra completa.
    const lastSpace = candidate.lastIndexOf(" ");

    if (lastSpace > 0) {
        return candidate.slice(0, lastSpace).trim() + "…";
    }

    return candidate.trim();
}

// Ajusta proporcionalmente tres secciones si la suma supera
// el presupuesto disponible para las variables del template.
function fitThreeSections(
    first: string,
    second: string,
    third: string,
    maxTotal: number
): [string, string, string] {
    let a = sanitizeContentVariable(first);
    let b = sanitizeContentVariable(second);
    let c = sanitizeContentVariable(third);

    const total = a.length + b.length + c.length;

    if (total <= maxTotal) {
        return [a, b, c];
    }

    // Distribuir el espacio proporcionalmente según
    // la longitud original de cada sección.
    const ratio = maxTotal / total;

    let maxA = Math.floor(a.length * ratio);
    let maxB = Math.floor(b.length * ratio);
    let maxC = Math.floor(c.length * ratio);

    // Garantizar que ninguna sección desaparezca por completo.
    maxA = Math.max(maxA, 180);
    maxB = Math.max(maxB, 180);
    maxC = Math.max(maxC, 180);

    // Si los mínimos hicieron que volvamos a superar el presupuesto,
    // repartimos el espacio de manera uniforme.
    if (maxA + maxB + maxC > maxTotal) {
        const equalBudget = Math.floor(maxTotal / 3);

        maxA = equalBudget;
        maxB = equalBudget;
        maxC = maxTotal - equalBudget * 2;
    }

    a = smartTrim(a, maxA);
    b = smartTrim(b, maxB);
    c = smartTrim(c, maxC);

    // Segunda comprobación por seguridad.
    let fittedTotal = a.length + b.length + c.length;

    if (fittedTotal > maxTotal) {
        const excess = fittedTotal - maxTotal;

        // Reducimos primero la sección más larga.
        const sections = [
            { key: "a", value: a },
            { key: "b", value: b },
            { key: "c", value: c },
        ].sort((x, y) => y.value.length - x.value.length);

        const longest = sections[0];

        if (longest.key === "a") {
            a = smartTrim(a, Math.max(150, a.length - excess - 5));
        } else if (longest.key === "b") {
            b = smartTrim(b, Math.max(150, b.length - excess - 5));
        } else {
            c = smartTrim(c, Math.max(150, c.length - excess - 5));
        }

        fittedTotal = a.length + b.length + c.length;
    }

    return [a, b, c];
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
            // PARSEAR LAS SECCIONES
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

            const firstName = sanitizeContentVariable(
                user.full_name?.split(" ")[0] || "Astral"
            );

            // ─────────────────────────────────────────────
            // MENSAJE 1 — CONTROL DE LONGITUD
            // ─────────────────────────────────────────────

            const [
                panoramaGeneral,
                trabajoDinero,
                relaciones,
            ] = fitThreeSections(
                message1Data.panorama_general,
                message1Data.trabajo_dinero,
                message1Data.relaciones,
                MESSAGE_1_VARIABLES_MAX
            );

            // ─────────────────────────────────────────────
            // MENSAJE 2 — CONTROL DE LONGITUD
            // ─────────────────────────────────────────────

            const [
                energiaInterna,
                sintesisDia,
                baseAstrologica,
            ] = fitThreeSections(
                message2Data.energia_interna,
                message2Data.sintesis_dia,
                message2Data.base_astrologica,
                MESSAGE_2_VARIABLES_MAX
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

                // Esperar 4 segundos antes del segundo mensaje.
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
                    message1VariableCharacters:
                        panoramaGeneral.length +
                        trabajoDinero.length +
                        relaciones.length,
                    message2VariableCharacters:
                        energiaInterna.length +
                        sintesisDia.length +
                        baseAstrologica.length,
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