import { NextResponse } from "next/server";
import { generateNatalChart } from "@/lib/generate-natal-chart";

export async function POST(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

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