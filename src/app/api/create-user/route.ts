import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function normalizePhone(value: string | null | undefined) {
  return String(value || "").replace(/\\D/g, "");
}

async function findActivePhoneConflict(phone: string, excludeProfileId?: string | null) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  let query = supabaseAdmin
    .from("users")
    .select("id,phone_whatsapp")
    .eq("subscription_status", "active");

  if (excludeProfileId) query = query.neq("id", excludeProfileId);

  const { data, error } = await query;
  if (error) throw new Error("Error verificando el WhatsApp");

  return data?.find((profile) => normalizePhone(profile.phone_whatsapp) === normalizedPhone) ?? null;
}

async function resolveAuthUser(
  normalizedEmail: string,
  preferredAuthUserId?: string | null
) {
  if (preferredAuthUserId) {
    const { data, error } =
      await supabaseAdmin.auth.admin.getUserById(preferredAuthUserId);

    if (!error && data.user?.email?.trim().toLowerCase() === normalizedEmail) {
      return {
        authUserId: data.user.id,
        created: false,
      };
    }
  }

  const {
    data: { users: authUsers },
    error: listUsersError,
  } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listUsersError) {
    throw new Error(
      `Error verificando la cuenta: ${listUsersError.message}`
    );
  }

  const existingAuthUser = authUsers.find(
    (user) => user.email?.trim().toLowerCase() === normalizedEmail
  );

  if (existingAuthUser) {
    return {
      authUserId: existingAuthUser.id,
      created: false,
    };
  }

  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    throw new Error(authError?.message || "Error creando la cuenta");
  }

  return {
    authUserId: authUser.user.id,
    created: true,
  };
}

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

    // There can be legacy/test duplicate profiles. Prefer an active profile,
    // otherwise use the newest one, instead of failing with maybeSingle().
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, email, subscription_status, created_at")
      .ilike("email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error(
        "[create-user] Error buscando usuario existente:",
        profilesError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Error buscando el usuario existente",
        },
        { status: 500 }
      );
    }

    const existingProfile =
      profiles?.find((profile) => profile.subscription_status === "active") ??
      profiles?.[0] ??
      null;

    const activePhoneConflict = await findActivePhoneConflict(
      String(phone_whatsapp),
      existingProfile?.id ?? null
    );

    if (activePhoneConflict) {
      return NextResponse.json(
        {
          ok: false,
          whatsappAlreadyActive: true,
          error: "Este WhatsApp ya está vinculado a una suscripción activa.",
        },
        { status: 409 }
      );
    }

    if (existingProfile) {
      let resolved;

      try {
        resolved = await resolveAuthUser(
          normalizedEmail,
          existingProfile.auth_user_id
        );
      } catch (error: any) {
        console.error("[create-user] Error reparando Auth:", error);

        return NextResponse.json(
          {
            ok: false,
            error: error?.message || "Error verificando la cuenta",
          },
          { status: 500 }
        );
      }

      if (resolved.authUserId !== existingProfile.auth_user_id) {
        const { error: relinkError } = await supabaseAdmin
          .from("users")
          .update({ auth_user_id: resolved.authUserId })
          .eq("id", existingProfile.id);

        if (relinkError) {
          if (resolved.created) {
            await supabaseAdmin.auth.admin.deleteUser(resolved.authUserId);
          }

          console.error(
            "[create-user] Error reparando auth_user_id:",
            relinkError
          );

          return NextResponse.json(
            {
              ok: false,
              error: "Error vinculando la cuenta",
            },
            { status: 500 }
          );
        }
      }

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

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          auth_user_id: resolved.authUserId,
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

    let resolved;

    try {
      resolved = await resolveAuthUser(normalizedEmail);
    } catch (error: any) {
      console.error("[create-user] Error creando/verificando Auth:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error?.message || "Error creando la cuenta",
        },
        { status: 500 }
      );
    }

    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          auth_user_id: resolved.authUserId,
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

      if (resolved.created) {
        await supabaseAdmin.auth.admin.deleteUser(resolved.authUserId);
      }

      return NextResponse.json(
        {
          ok: false,
          error: insertError?.message || "Error creando el usuario",
        },
        { status: 500 }
      );
    }

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
