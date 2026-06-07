import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      full_name,
      email,
      phone_whatsapp,
      birth_day,
      birth_month,
      birth_year,
      birth_hour,
      birth_min,
      birth_lat,
      birth_lon,
      birth_tzone,
      timezone,
      birth_place_input,
      birth_place_resolved,
    } = body;

    // Validación de campos obligatorios
    if (!full_name || !email || !phone_whatsapp) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos obligatorios: full_name, email, phone_whatsapp" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          full_name,
          email,
          phone_whatsapp,
          birth_day,
          birth_month,
          birth_year,
          birth_hour,
          birth_min,
          birth_lat,
          birth_lon,
          birth_tzone,
          timezone,
          birth_place_input: birth_place_input ?? null,
          birth_place_resolved: birth_place_resolved ?? null,
          subscription_status: "inactive",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[create-user] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: error.message || "Error insertando usuario" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.id,
      email: data.email,
    });
  } catch (err: any) {
    console.error("[create-user] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
