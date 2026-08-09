import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host");

    const isLocal =
        host?.includes("localhost") || host?.includes("127.0.0.1");

    const protocol = isLocal ? "http" : forwardedProto || "https";
    const domain = forwardedHost || host;

    const origin = domain
        ? `${protocol}://${domain}`
        : new URL(request.url).origin;

    console.log("=== AUTH CALLBACK START ===");
    console.log("Token hash exists:", !!tokenHash);
    console.log("Type:", type);
    console.log("Origin:", origin);

    if (!tokenHash || !type) {
        console.error("AUTH CALLBACK: Missing token_hash or type");

        return NextResponse.redirect(
            `${origin}/login?error=missing_token`
        );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(cookiesToSet) {
                    console.log(
                        "AUTH CALLBACK: Setting cookies:",
                        cookiesToSet.map((cookie) => cookie.name)
                    );

                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
    });

    console.log("=== VERIFY OTP RESULT ===");
    console.log("Session exists:", !!data?.session);
    console.log("User exists:", !!data?.user);

    if (error) {
        console.error("AUTH CALLBACK VERIFY ERROR:", error);
        console.error("Message:", error.message);
        console.error("Status:", error.status);
        console.error("Code:", error.code);

        return NextResponse.redirect(
            `${origin}/login?error=verification_failed`
        );
    }

    if (!data?.session) {
        console.error(
            "AUTH CALLBACK: Verification succeeded but no session returned"
        );

        return NextResponse.redirect(
            `${origin}/login?error=no_session`
        );
    }

    console.log(
        "AUTH CALLBACK SUCCESS. User:",
        data.user?.id
    );

    return NextResponse.redirect(`${origin}/panel`);
}