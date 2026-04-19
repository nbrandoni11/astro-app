import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNatalChart, getDailyTransits } from "@/lib/astro-engine";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        // 1. Obtener usuario
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

        // 2. Fecha según timezone del usuario
        const today = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: user.timezone || "UTC",
            })
        );

        const formattedDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        // 3. Carta natal
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

        // 4. Tránsitos diarios
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

        // 5. Generación con OpenAI
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
Sos un astrólogo experto.

Tu tarea es generar una lectura diaria personalizada basada en carta natal + tránsitos.

ESTILO:
- técnico pero humano
- preciso
- claro
- sin exageraciones
- sin espiritualidad vaga
- sin frases genéricas

FORMATO OBLIGATORIO:
Panorama general
Trabajo y dinero
Relaciones
Energía interna
Síntesis del día

REGLAS CLAVE:

1. PRIORIZACIÓN
Elegí SOLO los 3 a 5 aspectos más relevantes del día.
No describas todo.

2. DOBLE CAPA
Cada interpretación debe incluir:
- lo que está pasando objetivamente (energía / dinámica)
- cómo puede sentirse internamente la persona

3. TÉCNICA VISIBLE (pero integrada)
Podés mencionar:
- conjunciones
- oposiciones
- cuadraturas

Siempre integradas en lenguaje natural.

4. TONO
- No juzgar
- No ser confrontativo
- Ser comprensivo y claro

5. UTILIDAD
El texto debe ayudar a entender:
- qué está pasando hoy
- cómo puede sentirse
- dónde conviene avanzar
- dónde conviene tener cuidado

6. EVITAR
No usar:
- "el universo"
- "puede que"
- "quizás"
- lenguaje ambiguo

7. LONGITUD
Entre 350 y 500 palabras.

OBJETIVO:
Que la persona sienta que la lectura refleja con precisión su estado emocional y le da claridad estratégica sobre cómo moverse en el día.
            `,
                    },
                    {
                        role: "user",
                        content: `
Generá la lectura diaria para esta persona.

Fecha local del usuario:
${formattedDate}

Timezone:
${user.timezone}

Carta natal:
${JSON.stringify(natal)}

Tránsitos:
${JSON.stringify(transits)}
            `,
                    },
                ],
            }),
        });

        const aiData = await aiRes.json();
        const horoscopeText =
            aiData?.choices?.[0]?.message?.content || "Sin resultado";

        // 6. Guardar en base de datos
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

        // 7. Respuesta final
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