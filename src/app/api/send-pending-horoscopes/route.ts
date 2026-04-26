import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PendingHoroscope = {
    id: string;
    user_id: string;
    horoscope_text: string;
    whatsapp_message_1: string | null;
    whatsapp_message_2: string | null;
};

async function sendTwilioMessage(to: string, body: string) {
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

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
    try {
        const { data: pending, error } = await supabaseAdmin
            .from("daily_horoscopes")
            .select("id, user_id, horoscope_text, whatsapp_message_1, whatsapp_message_2")
            .eq("send_status", "pending")
            .limit(10);

        if (error) {
            return NextResponse.json(
                { ok: false, error: error.message },
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

            const message1Body = item.whatsapp_message_1?.trim();
            const message2Body = item.whatsapp_message_2?.trim();

            if (!message1Body || !message2Body) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: "Faltan mensajes whatsapp",
                    })
                    .eq("id", item.id);

                continue;
            }

            const firstName = user.full_name?.split(" ")[0] || "";

            const message1 = `Buen día ${firstName}.

${message1Body}

(1/2)`;

            const message2 = `${message2Body}

(2/2)`;

            try {
                // 👉 ENVÍO 1
                const response1 = await sendTwilioMessage(user.phone_whatsapp, message1);

                if (!response1.ok) {
                    const text = await response1.text();

                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: text,
                        })
                        .eq("id", item.id);

                    continue;
                }

                // 👉 ESPERA para asegurar orden
                await sleep(1500);

                // 👉 ENVÍO 2
                const response2 = await sendTwilioMessage(user.phone_whatsapp, message2);

                if (!response2.ok) {
                    const text = await response2.text();

                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: text,
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