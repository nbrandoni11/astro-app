import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

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
    console.log("Callback URL:", request.url);
    console.log("Code exists:", !!code);
    console.log("Origin:", origin);

    if (!code) {
        console.error("AUTH CALLBACK: No code received");

        return NextResponse.redirect(
            `${origin}/login?error=missing_code`
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

    const { data, error } =
        await supabase.auth.exchangeCodeForSession(code);

    console.log("=== EXCHANGE CODE RESULT ===");
    console.log("Session exists:", !!data?.session);
    console.log("User exists:", !!data?.user);

    if (error) {
        console.error("AUTH CALLBACK EXCHANGE ERROR:", error);
        console.error("Message:", error.message);
        console.error("Status:", error.status);
        console.error("Code:", error.code);

        return NextResponse.redirect(
            `${origin}/login?error=callback_exchange_failed`
        );
    }

    if (!data?.session) {
        console.error(
            "AUTH CALLBACK: Exchange succeeded but no session returned"
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