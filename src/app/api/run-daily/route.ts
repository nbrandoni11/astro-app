import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNatalChart, getDailyTransits } from "@/lib/astro-engine";

type HoroscopeAIResponse = {
    full?: string;
    panorama_general?: string;
    trabajo_dinero?: string;
    relaciones?: string;
    energia_interna?: string;
    sintesis_dia?: string;
    base_astrologica?: string;
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

        // ─────────────────────────────────────────────
        // CARTA NATAL
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // TRÁNSITOS DEL DÍA
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // GENERACIÓN CON OPENAI
        // ─────────────────────────────────────────────

        const aiRes = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4.1",
                    temperature: 0.7,
                    response_format: {
                        type: "json_object",
                    },
                    messages: [
                        {
                            role: "system",
                            content: `
Sos un astrólogo experto.

Tu tarea es generar una lectura diaria personalizada basada en carta natal + tránsitos.

Respondé EXCLUSIVAMENTE en JSON válido.

La respuesta debe tener EXACTAMENTE esta estructura:

{
  "full": "...",
  "panorama_general": "...",
  "trabajo_dinero": "...",
  "relaciones": "...",
  "energia_interna": "...",
  "sintesis_dia": "...",
  "base_astrologica": "..."
}

IMPORTANTE:

Cada uno de los seis campos corresponde a una sección que será insertada individualmente dentro de un template de WhatsApp.

Por lo tanto:

- NO incluyas los títulos de las secciones dentro de los campos.
- NO incluyas emojis.
- NO incluyas asteriscos.
- NO incluyas markdown.
- NO incluyas numeración.
- NO incluyas saludos.
- NO incluyas despedidas.
- NO incluyas "(1/2)" ni "(2/2)".
- NO incluyas saltos de línea dentro de las secciones.
- Cada sección debe ser un único párrafo continuo.

Los títulos, emojis, espacios, saludo y despedida ya están definidos en los templates de WhatsApp.

SECCIONES:

1. panorama_general
Debe explicar cuál es el clima principal del día para esta persona.

2. trabajo_dinero
Debe centrarse en trabajo, decisiones, productividad, proyectos, dinero y oportunidades relevantes.

3. relaciones
Debe centrarse en vínculos, pareja, amistades, conversaciones y dinámica interpersonal.

4. energia_interna
Debe explicar el estado emocional, sensibilidad, energía mental e impulso interno de la persona.

5. sintesis_dia
Debe sintetizar el día de forma útil y concreta. Debe ayudar a la persona a entender dónde avanzar y dónde conviene tener cuidado.

6. base_astrologica
Debe explicar de manera breve y comprensible cuáles son los 3 a 5 factores astrológicos más importantes que sostienen la lectura.

BASE ASTROLÓGICA:

No hagas una cadena difícil de leer del estilo:

"Luna cuadratura Mercurio - Mercurio sextil Júpiter - Marte oposición..."

En cambio, explicá los aspectos de manera natural y comprensible.

Ejemplo de estilo:

"La Luna activa hoy tu Mercurio natal, aumentando tu sensibilidad mental y emocional. Venus forma un aspecto favorable con Júpiter, aportando mayor apertura en vínculos y acuerdos. Marte también moviliza tu Mercurio natal, por lo que conviene evitar respuestas impulsivas."

PRIORIZACIÓN:

Elegí SOLO los 3 a 5 aspectos astrológicos más relevantes del día.

No describas todos los tránsitos disponibles.

DOBLE CAPA:

La lectura debe integrar:

- qué está pasando objetivamente
- cómo puede sentirse internamente la persona
- qué conviene hacer
- qué conviene evitar

ESTILO:

- técnico pero humano
- preciso
- claro
- cálido
- comprensible
- personalizado
- sin exageraciones
- sin espiritualidad vaga
- sin frases genéricas
- sin fatalismo

TONO:

- No juzgar.
- No ser confrontativo.
- No presentar tendencias astrológicas como destinos inevitables.
- Ser comprensivo y claro.
- Hablarle directamente a la persona.

EVITAR:

No usar expresiones como:

- "el universo"
- "puede que"
- "quizás"
- "los astros quieren decirte"
- frases ambiguas o vacías

LONGITUD:

La lectura completa debe mantener aproximadamente la misma profundidad que una lectura de 350 a 500 palabras.

Distribuí esa extensión entre las seis secciones.

Las primeras cinco secciones deben ser suficientemente desarrolladas para que la lectura se sienta personal y sustancial.

La base astrológica debe ser algo más breve.

FULL:

El campo "full" debe contener la lectura completa con las seis secciones.

En "full" SÍ deben aparecer los títulos:

Panorama general

Trabajo y dinero

Relaciones

Energía interna

Síntesis del día

Base astrológica del día

Separá claramente las seis secciones dentro de "full".

OBJETIVO FINAL:

La persona debe sentir que recibió una lectura completa, específica y realmente construida a partir de su carta natal y de los tránsitos de ese día.

La lectura principal debe ser clara y agradable de leer.

La técnica astrológica debe funcionar como respaldo de la interpretación, no como un listado pesado de aspectos.
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
            }
        );

        if (!aiRes.ok) {
            const aiError = await aiRes.text();

            return NextResponse.json(
                {
                    ok: false,
                    error: "Error llamando a OpenAI",
                    details: aiError,
                },
                { status: 500 }
            );
        }

        const aiData = await aiRes.json();

        const rawContent =
            aiData?.choices?.[0]?.message?.content || "";

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

        // ─────────────────────────────────────────────
        // VALIDAR LAS 6 SECCIONES
        // ─────────────────────────────────────────────

        const horoscopeText = parsed.full?.trim();

        const panoramaGeneral =
            parsed.panorama_general?.trim();

        const trabajoDinero =
            parsed.trabajo_dinero?.trim();

        const relaciones =
            parsed.relaciones?.trim();

        const energiaInterna =
            parsed.energia_interna?.trim();

        const sintesisDia =
            parsed.sintesis_dia?.trim();

        const baseAstrologica =
            parsed.base_astrologica?.trim();

        if (
            !horoscopeText ||
            !panoramaGeneral ||
            !trabajoDinero ||
            !relaciones ||
            !energiaInterna ||
            !sintesisDia ||
            !baseAstrologica
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "OpenAI devolvió JSON incompleto",
                    parsed,
                },
                { status: 500 }
            );
        }

        // ─────────────────────────────────────────────
        // PREPARAR LOS DOS MENSAJES ESTRUCTURADOS
        // ─────────────────────────────────────────────

        const whatsappMessage1 = JSON.stringify({
            panorama_general: panoramaGeneral,
            trabajo_dinero: trabajoDinero,
            relaciones: relaciones,
        });

        const whatsappMessage2 = JSON.stringify({
            energia_interna: energiaInterna,
            sintesis_dia: sintesisDia,
            base_astrologica: baseAstrologica,
        });

        // ─────────────────────────────────────────────
        // GUARDAR EN SUPABASE
        // ─────────────────────────────────────────────

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

            sections: {
                panoramaGeneral,
                trabajoDinero,
                relaciones,
                energiaInterna,
                sintesisDia,
                baseAstrologica,
            },

            whatsappMessage1,
            whatsappMessage2,

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