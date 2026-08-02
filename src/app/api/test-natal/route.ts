import { NextResponse } from "next/server";
import { generateNatalChart } from "@/lib/generate-natal-chart";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await generateNatalChart({
      day: Number(body.day),
      month: Number(body.month),
      year: Number(body.year),
      hour: Number(body.hour),
      min: Number(body.min),
      lat: Number(body.lat),
      lon: Number(body.lon),
      tzone: Number(body.tzone),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("ERROR TEST-NATAL:", error);

    return NextResponse.json(
      {
        error: "Error generando carta natal",
        details: error instanceof Error ? error.message : "Desconocido",
      },
      { status: 500 }
    );
  }
}