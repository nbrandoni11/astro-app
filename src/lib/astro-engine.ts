async function parseApiResponse(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      status: false,
      msg: "La API devolvió una respuesta que no es JSON",
      httpStatus: res.status,
      preview: text.slice(0, 500),
    };
  }
}

export async function getNatalChart(data: any) {
  const res = await fetch("https://json.astrologyapi.com/v1/western_chart_data", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-astrologyapi-key": process.env.ASTROLOGY_API_TOKEN!,
    },
    body: new URLSearchParams({
      day: String(data.day),
      month: String(data.month),
      year: String(data.year),
      hour: String(data.hour),
      min: String(data.min),
      lat: String(data.lat),
      lon: String(data.lon),
      tzone: String(data.tzone),
      house_type: "placidus",
    }),
  });

  return parseApiResponse(res);
}

export async function getDailyTransits(data: any) {
  const res = await fetch("https://json.astrologyapi.com/v1/natal_transits/daily", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-astrologyapi-key": process.env.ASTROLOGY_API_TOKEN!,
    },
    body: new URLSearchParams({
      day: String(data.day),
      month: String(data.month),
      year: String(data.year),
      hour: String(data.hour),
      min: String(data.min),
      lat: String(data.lat),
      lon: String(data.lon),
      tzone: String(data.tzone),
      transit_day: String(data.transit_day),
      transit_month: String(data.transit_month),
      transit_year: String(data.transit_year),
    }),
  });

  return parseApiResponse(res);
}