import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
    return NextResponse.json({
        ok: true,
        route: "/api/generate-horoscope",
        message: "Endpoint activo",
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { natal, transits } = body;

        console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);
        console.log("NATAL EXISTS:", !!natal);
        console.log("TRANSITS EXISTS:", !!transits);

        const heavyPlanets = ["Pluto", "Saturn", "Uranus", "Neptune"];
        const strongAspects = ["Square", "Opposition", "Conjunction"];

        const planetWeight = (p: string) => {
            if (p === "Pluto") return 4;
            if (p === "Saturn") return 3;
            if (p === "Uranus") return 3;
            if (p === "Neptune") return 2;
            if (p === "Jupiter") return 2;
            if (p === "Mars") return 2;
            if (p === "Sun") return 1;
            if (p === "Venus") return 1;
            if (p === "Mercury") return 1;
            if (p === "Moon") return 0;
            return 0;
        };

        const aspectWeight = (aType: string) => {
            if (aType === "Square") return 3;
            if (aType === "Opposition") return 3;
            if (aType === "Conjunction") return 2;
            if (aType === "Trine") return 1;
            if (aType === "Sextile") return 1;
            return 0;
        };

        const importantTransits = transits.data.transit_relation
            .filter((t: any) => {
                return (
                    heavyPlanets.includes(t.transit_planet) ||
                    strongAspects.includes(t.aspect_type)
                );
            })
            .sort((a: any, b: any) => {
                return (
                    planetWeight(b.transit_planet) +
                    aspectWeight(b.aspect_type) -
                    (planetWeight(a.transit_planet) +
                        aspectWeight(a.aspect_type))
                );
            })
            .slice(0, 4);

        const prompt = `
Sos un astrólogo profesional con enfoque psicológico y precisión técnica.

Tu tarea es interpretar un horóscopo diario completamente personalizado.

Usá:
- la carta natal del usuario
- los tránsitos del día

REGLAS OBLIGATORIAS:

1. No escribas de forma genérica.
2. No uses frases vacías tipo "es un buen momento para".
3. No hables en abstracto sin anclar en situaciones reales.
4. Escribí como si conocieras profundamente a la persona.
5. El texto debe sentirse específico, no universal.

ESTRUCTURA:

- Comenzá con una afirmación directa (no suave)
- Explicá el conflicto o tensión principal del día
- Bajalo a áreas concretas (trabajo, decisiones, vínculos, energía personal)
- Sumá una lectura emocional clara (qué le pasa internamente)
- Cerrá con una dirección clara (no consejo genérico)

TONO:

- íntimo pero sólido
- sin exageración espiritual
- sin misticismo vacío
- preciso y humano

LONGITUD:
Entre 180 y 220 palabras

DATOS:

NATAL:
${JSON.stringify(natal)}

TRANSITOS:
${JSON.stringify(transits)}

Ahora generá el horóscopo.
`;

        const response = await openai.responses.create({
            model: "gpt-5.4-mini",
            input: prompt,
        });

        console.log("OPENAI RESPONSE OK");

        return NextResponse.json({
            horoscope: response.output_text,
        });
    } catch (error: any) {
        console.error("ERROR GENERATE-HOROSCOPE:");
        console.error(error);
        console.error("ERROR MESSAGE:", error?.message);
        console.error("ERROR STATUS:", error?.status);
        console.error("ERROR RESPONSE:", error?.response);

        return NextResponse.json(
            {
                error: "Error generando horóscopo",
                details: error?.message || "Desconocido",
            },
            { status: 500 }
        );
    }
}