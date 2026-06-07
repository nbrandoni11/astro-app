/**
 * build-cities.ts
 * Convierte src/data/cities.csv → src/data/cities.json
 * Uso: tsx scripts/build-cities.ts
 */

import fs from "fs";
import path from "path";
import readline from "readline";

// ─────────────────────────────────────────────
// Mapa de offsets UTC por timezone IANA (sin DST)
// Cubre los timezones más comunes del mundo hispanohablante y globales.
// Para DST se usa el offset estándar (sin horario de verano).
// ─────────────────────────────────────────────
const TIMEZONE_OFFSETS: Record<string, number> = {
  // América — Argentina
  "America/Argentina/Buenos_Aires": -3,
  "America/Argentina/Cordoba": -3,
  "America/Argentina/Salta": -3,
  "America/Argentina/Jujuy": -3,
  "America/Argentina/Tucuman": -3,
  "America/Argentina/Catamarca": -3,
  "America/Argentina/La_Rioja": -3,
  "America/Argentina/San_Juan": -3,
  "America/Argentina/Mendoza": -3,
  "America/Argentina/San_Luis": -3,
  "America/Argentina/Rio_Gallegos": -3,
  "America/Argentina/Ushuaia": -3,
  // América — resto
  "America/Sao_Paulo": -3,
  "America/Fortaleza": -3,
  "America/Recife": -3,
  "America/Belem": -3,
  "America/Maceio": -3,
  "America/Bahia": -3,
  "America/Noronha": -2,
  "America/Manaus": -4,
  "America/Cuiaba": -4,
  "America/Porto_Velho": -4,
  "America/Boa_Vista": -4,
  "America/Rio_Branco": -5,
  "America/Eirunepe": -5,
  "America/Santiago": -4,
  "America/Punta_Arenas": -3,
  "America/Lima": -5,
  "America/Bogota": -5,
  "America/Guayaquil": -5,
  "America/Caracas": -4,
  "America/La_Paz": -4,
  "America/Asuncion": -4,
  "America/Montevideo": -3,
  "America/Paramaribo": -3,
  "America/Cayenne": -3,
  "America/Guyana": -4,
  "America/Barbados": -4,
  "America/Port_of_Spain": -4,
  "America/Santo_Domingo": -4,
  "America/Puerto_Rico": -4,
  "America/Halifax": -4,
  "America/Glace_Bay": -4,
  "America/Moncton": -4,
  "America/Goose_Bay": -4,
  "America/St_Johns": -3.5,
  "America/New_York": -5,
  "America/Detroit": -5,
  "America/Kentucky/Louisville": -5,
  "America/Indiana/Indianapolis": -5,
  "America/Chicago": -6,
  "America/Indiana/Knox": -6,
  "America/Menominee": -6,
  "America/North_Dakota/Center": -6,
  "America/Denver": -7,
  "America/Boise": -7,
  "America/Phoenix": -7,
  "America/Los_Angeles": -8,
  "America/Anchorage": -9,
  "America/Juneau": -9,
  "America/Nome": -9,
  "America/Adak": -10,
  "Pacific/Honolulu": -10,
  "America/Mexico_City": -6,
  "America/Cancun": -5,
  "America/Monterrey": -6,
  "America/Merida": -6,
  "America/Mazatlan": -7,
  "America/Hermosillo": -7,
  "America/Tijuana": -8,
  "America/Panama": -5,
  "America/Costa_Rica": -6,
  "America/Tegucigalpa": -6,
  "America/Managua": -6,
  "America/Guatemala": -6,
  "America/El_Salvador": -6,
  "America/Havana": -5,
  "America/Jamaica": -5,
  "America/Nassau": -5,
  "America/Port-au-Prince": -5,
  "America/Curacao": -4,
  "America/Aruba": -4,
  "America/Martinique": -4,
  "America/Guadeloupe": -4,
  "America/Belize": -6,
  // Europa
  "Europe/London": 0,
  "Europe/Lisbon": 0,
  "Europe/Dublin": 0,
  "Europe/Reykjavik": 0,
  "Europe/Paris": 1,
  "Europe/Madrid": 1,
  "Europe/Berlin": 1,
  "Europe/Rome": 1,
  "Europe/Amsterdam": 1,
  "Europe/Brussels": 1,
  "Europe/Vienna": 1,
  "Europe/Warsaw": 1,
  "Europe/Prague": 1,
  "Europe/Budapest": 1,
  "Europe/Stockholm": 1,
  "Europe/Oslo": 1,
  "Europe/Copenhagen": 1,
  "Europe/Zurich": 1,
  "Europe/Luxembourg": 1,
  "Europe/Monaco": 1,
  "Europe/Andorra": 1,
  "Europe/Malta": 1,
  "Europe/Zagreb": 1,
  "Europe/Ljubljana": 1,
  "Europe/Belgrade": 1,
  "Europe/Sarajevo": 1,
  "Europe/Skopje": 1,
  "Europe/Podgorica": 1,
  "Europe/Tirane": 1,
  "Europe/Athens": 2,
  "Europe/Bucharest": 2,
  "Europe/Helsinki": 2,
  "Europe/Riga": 2,
  "Europe/Tallinn": 2,
  "Europe/Vilnius": 2,
  "Europe/Sofia": 2,
  "Europe/Nicosia": 2,
  "Europe/Kaliningrad": 2,
  "Europe/Kiev": 2,
  "Europe/Chisinau": 2,
  "Europe/Minsk": 3,
  "Europe/Moscow": 3,
  "Europe/Istanbul": 3,
  "Europe/Samara": 4,
  "Europe/Volgograd": 3,
  "Europe/Ulyanovsk": 4,
  "Europe/Simferopol": 3,
  // África
  "Africa/Abidjan": 0,
  "Africa/Accra": 0,
  "Africa/Dakar": 0,
  "Africa/Monrovia": 0,
  "Africa/Freetown": 0,
  "Africa/Bamako": 0,
  "Africa/Conakry": 0,
  "Africa/Banjul": 0,
  "Africa/Bissau": 0,
  "Africa/Nouakchott": 0,
  "Africa/Ouagadougou": 0,
  "Africa/Timbuktu": 0,
  "Africa/Lome": 0,
  "Africa/Sao_Tome": 0,
  "Africa/Lagos": 1,
  "Africa/Ndjamena": 1,
  "Africa/Niamey": 1,
  "Africa/Bangui": 1,
  "Africa/Malabo": 1,
  "Africa/Douala": 1,
  "Africa/Libreville": 1,
  "Africa/Brazzaville": 1,
  "Africa/Kinshasa": 1,
  "Africa/Tunis": 1,
  "Africa/Algiers": 1,
  "Africa/Casablanca": 1,
  "Africa/El_Aaiun": 1,
  "Africa/Tripoli": 2,
  "Africa/Cairo": 2,
  "Africa/Khartoum": 3,
  "Africa/Addis_Ababa": 3,
  "Africa/Djibouti": 3,
  "Africa/Asmara": 3,
  "Africa/Nairobi": 3,
  "Africa/Kampala": 3,
  "Africa/Dar_es_Salaam": 3,
  "Africa/Mogadishu": 3,
  "Africa/Johannesburg": 2,
  "Africa/Harare": 2,
  "Africa/Maputo": 2,
  "Africa/Lusaka": 2,
  "Africa/Blantyre": 2,
  "Africa/Gaborone": 2,
  "Africa/Maseru": 2,
  "Africa/Mbabane": 2,
  "Africa/Lubumbashi": 2,
  "Africa/Windhoek": 2,
  "Africa/Luanda": 1,
  "Africa/Juba": 3,
  "Africa/Ceuta": 1,
  // Asia
  "Asia/Jerusalem": 2,
  "Asia/Beirut": 2,
  "Asia/Damascus": 2,
  "Asia/Amman": 2,
  "Asia/Nicosia": 2,
  "Asia/Baghdad": 3,
  "Asia/Kuwait": 3,
  "Asia/Riyadh": 3,
  "Asia/Qatar": 3,
  "Asia/Bahrain": 3,
  "Asia/Aden": 3,
  "Asia/Tehran": 3.5,
  "Asia/Dubai": 4,
  "Asia/Muscat": 4,
  "Asia/Baku": 4,
  "Asia/Tbilisi": 4,
  "Asia/Yerevan": 4,
  "Asia/Kabul": 4.5,
  "Asia/Karachi": 5,
  "Asia/Tashkent": 5,
  "Asia/Samarkand": 5,
  "Asia/Yekaterinburg": 5,
  "Asia/Dushanbe": 5,
  "Asia/Ashgabat": 5,
  "Asia/Colombo": 5.5,
  "Asia/Kolkata": 5.5,
  "Asia/Kathmandu": 5.75,
  "Asia/Dhaka": 6,
  "Asia/Almaty": 6,
  "Asia/Omsk": 6,
  "Asia/Thimphu": 6,
  "Asia/Rangoon": 6.5,
  "Asia/Bangkok": 7,
  "Asia/Ho_Chi_Minh": 7,
  "Asia/Jakarta": 7,
  "Asia/Krasnoyarsk": 7,
  "Asia/Novosibirsk": 7,
  "Asia/Pontianak": 7,
  "Asia/Phnom_Penh": 7,
  "Asia/Vientiane": 7,
  "Asia/Shanghai": 8,
  "Asia/Hong_Kong": 8,
  "Asia/Taipei": 8,
  "Asia/Makassar": 8,
  "Asia/Kuala_Lumpur": 8,
  "Asia/Singapore": 8,
  "Asia/Manila": 8,
  "Asia/Brunei": 8,
  "Asia/Irkutsk": 8,
  "Asia/Ulaanbaatar": 8,
  "Asia/Seoul": 9,
  "Asia/Tokyo": 9,
  "Asia/Jayapura": 9,
  "Asia/Pyongyang": 9,
  "Asia/Yakutsk": 9,
  "Asia/Chita": 9,
  "Asia/Dili": 9,
  "Australia/Darwin": 9.5,
  "Australia/Adelaide": 9.5,
  "Australia/Brisbane": 10,
  "Australia/Sydney": 10,
  "Australia/Melbourne": 10,
  "Australia/Hobart": 10,
  "Australia/Lord_Howe": 10.5,
  "Australia/Perth": 8,
  "Pacific/Auckland": 12,
  "Pacific/Fiji": 12,
  "Pacific/Tongatapu": 13,
  "Pacific/Apia": 13,
  "Pacific/Port_Moresby": 10,
  "Pacific/Guam": 10,
  "Pacific/Saipan": 10,
  "Pacific/Pago_Pago": -11,
  "Pacific/Midway": -11,
  "Pacific/Tahiti": -10,
  "Pacific/Marquesas": -9.5,
  "Pacific/Gambier": -9,
  "Pacific/Pitcairn": -8,
  "Pacific/Easter": -6,
  "Pacific/Galapagos": -6,
  "Pacific/Chatham": 12.75,
  "Atlantic/Reykjavik": 0,
  "Atlantic/Azores": -1,
  "Atlantic/Cape_Verde": -1,
  "Atlantic/Madeira": 0,
  "Atlantic/Canary": 0,
  "Atlantic/Faroe": 0,
  "Atlantic/South_Georgia": -2,
  "Atlantic/Stanley": -3,
  "Indian/Maldives": 5,
  "Indian/Mauritius": 4,
  "Indian/Reunion": 4,
  "Indian/Mayotte": 3,
  "Indian/Comoro": 3,
  "Indian/Antananarivo": 3,
  "Indian/Kerguelen": 5,
  "Indian/Chagos": 6,
  "Indian/Cocos": 6.5,
  "Indian/Christmas": 7,
  "UTC": 0,
};

function tzOffset(tz: string): number | null {
  if (tz in TIMEZONE_OFFSETS) return TIMEZONE_OFFSETS[tz];
  // Fallback: buscar prefijo
  for (const [key, val] of Object.entries(TIMEZONE_OFFSETS)) {
    if (tz.startsWith(key.split("/")[0] + "/")) {
      // mismo continente, intentar coincidencia exacta
    }
  }
  return null;
}

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

async function main() {
  const csvPath = path.resolve("src/data/cities.csv");
  const jsonPath = path.resolve("src/data/cities.json");

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ No se encontró: ${csvPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(csvPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const cities: CityRecord[] = [];
  let lineIndex = 0;
  let headers: string[] = [];

  // Índices de columnas (detectados del header)
  let iName = -1, iCountry = -1, iAdmin1 = -1, iTimezone = -1, iCoords = -1, iFeatureCode = -1;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const cols = line.split(";");

    if (lineIndex === 0) {
      headers = cols;
      iName      = headers.indexOf("Name");
      iCountry   = headers.indexOf("Country name EN");
      iAdmin1    = headers.indexOf("Admin1 Code");
      iTimezone  = headers.indexOf("Timezone");
      iCoords    = headers.indexOf("Coordinates");
      iFeatureCode = headers.indexOf("Feature Code");

      console.log(`📋 Columnas detectadas:`);
      console.log(`  Name       → col ${iName}`);
      console.log(`  Country    → col ${iCountry}`);
      console.log(`  Admin1     → col ${iAdmin1}`);
      console.log(`  Timezone   → col ${iTimezone}`);
      console.log(`  Coordinates→ col ${iCoords}`);
      console.log(`  FeatureCode→ col ${iFeatureCode}`);
      lineIndex++;
      continue;
    }

    // Filtrar solo ciudades (P = populated place)
    const featureCode = iFeatureCode >= 0 ? cols[iFeatureCode]?.trim() : "";
    // PPL, PPLA, PPLA2, PPLA3, PPLC = ciudades y capitales
    if (!featureCode.startsWith("PPL") && featureCode !== "PPLC") {
      lineIndex++;
      continue;
    }

    const name    = cols[iName]?.trim() || "";
    const country = cols[iCountry]?.trim() || "";
    const admin1  = cols[iAdmin1]?.trim() || "";
    const tz      = cols[iTimezone]?.trim() || "";
    const coords  = cols[iCoords]?.trim() || "";

    if (!name || !country || !coords) {
      lineIndex++;
      continue;
    }

    // Parsear coordenadas "lat, lon"
    const [latStr, lonStr] = coords.split(",").map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      lineIndex++;
      continue;
    }

    const tzone = tzOffset(tz);

    const record: CityRecord = {
      name,
      country,
      admin1,
      lat,
      lon,
      timezone: tz,
      tzone,
      search: `${name} ${admin1} ${country}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    };

    cities.push(record);
    lineIndex++;
  }

  fs.writeFileSync(jsonPath, JSON.stringify(cities), "utf8");

  const withTzone = cities.filter((c) => c.tzone !== null).length;
  const noTzone   = cities.filter((c) => c.tzone === null).length;

  console.log(`\n✅ cities.json generado: ${cities.length.toLocaleString()} ciudades`);
  console.log(`   Con tzone: ${withTzone.toLocaleString()}`);
  console.log(`   Sin tzone: ${noTzone.toLocaleString()}`);
  console.log(`   Guardado en: ${jsonPath}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
