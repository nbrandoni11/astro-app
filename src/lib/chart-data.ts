export type Planet = { name: string; sign: string; full_degree: number; is_retro?: string | boolean };
export type House = { house_id: number; start_degree: number; end_degree: number; sign: string; planets: Planet[] };
export type ChartData = { houses: House[]; aspects: Array<{ type: string; aspecting_planet: string; aspected_planet: string; orb: number }> };
export function assertChart(data: unknown): asserts data is ChartData {
  const d = data as ChartData;
  if (!d || !Array.isArray(d.houses) || d.houses.length !== 12 || !d.houses.every(h => Number.isFinite(h.start_degree) && Number.isFinite(h.end_degree) && Array.isArray(h.planets) && h.planets.every(p => Number.isFinite(p.full_degree)))) {
    throw new Error('El proveedor no devolvió una carta completa. No se guardó un cálculo incompleto.');
  }
}
export function sunLongitude(data: ChartData) {
  const sun = data.houses.flatMap(h => h.planets).find(p => p.name.toLowerCase() === 'sun');
  if (!sun) throw new Error('No se encontró la posición del Sol.');
  return sun.full_degree;
}
export const signNames = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
export const planetNames: Record<string, string> = { Sun: 'Sol', Moon: 'Luna', Mercury: 'Mercurio', Venus: 'Venus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Neptune: 'Neptuno', Pluto: 'Plutón', Node: 'Nodo', Chiron: 'Quirón', 'Part of Fortune': 'Parte de la Fortuna' };
