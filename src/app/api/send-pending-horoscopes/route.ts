import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PendingHoroscope = {
    id: string;
    user_id: string;
    horoscope_text: string;
    users:
    | {
        full_name: string | null;
        phone_whatsapp: string | null;
    }
    | {
        full_name: string | null;
        phone_whatsapp: string | null;
    }[]
    | null;
};

function getUserFromRelation(item: PendingHoroscope) {
    if (Array.isArray(item.users)) {
        return item.users[0] || null;
    }

    return item.users || null;
}

export async function GET() {
    try {
        const { data: pending, error } = await supabaseAdmin
            .from("daily_horoscopes")
            .select(`
        id,
        user_id,
        horoscope_text,
        users (
          full_name,
          phone_whatsapp
        )
      `)
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
            const user = getUserFromRelation(item);

            if (!user?.phone_whatsapp) {
                await supabaseAdmin
                    .from("daily_horoscopes")
                    .update({
                        send_status: "error",
                        send_error: "Usuario sin teléfono",
                    })
                    .eq("id", item.id);

                results.push({
                    id: item.id,
                    ok: false,
                    error: "Usuario sin teléfono",
                });

                continue;
            }

            const message = `Buen día ${user.full_name || ""}.

${item.horoscope_text}

— Open Hearts Club`;

            try {
                const response = await fetch(
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
                            To: `whatsapp:${user.phone_whatsapp}`,
                            Body: message,
                        }),
                    }
                );

                if (!response.ok) {
                    const text = await response.text();

                    await supabaseAdmin
                        .from("daily_horoscopes")
                        .update({
                            send_status: "error",
                            send_error: text,
                        })
                        .eq("id", item.id);

                    results.push({
                        id: item.id,
                        ok: false,
                        error: text,
                    });

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

                results.push({
                    id: item.id,
                    ok: false,
                    error: err?.message || "Error desconocido",
                });
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