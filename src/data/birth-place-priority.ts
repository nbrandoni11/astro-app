// Mapping of Geonames numeric admin1 codes to Argentina province names
export const ARG_ADMIN1_MAP: Record<string, string> = {
  "01": "Provincia de Buenos Aires",
  "02": "Catamarca",
  "03": "Chaco",
  "04": "Chubut",
  "05": "Córdoba",
  "06": "Corrientes",
  "07": "Ciudad Autónoma de Buenos Aires",
  "08": "Entre Ríos",
  "09": "Formosa",
  "10": "Jujuy",
  "11": "La Pampa",
  "12": "La Rioja",
  "13": "Mendoza",
  "14": "Misiones",
  "15": "Neuquén",
  "16": "Río Negro",
  "17": "Salta",
  "18": "San Juan",
  "19": "San Luis",
  "20": "Santa Cruz",
  "21": "Santa Fe",
  "22": "Santiago del Estero",
  "23": "Tierra del Fuego",
  "24": "Tucumán"
};

// Central coordinates for Ciudad Autónoma de Buenos Aires
export const CABA_COORDS = {
  lat: -34.61315,
  lon: -58.37723,
  timezone: "America/Argentina/Buenos_Aires",
  tzone: -3
};

export interface BarrioInfo {
  name: string;
  lat: number;
  lon: number;
}

// Coordinates for specific CABA barrios
export const BARRIOS_DATA: Record<string, BarrioInfo> = {
  "caballito": { name: "Caballito", lat: -34.6179, lon: -58.4419 },
  "palermo": { name: "Palermo", lat: -34.5786, lon: -58.4269 },
  "recoleta": { name: "Recoleta", lat: -34.5886, lon: -58.3974 },
  "belgrano": { name: "Belgrano", lat: -34.5615, lon: -58.4563 },
  "villa crespo": { name: "Villa Crespo", lat: -34.5985, lon: -58.4416 },
  "almagro": { name: "Almagro", lat: -34.6067, lon: -58.4198 },
  "flores": { name: "Flores", lat: -34.6288, lon: -58.4631 },
  "san telmo": { name: "San Telmo", lat: -34.6209, lon: -58.3732 },
  "puerto madero": { name: "Puerto Madero", lat: -34.6118, lon: -58.3647 },
  "nuñez": { name: "Nuñez", lat: -34.5467, lon: -58.4572 },
  "colegiales": { name: "Colegiales", lat: -34.5743, lon: -58.4485 },
  "chacarita": { name: "Chacarita", lat: -34.5878, lon: -58.4542 },
  "villa urquiza": { name: "Villa Urquiza", lat: -34.5706, lon: -58.4879 }
};

export const ARGENTINE_PROVINCES = [
  "san juan",
  "mendoza",
  "cordoba",
  "neuquen",
  "santa fe",
  "tucuman",
  "salta",
  "jujuy",
  "chaco",
  "corrientes",
  "entre rios",
  "rio negro",
  "chubut",
  "santa cruz",
  "tierra del fuego",
  "la pampa",
  "la rioja",
  "catamarca",
  "misiones",
  "formosa",
  "san luis",
  "santiago del estero",
  "buenos aires"
];

export const COUNTRY_TRANSLATIONS: Record<string, string> = {
  "espana": "spain",
  "estados unidos": "united states",
  "eeuu": "united states",
  "reino unido": "united kingdom",
  "alemania": "germany",
  "francia": "france",
  "italia": "italy",
  "japon": "japan",
  "paises bajos": "netherlands",
  "belgica": "belgium",
  "suiza": "switzerland",
  "suecia": "sweden",
  "noruega": "norway",
  "finlandia": "finland",
  "dinamarca": "denmark",
  "polonia": "poland",
  "grecia": "greece",
  "turquia": "turkey",
  "rusia": "russia",
  "brasil": "brazil",
  "nueva zelanda": "new zealand",
  "sudafrica": "south africa",
};
