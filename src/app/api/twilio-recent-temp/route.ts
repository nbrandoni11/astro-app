import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function mask(value: string | null | undefined) {
  if (!value) return null;
  const clean = value.replace(/^whatsapp:/, "");
  if (clean.length < 8) return "***";
  return clean.slice(0, 5) + "*****" + clean.slice(-3);
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== "twdiag_7pM4xL9q") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!sid || !auth || !from) {
    return NextResponse.json({ ok: false, error: "Twilio env missing" }, { status: 500 });
  }

  const qs = new URLSearchParams({ From: from, PageSize: "30" });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?${qs.toString()}`,
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
    return NextResponse.json({ ok:false, status:response.status, data }, { status:500 });
  }

  return NextResponse.json({
    ok:true,
    messages:(data.messages||[]).slice(0,20).map((m:any)=>({
      sid:m.sid,
      status:m.status,
      errorCode:m.error_code,
      to:mask(m.to),
      from:mask(m.from),
      dateCreated:m.date_created,
      dateSent:m.date_sent,
      price:m.price,
      numSegments:m.num_segments,
    }))
  });
}
