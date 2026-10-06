import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNatalChart, getDailyTransits } from "@/lib/astro-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "gencheck_4Qm9sL2vX7pR") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const { data: users, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("subscription_status", "active")
      .limit(10);

    if (userError) throw new Error(userError.message);

    const user = (users || []).find(
      (u: any) =>
        u.birth_day &&
        u.birth_month &&
        u.birth_year &&
        u.birth_hour !== null &&
        u.birth_min !== null &&
        u.birth_lat !== null &&
        u.birth_lon !== null &&
        u.birth_tzone !== null
    );

    if (!user) {
      return NextResponse.json({
        ok: false,
        error: "No active user with complete birth data",
      });
    }

    const targetDate = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: user.timezone || "America/Argentina/Buenos_Aires",
      })
    );
    targetDate.setDate(targetDate.getDate() + 1);

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

    const transits = await getDailyTransits({
      day: user.birth_day,
      month: user.birth_month,
      year: user.birth_year,
      hour: user.birth_hour,
      min: user.birth_min,
      lat: user.birth_lat,
      lon: user.birth_lon,
      tzone: user.birth_tzone,
      transit_day: targetDate.getDate(),
      transit_month: targetDate.getMonth() + 1,
      transit_year: targetDate.getFullYear(),
    });

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Respondé únicamente con JSON válido: {"ok":true}.',
            },
            {
              role: "user",
              content: "Health check.",
            },
          ],
        }),
      }
    );

    const openaiBody = await openaiResponse.json().catch(() => null);

    return NextResponse.json({
      ok:
        !!natal &&
        natal.status !== false &&
        !!transits &&
        transits.status !== false &&
        openaiResponse.ok,
      targetDate: `${targetDate.getFullYear()}-${String(
        targetDate.getMonth() + 1
      ).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`,
      natalOk: !!natal && natal.status !== false,
      transitsOk: !!transits && transits.status !== false,
      openaiOk: openaiResponse.ok,
      openaiStatus: openaiResponse.status,
      openaiResponsePresent: !!openaiBody?.choices?.[0]?.message?.content,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Generation health failed",
      },
      { status: 500 }
    );
  }
}
