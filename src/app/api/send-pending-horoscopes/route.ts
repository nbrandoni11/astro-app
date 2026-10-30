import { datedSections, sanitizeContentVariable, smartTrim } from "@/lib/whatsapp-content";
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
    horoscope_date: string;
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
    variables: Record<string, string>,
    statusCallback: string
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
                StatusCallback: statusCallback,
            }),
        }
    );
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(value: string | null | undefined) {
    return String(value || "").replace(/\D/g, "");
}

// Explicit, authenticated retry of one failed part. Never replay the delivered part.
export async function POST(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    let body: { horoscopeId?: string; part?: number; brief?: boolean; legacySecondPart?: boolean };
    try { body = await req.json(); } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.horoscopeId || ![1, 2].includes(body.part || 0)) {
        return NextResponse.json({ ok: false, error: "horoscopeId and part (1 or 2) required" }, { status: 400 });
    }
    const part = body.part as 1 | 2;
    const statusColumn = part === 1 ? "twilio_status_1" : "twilio_status_2";
    try {
        const { data: item, error } = await supabaseAdmin.from("daily_horoscopes")
            .select("id,user_id,horoscope_date,whatsapp_message_1,whatsapp_message_2,twilio_status_1,twilio_status_2")
            .eq("id", body.horoscopeId).single();
        if (error || !item) return NextResponse.json({ ok: false, error: "Horoscope not found" }, { status: 404 });
        const previousStatus = item[statusColumn];
        if (previousStatus !== "failed" && previousStatus !== "undelivered") {
            return NextResponse.json({ ok: false, error: "Only a failed part can be retried" }, { status: 409 });
        }
        const { data: user } = await supabaseAdmin.from("users")
            .select("full_name,phone_whatsapp,subscription_status").eq("id", item.user_id).single();
        if (!user?.phone_whatsapp || user.subscription_status !== "active") {
            return NextResponse.json({ ok: false, error: "No active recipient" }, { status: 409 });
        }
        const raw = JSON.parse(part === 1 ? item.whatsapp_message_1 : item.whatsapp_message_2);
        const sections: [string, string, string] = part === 1
            ? [raw.panorama_general, raw.trabajo_dinero, raw.relaciones]
            : [raw.energia_interna, raw.sintesis_dia, raw.base_astrologica];
        if (sections.some(value => typeof value !== "string" || !value.trim())) {
            throw new Error("Missing WhatsApp sections");
        }
        // An explicit brief retry isolates variable length/content without altering the saved reading.
        const retrySections = body.brief === true
            ? sections.map(section => smartTrim(section, 80)) as [string, string, string]
            : sections;
        const [a, b, c] = datedSections(retrySections, item.horoscope_date,
            part === 1 ? MESSAGE_1_VARIABLES_MAX : MESSAGE_2_VARIABLES_MAX);
        const variables: Record<string, string> = part === 1
            ? { "1": sanitizeContentVariable(user.full_name?.split(" ")[0] || "Astral"), "2": a, "3": b, "4": c }
            : { "1": a, "2": b, "3": c };
        // The previously approved single-variable template provides an independent comparison.
        const useLegacy = part === 2 && body.legacySecondPart === true;
        const contentSid = useLegacy ? "HX2b143759542c2a6ea54bfbe3b050ed67"
            : part === 1 ? DAILY_HOROSCOPE_1_CONTENT_SID : DAILY_HOROSCOPE_2_CONTENT_SID;
        const contentVariables = useLegacy
            ? { "1": `Energía interna: ${a} Síntesis del día: ${b} Base astrológica: ${c}` }
            : variables;
        const { data: claimed, error: claimError } = await supabaseAdmin.from("daily_horoscopes")
            .update({ [statusColumn]: "retrying" }).eq("id", item.id)
            .eq(statusColumn, previousStatus).select("id").maybeSingle();
        if (claimError) throw new Error(claimError.message);
        if (!claimed) return NextResponse.json({ ok: false, error: "Already being retried" }, { status: 409 });
        const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://idastral.com";
        let response: Response;
        try {
            response = await sendTwilioTemplate(user.phone_whatsapp,
                contentSid, contentVariables, `${appUrl}/api/twilio-status?horoscopeId=${item.id}&part=${part}`);
        } catch {
            // An ambiguous network outcome must be reconciled before another attempt.
            await supabaseAdmin.from("daily_horoscopes").update({ send_status: "error",
                send_error: `Retry part ${part}: network outcome unknown; reconcile Twilio before retrying` }).eq("id", item.id);
            throw new Error("Twilio retry outcome unknown");
        }
        const data = await response.json();
        if (!response.ok || !data.sid) {
            await supabaseAdmin.from("daily_horoscopes").update({ [statusColumn]: previousStatus,
                send_status: "error", send_error: `Retry part ${part}: ${data.code || response.status} ${data.message || "rejected"}` })
                .eq("id", item.id).eq(statusColumn, "retrying");
            return NextResponse.json({ ok: false, error: "Twilio rejected retry", code: data.code }, { status: 502 });
        }
        const sidColumn = part === 1 ? "twilio_message_sid_1" : "twilio_message_sid_2";
        const { error: saveError } = await supabaseAdmin.from("daily_horoscopes")
            .update({ [sidColumn]: data.sid, [statusColumn]: data.status || "accepted",
                send_status: "submitted", send_error: null, sent_at: null })
            .eq("id", item.id).eq(statusColumn, "retrying");
        if (saveError) throw new Error(saveError.message);
        return NextResponse.json({ ok: true, sid: data.sid, part, status: data.status });
    } catch (error) {
        return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Retry failed" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { data: pending, error } = await supabaseAdmin
            .from("daily_horoscopes")
            .select(
                "id, user_id, horoscope_text, horoscope_date, whatsapp_message_1, whatsapp_message_2"
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
        const processedPhones = new Set<string>();

        for (const item of (pending || []) as PendingHoroscope[]) {
            // Atomically claim the row so parallel invocations cannot send it twice.
            const { data: claimed, error: claimError } = await supabaseAdmin
                .from("daily_horoscopes")
                .update({ send_status: "processing" })
                .eq("id", item.id)
                .eq("send_status", "pending")
                .select("id")
                .maybeSingle();

            if (claimError || !claimed) {
                continue;
            }
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

            const normalizedPhone = normalizePhone(user.phone_whatsapp);

            if (processedPhones.has(normalizedPhone)) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: "WhatsApp duplicado en otro horóscopo pendiente",
                    })
                    .eq("id", item.id);

                continue;
            }

            processedPhones.add(normalizedPhone);

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
            ] = datedSections(
                [message1Data.panorama_general, message1Data.trabajo_dinero, message1Data.relaciones],
                item.horoscope_date,
                MESSAGE_1_VARIABLES_MAX
            );

            // ─────────────────────────────────────────────
            // MENSAJE 2 — CONTROL DE LONGITUD
            // ─────────────────────────────────────────────

            const [
                energiaInterna,
                sintesisDia,
                baseAstrologica,
            ] = datedSections(
                [message2Data.energia_interna, message2Data.sintesis_dia, message2Data.base_astrologica],
                item.horoscope_date,
                MESSAGE_2_VARIABLES_MAX
            );

            try {
                const appUrl =
                    process.env.APP_URL ||
                    process.env.NEXT_PUBLIC_APP_URL ||
                    "https://idastral.com";

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
                    },
                    `${appUrl}/api/twilio-status?horoscopeId=${item.id}&part=1`
                );

                const response1Text = await response1.text();
                let response1Data: any = null;

                try {
                    response1Data = JSON.parse(response1Text);
                } catch {
                    // Twilio normally returns JSON; keep the raw body for errors.
                }

                if (!response1.ok || !response1Data?.sid) {
                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: `Error mensaje 1: ${response1Text}`,
                        })
                        .eq("id", item.id);

                    continue;
                }

                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        twilio_message_sid_1: response1Data.sid,
                        twilio_status_1: response1Data.status || "accepted",
                        send_status: "submitting",
                        send_error: null,
                    })
                    .eq("id", item.id);

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
                    },
                    `${appUrl}/api/twilio-status?horoscopeId=${item.id}&part=2`
                );

                const response2Text = await response2.text();
                let response2Data: any = null;

                try {
                    response2Data = JSON.parse(response2Text);
                } catch {
                    // Twilio normally returns JSON; keep the raw body for errors.
                }

                if (!response2.ok || !response2Data?.sid) {
                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: `Error mensaje 2: ${response2Text}`,
                        })
                        .eq("id", item.id);

                    continue;
                }

                // Twilio accepted both messages. Final delivery is confirmed
                // asynchronously by /api/twilio-status.
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        twilio_message_sid_2: response2Data.sid,
                        twilio_status_2: response2Data.status || "accepted",
                        send_status: "submitted",
                        sent_at: null,
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
