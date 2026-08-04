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

    if (!full_name || !email || !phone_whatsapp) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan campos obligatorios: full_name, email, phone_whatsapp",
        },
        { status: 400 }
      );
    }

    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json(
        {
          ok: false,
          error: authError.message,
        },
        { status: 500 }
      );
    }

    // Crear usuario en la tabla public.users
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          auth_user_id: authUser.user.id,
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
      // Si falla la inserción eliminamos el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: data.auth_user_id,
      email: data.email,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Error inesperado",
      },
      { status: 500 }
    );
  }
}