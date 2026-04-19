export async function getNatalChart(data: any) {
  const res = await fetch("https://json.astrologyapi.com/v1/western_chart_data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ASTROLOGY_API_KEY}`,
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function getDailyTransits(data: any) {
  const res = await fetch("https://json.astrologyapi.com/v1/transit_planet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ASTROLOGY_API_KEY}`,
    },
    body: JSON.stringify(data),
  });

  return res.json();
}