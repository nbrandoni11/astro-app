import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { day, month, year, hour, min, lat, lon, tzone } = body;

    const token = process.env.ASTROLOGY_API_TOKEN;

    // 🔍 DEBUG
    console.log("TOKEN EXISTS:", !!token);
    console.log("TOKEN START:", token?.slice(0, 10));

    if (!token || !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Faltan variables de entorno en .env.local" },
        { status: 500 }
      );
    }

    // 🔴 INTENTO con Bearer (lo estamos testeando)
    const astroRes = await fetch(
      "https://json.astrologyapi.com/v1/western_chart_data",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          day,
          month,
          year,
          hour,
          min,
          lat,
          lon,
          tzone,
        }),
      }
    );

    const astroData = await astroRes.json();

    if (!astroRes.ok) {
      console.log("ASTRO ERROR:", astroData);

      return NextResponse.json(
        {
          error: "Error en AstrologyAPI",
          details: astroData,
        },
        { status: 500 }
      );
    }

    // 🔹 IA
    const response = await openai.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content:
            "Sos un astrólogo profesional. Interpretás cartas natales en español de forma clara, precisa, sobria y sin frases genéricas.",
        },
        {
          role: "user",
          content: `
Interpretá esta carta natal.

Quiero:
- personalidad
- emociones
- vínculos
- tensiones
- fortalezas

Máximo 200 palabras.

Datos:
${JSON.stringify(astroData)}
          `,
        },
      ],
    });

    return NextResponse.json({
      astroData,
      interpretation: response.output_text,
    });
  } catch (error) {
    console.error("ERROR GENERAL:", error);

    return NextResponse.json(
      {
        error: "Error interno",
        details: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}