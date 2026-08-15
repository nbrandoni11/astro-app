import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function getBaseUrl(req: NextRequest) {
    const host = req.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
}

async function runDailyAll(req: NextRequest) {
    try {
        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("subscription_status", "active");

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

        for (const user of users || []) {
            try {
                const response = await fetch(`${baseUrl}/api/run-daily`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
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