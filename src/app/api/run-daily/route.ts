import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNatalChart, getDailyTransits } from "@/lib/astro-engine";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", userId);

        const user = users?.[0];

        if (error || !user) {
            return NextResponse.json(
                { ok: false, error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        const today = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: user.timezone || "UTC",
            })
        );

        // 1. Carta natal
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

        if (!natal || natal.status === false) {
            return NextResponse.json({
                ok: false,
                error: "Error en carta natal",
                details: natal,
            });
        }

        // 2. Tránsitos diarios
        const transits = await getDailyTransits({
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
        });

        if (!transits || transits.status === false) {
            return NextResponse.json({
                ok: false,
                error: "Error en tránsitos",
                details: transits,
            });
        }

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4.1",
                temperature: 0.7,
                messages: [
                    {
                        role: "system",
                        content: `
Sos un astrólogo experto y preciso.

Tu tarea es escribir una lectura diaria astrológica personalizada en español, basada en carta natal + tránsitos del día.

ESTILO:
- profesional
- técnico pero legible
- psicológico
- específico
- nada genérico
- nada de espiritualidad vacía
- nada de frases tipo "puede ser" o "el universo te pide"

IMPORTANTE:
- Sí podés mencionar elementos técnicos astrológicos, pero bien integrados al texto
- Ejemplo correcto: "Venus natal activada por el Sol y Quirón"
- Ejemplo incorrecto: listas robóticas de aspectos sin interpretación

FORMATO OBLIGATORIO:
Usá secciones con estos títulos exactos:

Panorama general
Trabajo y dinero
Relaciones
Energía interna
Síntesis del día

REGLAS:
- entre 300 y 350 palabras
- cada sección debe tener contenido real, no relleno
- explicá qué tránsito o activación sostiene cada lectura
- no enumeres todos los aspectos: priorizá los más relevantes
- si hay tensión fuerte, decilo con claridad
- si hay apoyos, mencionarlos también
- el texto tiene que sentirse como una lectura seria, premium y concreta

OBJETIVO:
Que la persona sienta que esto está técnicamente fundamentado y, al mismo tiempo, profundamente personalizado.
            `,
                    },
                    {
                        role: "user",
                        content: `
Generá la lectura diaria para esta persona.

Fecha local del usuario:
${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}

Timezone del usuario:
${user.timezone}

Carta natal:
${JSON.stringify(natal)}

Tránsitos diarios:
${JSON.stringify(transits)}
            `,
                    },
                ],
            }),
        });

        const aiData = await aiRes.json();
        const horoscopeText =
            aiData?.choices?.[0]?.message?.content || "Sin resultado";

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
            return NextResponse.json({
                ok: false,
                error: "Error guardando horóscopo",
                details: insertError.message,
            });
        }

        return NextResponse.json({
            ok: true,
            user: user.full_name,
            timezone: user.timezone,
            date: formattedDate,
            horoscope: horoscopeText,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: "Error en run-daily",
                details: err?.message || "error",
            },
            { status: 500 }
        );
    }
}