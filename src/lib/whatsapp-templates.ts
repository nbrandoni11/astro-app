export const DAILY_HOROSCOPE_1_CONTENT_SID =
    "HX55f7e09dc29550b27f2a1367613aa740";

export const DAILY_HOROSCOPE_2_CONTENT_SID =
    "HXad45529849240cc53204c15ffbcb4703";

export async function sendTwilioTemplate(
    to: string,
    contentSid: string,
    variables: Record<string, string>,
    statusCallback: string
) {
    return fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
            method: "POST",
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
                    ).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                From: process.env.TWILIO_WHATSAPP_NUMBER!,
                To: `whatsapp:${to}`,
                ContentSid: contentSid,
                ContentVariables: JSON.stringify(variables),
                ...(statusCallback ? { StatusCallback: statusCallback } : {}),
            }),
        }
    );
}

