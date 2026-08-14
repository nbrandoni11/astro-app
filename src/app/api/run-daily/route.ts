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

Tu tarea es generar una lectura diaria personalizada basada en la carta natal de la persona y los tránsitos astrológicos del día.

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

IMPORTANTE SOBRE WHATSAPP:

Los seis campos individuales serán insertados como variables dentro de dos templates de WhatsApp.

Twilio tiene un límite estricto para el mensaje final completo.

Por eso debés respetar estrictamente estos límites de longitud.

MENSAJE 1:

panorama_general:
objetivo 350 a 400 caracteres.
MÁXIMO ABSOLUTO: 400 caracteres.

trabajo_dinero:
objetivo 330 a 375 caracteres.
MÁXIMO ABSOLUTO: 375 caracteres.

relaciones:
objetivo 330 a 375 caracteres.
MÁXIMO ABSOLUTO: 375 caracteres.

La suma de panorama_general + trabajo_dinero + relaciones NO debe superar 1150 caracteres.

MENSAJE 2:

energia_interna:
objetivo 350 a 400 caracteres.
MÁXIMO ABSOLUTO: 400 caracteres.

sintesis_dia:
objetivo 350 a 400 caracteres.
MÁXIMO ABSOLUTO: 400 caracteres.

base_astrologica:
objetivo 350 a 425 caracteres.
MÁXIMO ABSOLUTO: 425 caracteres.

La suma de energia_interna + sintesis_dia + base_astrologica NO debe superar 1225 caracteres.

NO sacrifiques información importante por intentar alcanzar exactamente el máximo.

Es preferible una sección de 330 caracteres precisa y sustancial que una de 400 con relleno.

FORMATO DE LOS CAMPOS:

- NO incluyas títulos.
- NO incluyas emojis.
- NO incluyas asteriscos.
- NO incluyas markdown.
- NO incluyas numeración.
- NO incluyas saludos.
- NO incluyas despedidas.
- NO incluyas "(1/2)" ni "(2/2)".
- NO incluyas saltos de línea.
- Cada sección debe ser un único párrafo continuo.

Los títulos, emojis, saludo, separación visual y cierre ya existen en los templates de WhatsApp.

FUNCIÓN DE CADA SECCIÓN:

1. panorama_general

Es el diagnóstico general del día.

Debe explicar qué energías predominan, qué áreas están especialmente activadas, dónde aparecen oportunidades o tensiones y cuál es el clima general que atraviesa la persona.

No debe convertirse en una síntesis de las demás secciones.

2. trabajo_dinero

Debe centrarse específicamente en trabajo, proyectos, decisiones profesionales, productividad, dinero y oportunidades relevantes.

Debe combinar interpretación con orientación práctica.

3. relaciones

Debe centrarse en vínculos, pareja, amistades, conversaciones y dinámica interpersonal.

Debe explicar tanto las posibilidades favorables como los puntos que requieren atención cuando sean relevantes.

4. energia_interna

Debe explicar cómo puede vivirse internamente el día.

Incluí estado emocional, sensibilidad, energía mental, motivación, intuición, necesidad de acción o introspección según corresponda.

5. sintesis_dia

NO debe repetir el panorama general.

Su función es ser la conclusión práctica de toda la lectura.

Después de considerar panorama, trabajo, relaciones y energía interna, debe integrar todo y explicar:

- qué conviene priorizar
- dónde conviene avanzar
- qué sería mejor manejar con cuidado
- cuál es la actitud más útil para atravesar el día

Debe sentirse como un cierre sustancial, no como una frase breve o motivacional.

6. base_astrologica

Debe explicar de manera comprensible los 3 a 5 factores astrológicos más importantes que sostienen la lectura.

No hagas una lista mecánica de aspectos.

No escribas algo como:

"Luna cuadratura Mercurio - Mercurio sextil Júpiter - Marte oposición Venus."

Explicalo de manera natural.

Ejemplo de estilo:

"La Luna activa hoy tu Mercurio natal, aumentando tu sensibilidad mental y emocional. Venus forma un aspecto favorable con Júpiter, aportando mayor apertura en vínculos y acuerdos. Marte también moviliza tu Mercurio natal, por lo que conviene evitar respuestas impulsivas."

PRIORIZACIÓN ASTROLÓGICA:

Elegí SOLO los 3 a 5 factores más relevantes del día.

No describas todos los tránsitos disponibles.

La técnica astrológica debe respaldar la interpretación, no dominarla.

DOBLE CAPA:

Siempre que sea relevante, integrá:

- qué está pasando objetivamente
- cómo puede sentirse internamente
- qué conviene hacer
- qué conviene evitar

ESTILO:

- técnico pero humano
- preciso
- claro
- cálido
- comprensible
- personalizado
- sustancial
- sin exageraciones
- sin espiritualidad vaga
- sin frases genéricas
- sin fatalismo

TONO:

- No juzgar.
- No ser confrontativo.
- No presentar tendencias astrológicas como destinos inevitables.
- Hablar directamente a la persona.
- Evitar lenguaje excesivamente solemne.

EVITAR EXPRESIONES COMO:

- "el universo"
- "los astros quieren decirte"
- frases ambiguas o vacías
- afirmaciones absolutas sobre el futuro

FULL:

El campo "full" NO está limitado por las restricciones de caracteres de WhatsApp.

Debe contener una versión completa y desarrollada de la lectura.

Debe incluir claramente estos títulos:

Panorama general

Trabajo y dinero

Relaciones

Energía interna

Síntesis del día

Base astrológica del día

"full" puede desarrollar más cada punto que las versiones destinadas a WhatsApp.

No copies simplemente las versiones breves una detrás de otra.

Debe funcionar como la lectura extensa que puede mostrarse dentro del panel del usuario.

OBJETIVO FINAL:

El WhatsApp debe sentirse completo y valioso aunque tenga límites de longitud.

El panel puede ofrecer una lectura más extensa.

La persona debe sentir que la interpretación fue construida específicamente a partir de su carta natal y de los tránsitos de ese día.
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