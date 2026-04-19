import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNatalChart, getDailyTransits } from "@/lib/astro-engine";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        const { data: users } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId);

        const user = users?.[0];

        if (!user) {
            return NextResponse.json({ ok: false, error: "Usuario no encontrado" });
        }

        const today = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: user.timezone || "UTC",
            })
        );

        // 1. Natal
        const natal = await getNatalChart({
            day: user.birth_day,
            month: user.birth_month,
            year: user.birth_year,
            hour: user.birth_hour,
            min: user.birth_min,
            lat: user.birth_lat,
            lon: user.birth_lon,
            tzone: user.birth_tzone,
        });

        // 2. Transits
        const transits = await getDailyTransits({
            day: today.getDate(),
            month: today.getMonth() + 1,
            year: today.getFullYear(),
            hour: 12,
            min: 0,
            lat: user.birth_lat,
            lon: user.birth_lon,
            tzone: user.birth_tzone,
        });

        // 3. OpenAI
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4.1",
                messages: [
                    {
                        role: "user",
                        content: JSON.stringify({ natal, transits }),
                    },
                ],
            }),
        });

        const aiData = await aiRes.json();
        const horoscopeText =
            aiData?.choices?.[0]?.message?.content || "Sin resultado";

        // 4. Guardar
        const formattedDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        await supabaseAdmin.from("daily_horoscopes").insert({
            user_id: user.id,
            horoscope_text: horoscopeText,
            horoscope_date: formattedDate,
            timezone_used: user.timezone,
            status: "generated",
        });

        return NextResponse.json({
            ok: true,
            horoscope: horoscopeText,
        });
    } catch (err: any) {
        return NextResponse.json({
            ok: false,
            error: err?.message || "error",
        });
    }
}