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

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Buscar primero si ya existe en public.users
    const { data: existingProfile, error: existingProfileError } =
      await supabaseAdmin
        .from("users")
        .select("id, auth_user_id, email, subscription_status")
        .eq("email", normalizedEmail)
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        "[create-user] Error buscando usuario existente:",
        existingProfileError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Error buscando el usuario existente",
        },
        { status: 500 }
      );
    }

    // 2. Si ya existe en public.users, reutilizarlo
    if (existingProfile) {
      if (!existingProfile.auth_user_id) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "La cuenta existe pero no está correctamente vinculada. Contactá a soporte.",
          },
          { status: 500 }
        );
      }

      // Si ya está activo, no crear ni modificar la cuenta
      if (existingProfile.subscription_status === "active") {
        return NextResponse.json(
          {
            ok: false,
            alreadyActive: true,
            error:
              "Este email ya tiene una suscripción activa. Ingresá a tu cuenta.",
          },
          { status: 409 }
        );
      }

      // Si existe pero no pagó, actualizar sus datos y permitir continuar
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          full_name,
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
        })
        .eq("id", existingProfile.id)
        .select("auth_user_id, email")
        .single();

      if (updateError || !updatedProfile) {
        console.error(
          "[create-user] Error actualizando usuario existente:",
          updateError
        );

        return NextResponse.json(
          {
            ok: false,
            error: "Error actualizando los datos del usuario",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        userId: updatedProfile.auth_user_id,
        email: updatedProfile.email,
        reused: true,
      });
    }

    // 3. No existe en public.users.
    // Buscar si existe en Supabase Auth por un registro anterior incompleto.
    const {
      data: { users: authUsers },
      error: listUsersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listUsersError) {
      console.error(
        "[create-user] Error buscando usuario en Auth:",
        listUsersError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Error verificando la cuenta",
        },
        { status: 500 }
      );
    }

    const existingAuthUser = authUsers.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail
    );

    let authUserId: string;
    let authUserWasCreated = false;

    if (existingAuthUser) {
      // Reutilizar Auth User existente
      authUserId = existingAuthUser.id;
    } else {
      // 4. Crear un Auth User solamente si realmente no existe
      const { data: authUser, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
        });

      if (authError || !authUser.user) {
        console.error("[create-user] Error creando usuario Auth:", authError);

        return NextResponse.json(
          {
            ok: false,
            error: authError?.message || "Error creando la cuenta",
          },
          { status: 500 }
        );
      }

      authUserId = authUser.user.id;
      authUserWasCreated = true;
    }

    // 5. Crear public.users vinculado al Auth User correcto
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          auth_user_id: authUserId,
          full_name,
          email: normalizedEmail,
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
      .select("auth_user_id, email")
      .single();

    if (insertError || !newProfile) {
      console.error(
        "[create-user] Error creando public.users:",
        insertError
      );

      // Solo eliminar Auth si fue creado en esta misma request.
      // Si ya existía, no debemos borrarlo.
      if (authUserWasCreated) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }

      return NextResponse.json(
        {
          ok: false,
          error: insertError?.message || "Error creando el usuario",
        },
        { status: 500 }
      );
    }

    // Este es el mismo ID que viaja luego a Mercado Pago
    return NextResponse.json({
      ok: true,
      userId: newProfile.auth_user_id,
      email: newProfile.email,
      reused: false,
    });
  } catch (err: any) {
    console.error("[create-user] Error inesperado:", err);
    console.error(err?.stack);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Error inesperado",
      },
      { status: 500 }
    );
  }
}