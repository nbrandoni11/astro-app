import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------------
// TRADUCCIONES
// --------------------------------------------------

const planetTranslations: Record<string, string> = {
    Sun: "Sol",
    Moon: "Luna",
    Mercury: "Mercurio",
    Venus: "Venus",
    Mars: "Marte",
    Jupiter: "Júpiter",
    Saturn: "Saturno",
    Uranus: "Urano",
    Neptune: "Neptuno",
    Pluto: "Plutón",
};

const signTranslations: Record<string, string> = {
    Aries: "Aries",
    Taurus: "Tauro",
    Gemini: "Géminis",
    Cancer: "Cáncer",
    Leo: "Leo",
    Virgo: "Virgo",
    Libra: "Libra",
    Scorpio: "Escorpio",
    Sagittarius: "Sagitario",
    Capricorn: "Capricornio",
    Aquarius: "Acuario",
    Pisces: "Piscis",
};

const aspectTranslations: Record<string, string> = {
    Conjunction: "conjunción",
    Opposition: "oposición",
    Trine: "trígono",
    Square: "cuadratura",
    Sextile: "sextil",
};

// --------------------------------------------------
// ENDPOINT
// --------------------------------------------------

export async function GET() {
    try {
        // Fecha actual de Argentina
        const argentinaDate = new Date().toLocaleDateString(
            "en-CA",
            {
                timeZone:
                    "America/Argentina/Buenos_Aires",
            }
        );

        const [year, month, day] =
            argentinaDate
                .split("-")
                .map(Number);

        // --------------------------------------------------
        // 1. OBTENER POSICIONES PLANETARIAS
        // --------------------------------------------------

        const astroResponse = await fetch(
            "https://json.astrologyapi.com/v1/planets/tropical",
            {
                method: "POST",
                headers: {
                    "x-astrologyapi-key":
                        process.env.ASTROLOGY_API_TOKEN!,
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    day,
                    month,
                    year,
                    hour: 12,
                    min: 0,
                    lat: -34.6037,
                    lon: -58.3816,
                    tzone: -3,
                }),
            }
        );

        const planets =
            await astroResponse.json();

        if (!astroResponse.ok) {
            throw new Error(
                "Error obteniendo datos de AstrologyAPI"
            );
        }

        // --------------------------------------------------
        // 2. NORMALIZAR CIELO GENERAL
        // --------------------------------------------------

        const generalSky = planets
            .filter(
                (p: any) =>
                    p.name !== "Ascendant"
            )
            .map((p: any) => ({
                planet: p.name,
                sign: p.sign,
                degree: p.normDegree,
                fullDegree: p.fullDegree,
                retrograde:
                    p.isRetro === "true",
            }));

        // --------------------------------------------------
        // 3. CALCULAR ASPECTOS
        // --------------------------------------------------

        const aspectDefinitions = [
            {
                name: "Conjunction",
                angle: 0,
                orb: 6,
            },
            {
                name: "Opposition",
                angle: 180,
                orb: 6,
            },
            {
                name: "Trine",
                angle: 120,
                orb: 5,
            },
            {
                name: "Square",
                angle: 90,
                orb: 5,
            },
            {
                name: "Sextile",
                angle: 60,
                orb: 4,
            },
        ];

        const aspects: any[] = [];

        for (
            let i = 0;
            i < generalSky.length;
            i++
        ) {
            for (
                let j = i + 1;
                j < generalSky.length;
                j++
            ) {
                const p1 = generalSky[i];
                const p2 = generalSky[j];

                let distance = Math.abs(
                    p1.fullDegree -
                    p2.fullDegree
                );

                if (distance > 180) {
                    distance =
                        360 - distance;
                }

                for (
                    const aspect
                    of aspectDefinitions
                ) {
                    const orb = Math.abs(
                        distance -
                        aspect.angle
                    );

                    if (
                        orb <= aspect.orb
                    ) {
                        aspects.push({
                            planet1:
                                p1.planet,

                            planet2:
                                p2.planet,

                            aspect:
                                aspect.name,

                            // Se conserva internamente.
                            // Sirve para medir importancia.
                            orb: Number(
                                orb.toFixed(2)
                            ),
                        });

                        break;
                    }
                }
            }
        }

        // --------------------------------------------------
        // 4. CREAR DATOS ASTROLÓGICOS YA FORMATEADOS
        // --------------------------------------------------

        const formattedPositions =
            generalSky.map((planet: any) => {
                const planetName =
                    planetTranslations[
                    planet.planet
                    ] || planet.planet;

                const signName =
                    signTranslations[
                    planet.sign
                    ] || planet.sign;

                const retrogradeText =
                    planet.retrograde
                        ? " retrógrado"
                        : "";

                return `${planetName}${retrogradeText} en ${signName}`;
            });

        // Ordenamos por orbe internamente:
        // los aspectos más exactos aparecen primero.
        const sortedAspects = [
            ...aspects,
        ].sort(
            (a, b) =>
                a.orb - b.orb
        );

        const formattedAspects =
            sortedAspects.map(
                (aspect: any) => {
                    const p1 =
                        generalSky.find(
                            (p: any) =>
                                p.planet ===
                                aspect.planet1
                        );

                    const p2 =
                        generalSky.find(
                            (p: any) =>
                                p.planet ===
                                aspect.planet2
                        );

                    const planet1Name =
                        planetTranslations[
                        aspect.planet1
                        ] ||
                        aspect.planet1;

                    const planet2Name =
                        planetTranslations[
                        aspect.planet2
                        ] ||
                        aspect.planet2;

                    const sign1 =
                        signTranslations[
                        p1.sign
                        ] || p1.sign;

                    const sign2 =
                        signTranslations[
                        p2.sign
                        ] || p2.sign;

                    const retro1 =
                        p1.retrograde
                            ? " retrógrado"
                            : "";

                    const retro2 =
                        p2.retrograde
                            ? " retrógrado"
                            : "";

                    const aspectName =
                        aspectTranslations[
                        aspect.aspect
                        ] ||
                        aspect.aspect;

                    // IMPORTANTE:
                    // El orbe NO se incluye.
                    return (
                        `${planet1Name}${retro1} en ${sign1} ` +
                        `— ${aspectName} con ` +
                        `${planet2Name}${retro2} en ${sign2}`
                    );
                }
            );

        // --------------------------------------------------
        // 5. GENERAR CONTENIDO
        // --------------------------------------------------

        const prompt = `
Sos un astrólogo profesional especializado en astrología occidental tropical y un excelente comunicador.

Generá el contenido astrológico GENERAL correspondiente al ${day}/${month}/${year}.

Este contenido representa el clima astrológico colectivo del día.

NO pertenece a ningún signo particular.

Debe poder aplicarse como lectura colectiva para personas de cualquier signo zodiacal.

Toda la interpretación debe estar fundamentada EXCLUSIVAMENTE en los datos proporcionados.

==================================================
POSICIONES PLANETARIAS
==================================================

${formattedPositions.join("\n")}

==================================================
ASPECTOS DEL DÍA
==================================================

Los siguientes aspectos ya fueron calculados por el sistema.

Están ordenados aproximadamente desde los más exactos hacia los menos exactos.

Cada línea contiene el planeta, SU signo correcto, el aspecto y el segundo planeta con SU signo correcto.

NO reconstruyas ni modifiques esos datos.

${formattedAspects.join("\n")}

==================================================
REGLAS DE PRECISIÓN
==================================================

Estas reglas son obligatorias:

1. No inventes posiciones planetarias.

2. No inventes aspectos.

3. No cambies el signo de ningún planeta.

4. Cuando menciones un aspecto, respetá exactamente la combinación suministrada.

Por ejemplo, si recibís:

Sol en Virgo — conjunción con Mercurio en Leo

podés escribir:

"El Sol en Virgo forma una conjunción con Mercurio en Leo."

No escribas:

"El Sol conjunto a Mercurio en Virgo."

5. No inventes ingresos, cambios de signo, estaciones ni otros eventos.

Una posición indica dónde está un planeta, no necesariamente que haya ingresado allí ese día.

6. No uses casas ni Ascendente.

7. No uses una carta natal individual.

8. No hagas afirmaciones que requieran conocer la carta natal del lector.

9. Solo mencioná retrogradación cuando esté explícitamente indicada en los datos.

10. El orden de ASPECTOS DEL DÍA refleja su exactitud relativa.

Usalo para ayudarte a decidir qué aspectos priorizar.

11. No menciones orbes en ningún contenido destinado al público.

==================================================
NIVEL 1 — TEXTOS PARA LAS IMÁGENES
==================================================

Generá:

- sinopsis
- general
- amor
- trabajo_dinero
- bienestar
- consejo

Estos textos van escritos SOBRE IMÁGENES.

La persona que los lee NO necesita saber astrología.

Primero analizá internamente:

- posiciones;
- aspectos;
- retrogradaciones;
- intensidad relativa de los aspectos;
- naturaleza de los planetas;

y después traducí esa interpretación a lenguaje cotidiano.

==================================================
REGLA FUNDAMENTAL DE LAS PLACAS
==================================================

En:

"sinopsis"
"general"
"amor"
"trabajo_dinero"
"bienestar"
"consejo"

NO menciones:

- planetas;
- signos zodiacales;
- grados;
- retrogradaciones;
- conjunciones;
- oposiciones;
- cuadraturas;
- trígonos;
- sextiles;
- orbes;
- ningún otro tecnicismo astrológico.

La astrología determina el contenido.

Pero NO aparece explícitamente en las placas.

Toda la explicación astrológica queda exclusivamente para "caption".

==================================================
ESTILO DE LAS PLACAS
==================================================

Escribí en español claro, natural y contemporáneo.

Tiene que entenderse inmediatamente.

Priorizá situaciones y sensaciones concretas.

Usá frases relativamente cortas.

Una idea principal por oración.

Evitá:

- lenguaje rebuscado;
- exceso de poesía;
- abstracciones innecesarias;
- frases vacías;
- fatalismo;
- predicciones deterministas.

Hablá de tendencias y posibilidades.

No escribas como si conocieras personalmente al lector.

==================================================
SINOPSIS
==================================================

Una frase clara, potente y fácil de recordar.

Máximo 30 palabras.

==================================================
GENERAL
==================================================

Entre 80 y 110 palabras.

Explicá de forma sencilla:

- qué tipo de día es;
- dónde puede aparecer tensión;
- qué puede favorecerlo;
- qué conviene tener presente.

==================================================
AMOR
==================================================

Entre 55 y 75 palabras.

Hablá de:

- vínculos;
- emociones;
- acercamientos;
- conversaciones;
- expectativas;
- distancias;
- límites;

según corresponda al cielo real del día.

==================================================
TRABAJO_DINERO
==================================================

Entre 55 y 75 palabras.

Traducí el clima del día a:

- trabajo;
- proyectos;
- decisiones;
- organización;
- negociaciones;
- acuerdos;
- dinero;

cuando esté razonablemente justificado.

==================================================
BIENESTAR
==================================================

Entre 55 y 75 palabras.

Hablá de:

- ritmo;
- energía;
- estado emocional;
- descanso;
- movimiento;
- regulación;
- sobrecarga;
- necesidad de bajar el ritmo;

según corresponda.

No hagas diagnósticos médicos.

==================================================
CONSEJO
==================================================

Una sola frase.

Concreta, humana y memorable.

Máximo 20 palabras.

==================================================
NIVEL 2 — CAPTION
==================================================

Generá además "caption".

Este texto acompaña el post.

Acá SÍ explicá la astrología detrás de las placas.

Debe ser:

- preciso;
- comprensible;
- interesante;
- explicativo;
- escrito completamente en español.

No menciones orbes.

==================================================
ESTRUCTURA DEL CAPTION
==================================================

EL CIELO DE HOY · ${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}

Un párrafo breve explicando el clima astrológico dominante.

AMOR Y VÍNCULOS

Explicá qué configuraciones fundamentan la lectura de vínculos.

TRABAJO Y DINERO

Explicá qué configuraciones fundamentan la lectura de trabajo, proyectos y dinero.

BIENESTAR

Explicá qué configuraciones fundamentan la lectura de bienestar.

ASPECTOS DESTACADOS

Seleccioná los aspectos más relevantes.

Explicalos brevemente y de manera comprensible.

==================================================
REGLAS DEL CAPTION
==================================================

- Usá los nombres en español suministrados.
- No traduzcas nuevamente los datos.
- No cambies signos.
- No cambies planetas.
- No reconstruyas los aspectos.
- No inventes aspectos.
- No inventes movimientos.
- No inventes cambios de signo.
- No menciones orbes.
- No hace falta mencionar todos los aspectos.
- Priorizá los aspectos más relevantes.
- Evitá una lista mecánica.
- Explicá qué significa la configuración que mencionás.
- No agregues hashtags.
- No agregues llamadas a la acción.
- No promociones ningún producto.

Antes de responder, verificá internamente:

1. Que cada planeta tenga el signo suministrado.
2. Que cada aspecto coincida literalmente con una configuración recibida.
3. Que las retrogradaciones sean correctas.
4. Que no hayas inventado eventos.
5. Que no aparezca ningún orbe.
6. Que no haya tecnicismos astrológicos en las placas.

==================================================
FORMATO DE RESPUESTA
==================================================

Respondé SOLAMENTE con JSON válido.

No uses markdown.

La estructura debe ser exactamente:

{
  "sinopsis": "",
  "general": "",
  "amor": "",
  "trabajo_dinero": "",
  "bienestar": "",
  "consejo": "",
  "caption": ""
}
`;

        // --------------------------------------------------
        // 6. OPENAI
        // --------------------------------------------------

        const response =
            await openai.responses.create({
                model: "gpt-5.4-mini",
                input: prompt,
            });

        // --------------------------------------------------
        // 7. RESPUESTA
        // --------------------------------------------------

        return NextResponse.json({
            ok: true,
            date: argentinaDate,
            sky: generalSky,
            aspects,
            horoscope:
                response.output_text,
        });

    } catch (error: any) {
        console.error(
            "ERROR GENERAL HOROSCOPE:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error?.message ||
                    "Error generando horóscopo general",
            },
            {
                status: 500,
            }
        );
    }
}