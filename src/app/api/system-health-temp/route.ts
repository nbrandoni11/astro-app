import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const clean = value.replace(/^whatsapp:/, "");
  if (clean.length <= 6) return "***";
  return clean.slice(0, 4) + "******" + clean.slice(-3);
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "diag_9Jv7kA4y2mL8pQ6s") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const env = {
    twilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    twilioWhatsappNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
    openai: !!process.env.OPENAI_API_KEY,
    astrologyApi: !!process.env.ASTROLOGY_API_TOKEN,
    cronSecret: !!process.env.CRON_SECRET,
    appUrl: process.env.APP_URL || null,
  };

  const { data: activeUsers, error: activeError } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact" })
    .eq("subscription_status", "active");

  const { data: recentHoroscopes, error: horoscopeError } = await supabaseAdmin
    .from("daily_horoscopes")
    .select("horoscope_date,send_status,sent_at,send_error,created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  let twilio: any = { ok: false, error: "not_checked" };

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  ) {
    try {
      const qs = new URLSearchParams({
        From: process.env.TWILIO_WHATSAPP_NUMBER,
        PageSize: "20",
      });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json?${qs.toString()}`,
        {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
              ).toString("base64"),
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      twilio = response.ok
        ? {
            ok: true,
            count: Array.isArray(data.messages) ? data.messages.length : 0,
            recent: (data.messages || []).slice(0, 10).map((m: any) => ({
              sid: m.sid,
              status: m.status,
              errorCode: m.error_code,
              errorMessage: m.error_message,
              dateCreated: m.date_created,
              dateSent: m.date_sent,
              to: maskPhone(m.to),
            })),
          }
        : {
            ok: false,
            status: response.status,
            error: data?.message || data?.code || "Twilio API error",
          };
    } catch (error: any) {
      twilio = { ok: false, error: error?.message || "Twilio request failed" };
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    env,
    database: {
      activeUsers: activeUsers?.length ?? null,
      activeError: activeError?.message || null,
      recentHoroscopes: recentHoroscopes || [],
      horoscopeError: horoscopeError?.message || null,
    },
    twilio,
  });
}
