import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId } = body;

        // 1. Buscar usuario real en Supabase
        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId);

        const user = users?.[0];

        if (error || !user) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Usuario no encontrado",
                    details: error?.message || null,
                    usersReturned: users || [],
                },
                { status: 404 }
            );
        }

        // 2. Fecha local según timezone del usuario
        const today = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: user.timezone || "UTC",
            })
        );

        // 3. Calcular carta natal
        const natalRes = await fetch("http://localhost:3000/api/natal-chart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                day: user.birth_day,
                month: user.birth_month,
                year: user.birth_year,
                hour: user.birth_hour,
                min: user.birth_min,
                lat: user.birth_lat,
                lon: user.birth_lon,
                tzone: user.birth_tzone,
            }),
        });

        const natal = await natalRes.json();

        if (!natalRes.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error calculando carta natal",
                    details: natal,
                },
                { status: 500 }
            );
        }

        // 4. Calcular tránsitos diarios
        const transitsRes = await fetch("http://localhost:3000/api/daily-transits", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                day: user.birth_day,
                month: user.birth_month,
                year: user.birth_year,
                hour: user.birth_hour,
                min: user.birth_min,
                lat: user.birth_lat,
                lon: user.birth_lon,
                tzone: user.birth_tzone,
                transit_day: today.getDate(),
                transit_month: today.getMonth() + 1,
                transit_year: today.getFullYear(),
            }),
        });

        const transits = await transitsRes.json();

        if (!transitsRes.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error calculando tránsitos diarios",
                    details: transits,
                },
                { status: 500 }
            );
        }

        // 5. Generar horóscopo
        const horoscopeRes = await fetch("http://localhost:3000/api/generate-horoscope", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                natal,
                transits,
            }),
        });

        const horoscope = await horoscopeRes.json();

        if (!horoscopeRes.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error generando horóscopo",
                    details: horoscope,
                },
                { status: 500 }
            );
        }

        // 6. Guardar horóscopo en Supabase
        const horoscopeText = horoscope?.horoscope || null;

        if (!horoscopeText) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No se recibió texto de horóscopo",
                    details: horoscope,
                },
                { status: 500 }
            );
        }

        const formattedDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const { error: insertError } = await supabaseAdmin
            .from("daily_horoscopes")
            .insert({
                user_id: user.id,
                horoscope_text: horoscopeText,
                horoscope_date: formattedDate,
                timezone_used: user.timezone,
                status: "generated",
            });

        if (insertError) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error guardando horóscopo",
                    details: insertError.message,
                },
                { status: 500 }
            );
        }

        // 7. Respuesta final
        return NextResponse.json({
            ok: true,
            user: user.full_name,
            timezone: user.timezone,
            localDateUsed: {
                day: today.getDate(),
                month: today.getMonth() + 1,
                year: today.getFullYear(),
            },
            horoscope,
        });
    } catch (error: any) {
        console.error("ERROR RUN-DAILY:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "Error en run-daily",
                details: error?.message || "Desconocido",
            },
            { status: 500 }
        );
    }
}