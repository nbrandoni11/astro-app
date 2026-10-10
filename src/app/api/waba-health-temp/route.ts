import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function maskSender(value: string | null | undefined) {
  if (!value) return null;
  const phone = value.replace(/^whatsapp:/, "");
  if (phone.length <= 7) return "***";
  return phone.slice(0, 4) + "******" + phone.slice(-3);
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "waba_mv1tioh3") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = process.env.TWILIO_AUTH_TOKEN;

    if (!sid || !auth) {
      return NextResponse.json(
        { ok: false, error: "Twilio credentials missing" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=50",
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${auth}`).toString("base64"),
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, status: response.status, error: data },
        { status: 502 }
      );
    }

    const senders = (data.senders || []).map((s: any) => ({
      sid: s.sid || null,
      senderId: maskSender(s.sender_id || s.senderId),
      friendlyName: s.friendly_name || s.friendlyName || null,
      status: s.status || null,
      wabaId:
        s.configuration?.waba_id ||
        s.configuration?.wabaId ||
        s.waba_id ||
        s.wabaId ||
        null,
    }));

    return NextResponse.json({ ok: true, senders });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Twilio sender lookup failed" },
      { status: 500 }
    );
  }
}
