import { parse } from 'csv-parse/sync';

const number = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function parseObservationDate(value) {
  const s = String(value || '').trim();
  // Indian CSV exports commonly use DD/MM/YYYY or DD-MM-YYYY.
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]||0), Number(m[5]||0), Number(m[6]||0)));
  return new Date(s);
}
function pick(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const key = keys.find(k => norm(k) === norm(alias));
    if (key !== undefined && row[key] !== '') return row[key];
  }
  for (const alias of aliases) {
    const key = keys.find(k => norm(k).includes(norm(alias)));
    if (key !== undefined && row[key] !== '') return row[key];
  }
  return null;
}
export function parseCwcCsv(buffer, kind) {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true, trim: true });
  return rows.map(row => {
    const timestamp = pick(row, ['timestamp','date time','datetime','observation date','date']);
    const station = pick(row, ['station name','station','site name','location']);
    const river = pick(row, ['river name','river']);
    const state = pick(row, ['state']);
    const district = pick(row, ['district']);
    const lat = number(pick(row, ['latitude','lat']));
    const lng = number(pick(row, ['longitude','long','lon']));
    const value = kind === 'river'
      ? number(pick(row, ['water level','river water level','level','wl']))
      : number(pick(row, ['rainfall','rainfall mm','rainfall value','precipitation']));
    const date = timestamp ? parseObservationDate(timestamp) : null;
    if (value === null || !date || Number.isNaN(date.getTime())) return null;
    return { kind, station: station || 'Unknown station', river: river || '', state: state || '', district: district || '', lat, lng,
      ...(kind === 'river' ? { level: value, unit: 'm' } : { rainfall: value, unit: 'mm' }),
      date: date.toISOString(), source: 'Central Water Commission (CSV import)', sourceTimestamp: date.toISOString(), importedAt: new Date().toISOString(), raw: row };
  }).filter(Boolean);
}
export async function getOsmShelters() {
  const query = `[out:json][timeout:25];(node["emergency"="shelter"](23.1,77.1,24.4,78.7);way["emergency"="shelter"](23.1,77.1,24.4,78.7);relation["emergency"="shelter"](23.1,77.1,24.4,78.7);node["amenity"="shelter"](23.1,77.1,24.4,78.7);way["amenity"="shelter"](23.1,77.1,24.4,78.7););out center tags;`;
  const endpoints = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`data=${encodeURIComponent(query)}`, signal:AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
      const json = await response.json();
      return (json.elements || []).map(el => {
        const tags = el.tags || {}, lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { id:`osm-${el.type}-${el.id}`, name:tags.name || tags['name:en'] || 'Unnamed mapped shelter', lat, lng,
          capacity:null, occupied:null, available:null, status:'unknown', verified:false, authorityVerified:false,
          source:'OpenStreetMap', sourceUrl:`https://www.openstreetmap.org/${el.type}/${el.id}`, lastUpdated:new Date().toISOString(), tags,
          warning:'Mapped location only. Opening status, capacity and suitability are not verified.' };
      }).filter(Boolean);
    } catch(e) { lastError=e; }
  }
  throw lastError || new Error('Unable to query OpenStreetMap Overpass');
}
