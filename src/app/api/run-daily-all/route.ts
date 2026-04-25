import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
        const results = [];

        for (const user of users || []) {
            const response = await fetch(`${baseUrl}/api/run-daily`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user.id,
                }),
            });

            const data = await response.json();

            results.push({
                userId: user.id,
                full_name: user.full_name,
                ok: response.ok,
                data,
            });
        }

        return NextResponse.json({
            ok: true,
            processed: results.length,
            results,
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