import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

async function ensureProfileIsLinked(authUser: {
  id: string;
  email?: string | null;
}) {
  const email = authUser.email?.trim().toLowerCase();

  if (!email) {
    return;
  }

  const { data: linkedProfile, error: linkedProfileError } =
    await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

  if (linkedProfileError) {
    console.error("AUTH CALLBACK: error checking linked profile", {
      message: linkedProfileError.message,
    });
    return;
  }

  if (linkedProfile) {
    return;
  }

  // Some legacy/test profiles can point to Auth users that no longer exist.
  // Recover the best matching profile by email, preferring an active one.
  const { data: candidates, error: candidateError } = await supabaseAdmin
    .from("users")
    .select("id, subscription_status, created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false });

  if (candidateError) {
    console.error("AUTH CALLBACK: error finding profile by email", {
      message: candidateError.message,
    });
    return;
  }

  if (!candidates || candidates.length === 0) {
    return;
  }

  const profile =
    candidates.find((candidate) => candidate.subscription_status === "active") ??
    candidates[0];

  const { error: repairError } = await supabaseAdmin
    .from("users")
    .update({ auth_user_id: authUser.id })
    .eq("id", profile.id);

  if (repairError) {
    console.error("AUTH CALLBACK: error repairing auth_user_id", {
      message: repairError.message,
    });
  }
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  const response = NextResponse.redirect(`${origin}/panel`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let error = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    error = result.error;
  } else {
    console.error("AUTH CALLBACK: no supported auth parameters", {
      hasCode: !!code,
      hasTokenHash: !!tokenHash,
      type,
    });

    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  if (error) {
    console.error("AUTH CALLBACK ERROR:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    return NextResponse.redirect(
      `${origin}/login?error=verification_failed`
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("AUTH CALLBACK: session was not persisted", {
      message: userError?.message,
    });

    return NextResponse.redirect(`${origin}/login?error=no_session`);
  }

  await ensureProfileIsLinked(user);

  return response;
}
