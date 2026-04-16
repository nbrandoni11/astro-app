import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        ok: true,
        route: "/api/daily-transits",
        message: "Endpoint activo",
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        console.log("BODY RECIBIDO:", body);
        console.log("TOKEN EXISTS:", !!process.env.ASTROLOGY_API_TOKEN);

        const astroResponse = await fetch(
            "https://json.astrologyapi.com/v1/natal_transits/daily",
            {
                method: "POST",
                headers: {
                    "x-astrologyapi-key": process.env.ASTROLOGY_API_TOKEN!,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    day: String(body.day),
                    month: String(body.month),
                    year: String(body.year),
                    hour: String(body.hour),
                    min: String(body.min),
                    lat: String(body.lat),
                    lon: String(body.lon),
                    tzone: String(body.tzone),
                    transit_day: String(body.transit_day),
                    transit_month: String(body.transit_month),
                    transit_year: String(body.transit_year),
                }),
            }
        );

        const data = await astroResponse.json();

        return NextResponse.json({
            ok: astroResponse.ok,
            status: astroResponse.status,
            data,
        });
    } catch (error) {
        console.error("ERROR DAILY-TRANSITS:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "Error en daily transits",
            },
            { status: 500 }
        );
    }
}