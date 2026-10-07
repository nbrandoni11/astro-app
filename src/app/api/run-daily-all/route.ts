import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function getBaseUrl(req: NextRequest) {
    if (process.env.APP_URL) return process.env.APP_URL;

    const host = req.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
}

function isAuthorized(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

function normalizePhone(value: string | null | undefined) {
    return String(value || "").replace(/\\D/g, "");
}

async function runDailyAll(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("subscription_status", "active")
            .not("auth_user_id", "is", null);

        if (error) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error obteniendo usuarios activos",
                    details: error.message,
                },
                { status: 500 }
            );
        }

        const baseUrl = getBaseUrl(req);
        const generationResults = [];

        // ─────────────────────────────────────────────
        // 1. GENERAR HORÓSCOPOS
        // ─────────────────────────────────────────────

        const orderedUsers = [...(users || [])].sort((a: any, b: any) => {
            const aTime = Date.parse(a.last_payment_at || a.created_at || 0) || 0;
            const bTime = Date.parse(b.last_payment_at || b.created_at || 0) || 0;
            return bTime - aTime;
        });

        const processedPhones = new Set<string>();

        for (const user of orderedUsers) {
            const normalizedPhone = normalizePhone(user.phone_whatsapp);

            if (!normalizedPhone) {
                generationResults.push({
                    userId: user.id,
                    full_name: user.full_name,
                    ok: false,
                    skipped: true,
                    error: "Usuario activo sin WhatsApp",
                });
                continue;
            }

            if (processedPhones.has(normalizedPhone)) {
                generationResults.push({
                    userId: user.id,
                    full_name: user.full_name,
                    ok: false,
                    skipped: true,
                    error: "WhatsApp duplicado en otra suscripción activa",
                });
                continue;
            }

            processedPhones.add(normalizedPhone);

            try {
                const response = await fetch(`${baseUrl}/api/run-daily`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.CRON_SECRET}`,
                    },
                    body: JSON.stringify({
                        userId: user.id,
                    }),
                    cache: "no-store",
                });

                const data = await response.json();

                generationResults.push({
                    userId: user.id,
                    full_name: user.full_name,
                    ok: response.ok,
                    data,
                });
            } catch (err: any) {
                generationResults.push({
                    userId: user.id,
                    full_name: user.full_name,
                    ok: false,
                    error: err?.message || "Error generando horóscopo",
                });
            }
        }

        // ─────────────────────────────────────────────
        // 2. ENVIAR TODOS LOS PENDING
        // ─────────────────────────────────────────────

        let sendingResult: any = null;

        try {
            const sendResponse = await fetch(
                `${baseUrl}/api/send-pending-horoscopes`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${process.env.CRON_SECRET}`,
                    },
                    cache: "no-store",
                }
            );

            const sendData = await sendResponse.json();

            sendingResult = {
                ok: sendResponse.ok,
                data: sendData,
            };
        } catch (err: any) {
            sendingResult = {
                ok: false,
                error: err?.message || "Error enviando horóscopos",
            };
        }

        return NextResponse.json({
            ok: true,
            generated: generationResults.length,
            generationResults,
            sendingResult,
        });
    } catch (error: any) {
        console.error("ERROR RUN-DAILY-ALL:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "Error en run-daily-all",
                details: error?.message || "Desconocido",
            },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return runDailyAll(req);
}

export async function POST(req: NextRequest) {
    return runDailyAll(req);
}