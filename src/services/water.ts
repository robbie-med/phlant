export interface Gauge { id: string; name: string; lat: number; lon: number; distanceKm: number; siteType?: string; }
export interface Reading { gaugeId: string; parameter: string; label: string; value: number; unit: string; time: string; }
export interface WaterReport { fetchedAt: string; gauges: Gauge[]; readings: Reading[]; }

const PARAMS: Record<string, string> = { '00060': 'Discharge', '00065': 'Gage height', '00010': 'Water temperature', '72019': 'Groundwater depth below surface', '62610': 'Groundwater level', '00045': 'Precipitation', '00400': 'pH', '00095': 'Conductance' };

function haversine(a: [number, number], b: [number, number]) { const R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLon = (b[1] - a[1]) * Math.PI / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

/** USGS Water Data OGC API — monitoring locations within ~radiusKm (US only). */
export async function fetchGauges(lat: number, lon: number, radiusKm = 25, signal?: AbortSignal): Promise<Gauge[]> {
  const dLat = radiusKm / 111, dLon = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`;
  const u = `https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items?bbox=${bbox}&f=json&limit=500`;
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const j = await res.json();
  return (j.features ?? []).map((f: any) => ({ id: f.id, name: f.properties.monitoring_location_name, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], siteType: f.properties.site_type_code ?? f.properties.site_type, distanceKm: haversine([lat, lon], [f.geometry.coordinates[1], f.geometry.coordinates[0]]) }))
    .sort((a: Gauge, b: Gauge) => a.distanceKm - b.distanceKm).slice(0, 40);
}

/** Latest continuous readings (needs network each time). */
export async function fetchLatest(lat: number, lon: number, radiusKm = 25, signal?: AbortSignal): Promise<Reading[]> {
  const dLat = radiusKm / 111, dLon = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`;
  const u = `https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?bbox=${bbox}&f=json&limit=300`;
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const j = await res.json();
  const cutoff = Date.now() - 7 * 86_400_000;
  return (j.features ?? []).map((f: any) => f.properties).filter((p: any) => PARAMS[p.parameter_code] && new Date(p.time).getTime() > cutoff)
    .map((p: any) => ({ gaugeId: p.monitoring_location_id, parameter: p.parameter_code, label: PARAMS[p.parameter_code], value: +p.value, unit: p.unit_of_measure, time: p.time }));
}
