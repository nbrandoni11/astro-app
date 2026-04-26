import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNatalChart, getDailyTransits } from "@/lib/astro-engine";

type HoroscopeAIResponse = {
    full?: string;
    whatsapp_message_1?: string;
    whatsapp_message_2?: string;
};

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

        const formattedDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const { data: existingHoroscopes, error: existingError } =
            await supabaseAdmin
                .from("daily_horoscopes")
                .select("*")
                .eq("user_id", user.id)
                .eq("horoscope_date", formattedDate)
                .limit(1);

        if (existingError) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Error consultando horóscopo existente",
                    details: existingError.message,
                },
                { status: 500 }
            );
        }

        const existingHoroscope = existingHoroscopes?.[0];

        if (existingHoroscope) {
            return NextResponse.json({
                ok: true,
                user: user.full_name,
                timezone: user.timezone,
                date: formattedDate,
                horoscope: existingHoroscope.horoscope_text,
                whatsappMessage1: existingHoroscope.whatsapp_message_1,
                whatsappMessage2: existingHoroscope.whatsapp_message_2,
                reused: true,
            });
        }

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
Sos un astrólogo experto.

Tu tarea es generar una lectura diaria personalizada basada en carta natal + tránsitos.

Respondé EXCLUSIVAMENTE en JSON válido, sin markdown externo, sin texto antes ni después.

La respuesta debe tener exactamente esta estructura:

{
  "full": "...",
  "whatsapp_message_1": "...",
  "whatsapp_message_2": "..."
}

FORMATO OBLIGATORIO DEL CONTENIDO:
Panorama general
Trabajo y dinero
Relaciones
Energía interna
Síntesis del día
Base astrológica del día

DISTRIBUCIÓN OBLIGATORIA PARA WHATSAPP:
- whatsapp_message_1 debe incluir SOLO:
  Panorama general
  Trabajo y dinero
  Relaciones

- whatsapp_message_2 debe incluir SOLO:
  Energía interna
  Síntesis del día
  Base astrológica del día

LÍMITES PARA WHATSAPP:
- whatsapp_message_1 debe tener máximo 1400 caracteres.
- whatsapp_message_2 debe tener máximo 1400 caracteres.
- No partas secciones entre mensajes.
- Si hace falta ajustar longitud, resumí dentro de cada sección sin perder claridad.

ESTILO:
- técnico pero humano
- preciso
- claro
- sin exageraciones
- sin espiritualidad vaga
- sin frases genéricas

REGLAS CLAVE:

1. PRIORIZACIÓN
Elegí SOLO los 3 a 5 aspectos más relevantes del día.
No describas todo.

2. DOBLE CAPA
La lectura principal debe incluir:
- lo que está pasando objetivamente
- cómo puede sentirse internamente la persona
- qué conviene hacer o evitar

3. TÉCNICA SEPARADA
NO mezcles demasiada técnica dentro del cuerpo principal.
La lectura principal debe ser fluida, clara y agradable de leer.

La técnica debe ir al final, en la sección:
"Base astrológica del día"

Ahí sí podés mencionar:
- conjunciones
- oposiciones
- cuadraturas
- planeta natal / planeta en tránsito
- casa activada

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
El campo "full" debe tener entre 350 y 500 palabras total.

8. PRECISIÓN Y TIMING
El texto debe sentirse actual y específico del día.
Evitar frases neutras o demasiado generales.

9. BASE TÉCNICA FINAL
La sección "Base astrológica del día" debe ser breve:
- 3 a 5 bullets máximo
- concreta
- sin explicación larga
- solo los factores más importantes

OBJETIVO:
Que la lectura principal sea clara, útil y emocionalmente comprensible, y que la técnica aparezca al final como respaldo y no como peso narrativo.

IMPORTANTE:
- El campo "full" debe contener la lectura completa con las 6 secciones.
- whatsapp_message_1 y whatsapp_message_2 deben ser versiones listas para enviar por WhatsApp.
- whatsapp_message_1 + whatsapp_message_2 deben conservar el contenido esencial de full, pero organizado en dos mensajes.
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
        const rawContent = aiData?.choices?.[0]?.message?.content || "";

        let parsed: HoroscopeAIResponse;

        try {
            parsed = JSON.parse(rawContent);
        } catch {
            return NextResponse.json(
                {
                    ok: false,
                    error: "OpenAI no devolvió JSON válido",
                    rawContent,
                },
                { status: 500 }
            );
        }

        const horoscopeText = parsed.full?.trim();
        const whatsappMessage1 = parsed.whatsapp_message_1?.trim();
        const whatsappMessage2 = parsed.whatsapp_message_2?.trim();

        if (!horoscopeText || !whatsappMessage1 || !whatsappMessage2) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "OpenAI devolvió JSON incompleto",
                    parsed,
                },
                { status: 500 }
            );
        }

        if (whatsappMessage1.length > 1400 || whatsappMessage2.length > 1400) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Los mensajes de WhatsApp superan el límite definido",
                    lengths: {
                        whatsappMessage1: whatsappMessage1.length,
                        whatsappMessage2: whatsappMessage2.length,
                    },
                    parsed,
                },
                { status: 500 }
            );
        }

        const { error: insertError } = await supabaseAdmin
            .from("daily_horoscopes")
            .insert({
                user_id: user.id,
                horoscope_text: horoscopeText,
                whatsapp_message_1: whatsappMessage1,
                whatsapp_message_2: whatsappMessage2,
                horoscope_date: formattedDate,
                timezone_used: user.timezone,
                status: "generated",
                send_status: "pending",
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
            whatsappMessage1,
            whatsappMessage2,
            lengths: {
                whatsappMessage1: whatsappMessage1.length,
                whatsappMessage2: whatsappMessage2.length,
            },
            reused: false,
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