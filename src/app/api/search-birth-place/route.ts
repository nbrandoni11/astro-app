import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
  ARG_ADMIN1_MAP,
  CABA_COORDS,
  BARRIOS_DATA,
  ARGENTINE_PROVINCES,
  COUNTRY_TRANSLATIONS
} from "@/data/birth-place-priority";

// ─────────────────────────────────────────────────────────────────────────────
// Caché en memoria: el JSON de 25MB se carga una sola vez por proceso Node.
// ─────────────────────────────────────────────────────────────────────────────
interface CityRecord {
  name: string;
  country: string;
  admin1: string;
  lat: number;
  lon: number;
  timezone: string;
  tzone: number | null;
  search: string;
}

export interface CityResult {
  name: string;
  country: string;
  admin1: string;
  lat: number;
  lon: number;
  timezone: string;
  tzone: number | null;
  label: string;
  displayLabel?: string;
  resolvedLabel?: string;
  isFallback?: boolean;
  confidence?: number;
  matchReason?: string;
}

let _cities: CityRecord[] | null = null;
let _countries: Set<string> | null = null;

function getCities(): CityRecord[] {
  if (_cities) return _cities;
  const jsonPath = path.join(process.cwd(), "src", "data", "cities.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  _cities = JSON.parse(raw) as CityRecord[];
  return _cities;
}

function getCountries(cities: CityRecord[]): Set<string> {
  if (_countries) return _countries;
  const set = new Set<string>();
  for (const c of cities) {
    set.add(normalize(c.country));
  }
  _countries = set;
  return _countries;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLabel(city: CityRecord): string {
  if (city.country === "Argentina" && city.name === "Buenos Aires" && city.admin1 === "07") {
    return "Ciudad Autónoma de Buenos Aires, Argentina";
  }

  let admin1 = city.admin1;
  if (city.country === "Argentina" && ARG_ADMIN1_MAP[city.admin1]) {
    admin1 = ARG_ADMIN1_MAP[city.admin1];
  }

  // Omitir admin1 si es un código numérico puro (ej. "01", "06")
  const admin1IsCode = /^\d+$/.test(admin1.trim());
  if (admin1IsCode || !admin1) {
    return `${city.name}, ${city.country}`;
  }
  return `${city.name}, ${admin1}, ${city.country}`;
}

function getExplicitCountryFromQuery(query: string, countries: Set<string>): string | null {
  for (const [es, en] of Object.entries(COUNTRY_TRANSLATIONS) as [string, string][]) {
    const escaped = es.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(query)) {
      return en;
    }
  }

  const sortedCountries = Array.from(countries).sort((a, b) => b.length - a.length);
  for (const country of sortedCountries) {
    const escaped = country.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(query)) {
      return country;
    }
  }
  return null;
}

function findReferenceCity(
  cities: CityRecord[],
  originalQ: string,
  normalizedQ: string,
  explicitCountry: string | null
): CityRecord | null {
  // 1. Intentar división por coma
  if (originalQ.includes(",")) {
    const parts = originalQ.split(",");
    const suffix = parts.slice(1).join(",").trim();
    if (suffix.length >= 2) {
      const normSuffix = normalize(suffix);
      const matches = cities.filter(c => normalize(c.name) === normSuffix);
      if (matches.length > 0) {
        const argMatch = matches.find(c => c.country === "Argentina");
        if (argMatch) return argMatch;
        if (explicitCountry) {
          const countryMatch = matches.find(c => normalize(c.country) === explicitCountry);
          if (countryMatch) return countryMatch;
        }
        return matches[0];
      }
    }
  }

  // 2. Intentar ventana deslizante de sufijos
  const words = normalizedQ.split(/\s+/).filter(Boolean);
  for (let len = Math.min(words.length - 1, 4); len >= 1; len--) {
    const suffixQ = words.slice(words.length - len).join(" ");
    
    // Si coincide con una provincia argentina conocida
    if (ARGENTINE_PROVINCES.includes(suffixQ)) {
      if (suffixQ === "buenos aires") {
        const cabaRecord = cities.find(c => c.country === "Argentina" && c.name === "Buenos Aires" && c.admin1 === "07");
        if (cabaRecord) return cabaRecord;
      }
      const match = cities.find(c => c.country === "Argentina" && normalize(c.name) === suffixQ);
      if (match) return match;
    }
    
    // Buscar coincidencia exacta por nombre de ciudad en cities.json
    const matches = cities.filter(c => normalize(c.name) === suffixQ);
    if (matches.length > 0) {
      const argMatch = matches.find(c => c.country === "Argentina");
      if (argMatch) return argMatch;
      if (explicitCountry) {
        const countryMatch = matches.find(c => normalize(c.country) === explicitCountry);
        if (countryMatch) return countryMatch;
      }
      return matches[0];
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const cities = getCities();
    let normalizedQ = normalize(q);

    for (const [es, en] of Object.entries(COUNTRY_TRANSLATIONS) as [string, string][]) {
      const escaped = es.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      if (regex.test(normalizedQ)) {
        normalizedQ = normalizedQ.replace(regex, en);
      }
    }

    const countriesList = getCountries(cities);
    const explicitCountry = getExplicitCountryFromQuery(normalizedQ, countriesList);

    const priorityResults: CityResult[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Matches prioritarios de CABA / Buenos Aires
    // ─────────────────────────────────────────────────────────────────────────
    const cabaAliases = [
      "caba",
      "capital federal",
      "ciudad autonoma de buenos aires",
      "ciudad autonoma buenos aires",
      "buenos aires capital",
      "buenos aires argentina",
      "buenos aires"
    ];

    if (cabaAliases.includes(normalizedQ)) {
      priorityResults.push({
        name: "Ciudad Autónoma de Buenos Aires",
        country: "Argentina",
        admin1: "Ciudad Autónoma de Buenos Aires",
        lat: CABA_COORDS.lat,
        lon: CABA_COORDS.lon,
        timezone: CABA_COORDS.timezone,
        tzone: CABA_COORDS.tzone,
        label: "Ciudad Autónoma de Buenos Aires, Argentina",
        resolvedLabel: "Ciudad Autónoma de Buenos Aires, Argentina",
        displayLabel: "Ciudad Autónoma de Buenos Aires, Argentina",
        isFallback: false,
        confidence: 250000, // Altísima prioridad
        matchReason: "priority_caba"
      });

      priorityResults.push({
        name: "Buenos Aires",
        country: "Argentina",
        admin1: "Provincia de Buenos Aires",
        lat: CABA_COORDS.lat,
        lon: CABA_COORDS.lon,
        timezone: CABA_COORDS.timezone,
        tzone: CABA_COORDS.tzone,
        label: "Buenos Aires, Provincia de Buenos Aires, Argentina",
        resolvedLabel: "Buenos Aires, Provincia de Buenos Aires, Argentina",
        displayLabel: "Buenos Aires, Provincia de Buenos Aires, Argentina",
        isFallback: false,
        confidence: 240000,
        matchReason: "priority_province"
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Matches prioritarios de Barrios de CABA
    // ─────────────────────────────────────────────────────────────────────────
    let matchedBarrioKey: string | null = null;
    for (const key of Object.keys(BARRIOS_DATA)) {
      if (normalizedQ === key || normalizedQ.includes(key)) {
        matchedBarrioKey = key;
        break;
      }
    }

    if (matchedBarrioKey) {
      const barrio = BARRIOS_DATA[matchedBarrioKey];
      priorityResults.push({
        name: barrio.name,
        country: "Argentina",
        admin1: "Ciudad Autónoma de Buenos Aires",
        lat: barrio.lat,
        lon: barrio.lon,
        timezone: CABA_COORDS.timezone,
        tzone: CABA_COORDS.tzone,
        label: `${barrio.name}, Ciudad Autónoma de Buenos Aires, Argentina`,
        resolvedLabel: "Ciudad Autónoma de Buenos Aires, Argentina",
        displayLabel: `${barrio.name}, Ciudad Autónoma de Buenos Aires, Argentina`,
        isFallback: false,
        confidence: 250000,
        matchReason: "priority_barrio"
      });

      priorityResults.push({
        name: "Ciudad Autónoma de Buenos Aires",
        country: "Argentina",
        admin1: "Ciudad Autónoma de Buenos Aires",
        lat: CABA_COORDS.lat,
        lon: CABA_COORDS.lon,
        timezone: CABA_COORDS.timezone,
        tzone: CABA_COORDS.tzone,
        label: "Usar Ciudad Autónoma de Buenos Aires, Argentina como referencia",
        resolvedLabel: "Ciudad Autónoma de Buenos Aires, Argentina",
        displayLabel: "Ciudad Autónoma de Buenos Aires, Argentina",
        isFallback: true,
        confidence: 230000,
        matchReason: "priority_barrio_reference"
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Búsqueda estándar en cities.json
    // ─────────────────────────────────────────────────────────────────────────
    const terms = normalizedQ.split(/\s+/).filter(Boolean);
    const standardResults: CityResult[] = [];
    
    // Indicador general de prioridad de Argentina (a menos que se especifique otro país)
    const hasArgentineIndicator = 
      normalizedQ.includes("argentina") ||
      normalizedQ.includes("buenos aires") ||
      normalizedQ.includes("caba") ||
      normalizedQ.includes("capital federal") ||
      normalizedQ.includes("ciudad autonoma") ||
      ARGENTINE_PROVINCES.some((p: string) => normalizedQ.includes(p));

    for (const city of cities) {
      const matches = terms.every((term) => city.search.includes(term));
      if (matches) {
        const cityLabel = buildLabel(city);
        const normCityName = normalize(city.name);

        let score = 0;

        // Boost por coincidencia de nombre
        if (normCityName === normalizedQ) {
          score += 10000;
        } else if (normCityName.startsWith(normalizedQ)) {
          score += 5000;
        }

        // Boost por país explícito vs prioridad de Argentina
        if (explicitCountry) {
          if (normalize(city.country) === explicitCountry) {
            score += 200000;
          }
        } else {
          if (hasArgentineIndicator && city.country === "Argentina") {
            score += 100000;
          } else if (city.country === "Argentina") {
            score += 500;
          }
        }

        standardResults.push({
          name: city.name,
          country: city.country,
          admin1: city.admin1,
          lat: city.lat,
          lon: city.lon,
          timezone: city.timezone,
          tzone: city.tzone,
          label: cityLabel,
          resolvedLabel: cityLabel,
          displayLabel: cityLabel,
          isFallback: false,
          confidence: score,
          matchReason: "exact_match"
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Fallback si el usuario ingresa barrio/zona + ciudad/provincia
    // ─────────────────────────────────────────────────────────────────────────
    const fallbackResults: CityResult[] = [];
    const refCity = findReferenceCity(cities, q, normalizedQ, explicitCountry);
    if (refCity) {
      const refLabel = buildLabel(refCity);
      
      let fallbackScore = 90000;
      let refScore = 85000;

      // Si hay un país explícito y el fallback coincide con ese país, boost
      if (explicitCountry) {
        if (normalize(refCity.country) === explicitCountry) {
          fallbackScore += 200000;
          refScore += 200000;
        }
      } else {
        if (hasArgentineIndicator && refCity.country === "Argentina") {
          fallbackScore += 100000;
          refScore += 100000;
        }
      }

      fallbackResults.push({
        name: refCity.name,
        country: refCity.country,
        admin1: refCity.admin1,
        lat: refCity.lat,
        lon: refCity.lon,
        timezone: refCity.timezone,
        tzone: refCity.tzone,
        label: `${q} — usaremos ${refLabel} como referencia`,
        resolvedLabel: refLabel,
        displayLabel: q,
        isFallback: true,
        confidence: fallbackScore,
        matchReason: "fallback_city_or_province"
      });

      fallbackResults.push({
        name: refCity.name,
        country: refCity.country,
        admin1: refCity.admin1,
        lat: refCity.lat,
        lon: refCity.lon,
        timezone: refCity.timezone,
        tzone: refCity.tzone,
        label: refLabel,
        resolvedLabel: refLabel,
        displayLabel: refLabel,
        isFallback: false,
        confidence: refScore,
        matchReason: "exact_match"
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Combina, deduplica y ordena por score de confianza
    // ─────────────────────────────────────────────────────────────────────────
    const combined = [...priorityResults, ...standardResults, ...fallbackResults];
    const uniqueMap = new Map<string, CityResult>();

    for (const city of combined) {
      const key = `${city.label}|${city.resolvedLabel}|${city.isFallback}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, city);
      } else {
        const existing = uniqueMap.get(key)!;
        if ((city.confidence || 0) > (existing.confidence || 0)) {
          uniqueMap.set(key, city);
        }
      }
    }

    const deduplicated = Array.from(uniqueMap.values());
    deduplicated.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Retorna entre 1 y 8 resultados ordenados por score
    const finalResults = deduplicated.slice(0, 8);

    return NextResponse.json({ ok: true, results: finalResults });
  } catch (err: any) {
    console.error("[search-birth-place] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
