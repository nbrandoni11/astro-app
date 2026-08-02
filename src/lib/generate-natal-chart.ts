import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export type NatalChartInput = {
    day: number;
    month: number;
    year: number;
    hour: number;
    min: number;
    lat: number;
    lon: number;
    tzone: number;
};

export async function generateNatalChart(input: NatalChartInput) {
    const token = process.env.ASTROLOGY_API_TOKEN;

    if (!token || !process.env.OPENAI_API_KEY) {
        throw new Error("Faltan variables de AstrologyAPI u OpenAI");
    }

    const astroRes = await fetch(
        "https://json.astrologyapi.com/v1/western_chart_data",
        {
            method: "POST",
            headers: {
                "x-astrologyapi-key": token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                day: String(input.day),
                month: String(input.month),
                year: String(input.year),
                hour: String(input.hour),
                min: String(input.min),
                lat: String(input.lat),
                lon: String(input.lon),
                tzone: String(input.tzone),
                house_type: "placidus",
            }),
        }
    );

    const responseText = await astroRes.text();

    let astroData: unknown;

    try {
        astroData = JSON.parse(responseText);
    } catch {
        throw new Error(
            `AstrologyAPI no devolvió JSON: ${responseText.slice(0, 300)}`
        );
    }

    if (!astroRes.ok) {
        throw new Error(`Error en AstrologyAPI: ${responseText.slice(0, 300)}`);
    }

    const response = await openai.responses.create({
        model: "gpt-5.4",
        input: [
            {
                role: "system",
                content: `
Sos un astrólogo profesional especializado en astrología natal psicológica, tradicional y evolutiva.

Tu trabajo consiste en elaborar informes comparables a los que entregaría un astrólogo con muchos años de experiencia en una consulta privada.

Reglas obligatorias:

- Nunca escribas como un horóscopo.
- Nunca uses frases motivacionales.
- Nunca uses lenguaje esotérico.
- Nunca inventes información.
- Nunca hagas predicciones.
- Nunca describas un planeta de forma aislada.
- Siempre integrá signo, casa, aspectos y contexto.
- Explicá el razonamiento detrás de cada conclusión.
- Si una configuración puede manifestarse de distintas maneras, indicalo.
- Si existen tensiones internas en la carta, explicalas.
- Evitá frases que podrían aplicarse a cualquier persona.

El lector debe percibir profundidad, criterio y conocimiento real de astrología.
`,
            },
            {
                role: "user",
                content: `
Realizá una interpretación profesional de esta carta natal.

Debe tener entre 800 y 1200 palabras.

Organizá la respuesta en:

1. Personalidad profunda
2. Forma de pensar
3. Mundo emocional
4. Relaciones
5. Fortalezas
6. Desafíos
7. Síntesis

No repitas conceptos entre secciones.
No enumeres simplemente significados planetarios.
No menciones aspectos técnicos salvo cuando ayuden a justificar una conclusión.

Carta natal:

${JSON.stringify(astroData)}
`,
            },
        ],
    });

    const interpretation = response.output_text?.trim();

    if (!interpretation) {
        throw new Error("OpenAI no devolvió una interpretación");
    }

    return {
        astroData,
        interpretation,
    };
}