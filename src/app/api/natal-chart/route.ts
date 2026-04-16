import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        ok: true,
        route: "/api/natal-chart",
        message: "Endpoint activo",
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        console.log("BODY RECIBIDO:", body);
        console.log("TOKEN EXISTS:", !!process.env.ASTROLOGY_API_TOKEN);

        const astroResponse = await fetch(
            "https://json.astrologyapi.com/v1/western_chart_data",
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
                    house_type: "placidus",
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
        console.error("ERROR NATAL-CHART:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "Error en natal chart",
            },
            { status: 500 }
        );
    }
}