import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function validateTwilioSignature(
  req: Request,
  formEntries: Array<[string, string]>
) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const receivedSignature = req.headers.get("x-twilio-signature");

  if (!authToken || !receivedSignature) {
    return false;
  }

  const incomingUrl = new URL(req.url);
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    incomingUrl.origin;

  const callbackUrl =
    `${baseUrl.replace(/\/$/, "")}${incomingUrl.pathname}${incomingUrl.search}`;

  const sorted = [...formEntries].sort(([a], [b]) => a.localeCompare(b));
  let payload = callbackUrl;

  for (const [key, value] of sorted) {
    payload += key + value;
  }

  const expected = createHmac("sha1", authToken)
    .update(payload)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(receivedSignature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isDelivered(status: string | null) {
  return status === "delivered" || status === "read";
}

function isFailed(status: string | null) {
  return status === "failed" || status === "undelivered";
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const horoscopeId = url.searchParams.get("horoscopeId");
    const part = url.searchParams.get("part");

    if (!horoscopeId || (part !== "1" && part !== "2")) {
      return NextResponse.json(
        { ok: false, error: "Invalid callback target" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const entries = Array.from(formData.entries()).map(
      ([key, value]) => [key, String(value)] as [string, string]
    );

    if (!validateTwilioSignature(req, entries)) {
      return NextResponse.json(
        { ok: false, error: "Invalid Twilio signature" },
        { status: 401 }
      );
    }

    const status = String(formData.get("MessageStatus") || "").toLowerCase();
    const sid = String(
      formData.get("MessageSid") || formData.get("SmsSid") || ""
    );
    const errorCode = formData.get("ErrorCode")
      ? String(formData.get("ErrorCode"))
      : null;
    const errorMessage = formData.get("ErrorMessage")
      ? String(formData.get("ErrorMessage"))
      : null;

    if (!status || !sid) {
      return NextResponse.json(
        { ok: false, error: "Missing Twilio status data" },
        { status: 400 }
      );
    }

    const update =
      part === "1"
        ? {
            twilio_message_sid_1: sid,
            twilio_status_1: status,
          }
        : {
            twilio_message_sid_2: sid,
            twilio_status_2: status,
          };

    const { error: updateError } = await supabaseAdmin
      .from("daily_horoscopes")
      .update(update)
      .eq("id", horoscopeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { data: horoscope, error: selectError } = await supabaseAdmin
      .from("daily_horoscopes")
      .select("twilio_status_1,twilio_status_2")
      .eq("id", horoscopeId)
      .single();

    if (selectError || !horoscope) {
      throw new Error(selectError?.message || "Horoscope not found");
    }

    const status1 = horoscope.twilio_status_1;
    const status2 = horoscope.twilio_status_2;

    if (isFailed(status)) {
      await supabaseAdmin
        .from("daily_horoscopes")
        .update({
          send_status: "error",
          send_error: [
            `WhatsApp mensaje ${part}: ${status}`,
            errorCode ? `código ${errorCode}` : null,
            errorMessage || null,
          ]
            .filter(Boolean)
            .join(" · "),
        })
        .eq("id", horoscopeId);
    } else if (isDelivered(status1) && isDelivered(status2)) {
      await supabaseAdmin
        .from("daily_horoscopes")
        .update({
          send_status: "delivered",
          sent_at: new Date().toISOString(),
          send_error: null,
        })
        .eq("id", horoscopeId);
    } else {
      await supabaseAdmin
        .from("daily_horoscopes")
        .update({
          send_status: "submitted",
          send_error: null,
        })
        .eq("id", horoscopeId)
        .neq("send_status", "error");
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[twilio-status]", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Status callback error" },
      { status: 500 }
    );
  }
}
