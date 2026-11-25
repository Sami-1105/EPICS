import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Record from './models/Record.js';
import { parseCwcCsv, getOsmShelters } from './services/realData.js';

export function installIntegrations(app, { getRecords, saveRecord, isDbReady }) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 }, fileFilter: (req,file,cb) => cb(null, file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) });
  const adminOnly = (req,res,next) => {
    const key = process.env.ADMIN_API_KEY;
    if (!key || req.get('x-admin-key') !== key) return res.status(401).json({error:'Admin API key missing or invalid. Configure ADMIN_API_KEY.'});
    next();
  };

  let osmCache = { at: 0, data: [] };
  router.get('/shelters', async (req,res) => {
    try {
      const official = await getRecords('shelters');
      const now = Date.now();
      if (!osmCache.at || now - osmCache.at > 15 * 60 * 1000) {
        osmCache.data = await getOsmShelters(); osmCache.at = now;
      }
      const osm = osmCache.data;
      const merged = [...official.filter(s => s.authorityVerified === true), ...osm];
      res.json({ shelters: merged, counts: { authorityVerified: merged.filter(s=>s.authorityVerified).length, osmUnverified: osm.length }, fetchedAt: new Date().toISOString(), note:'OpenStreetMap locations are discovery candidates only. Only authorityVerified records are official shelter records.' });
    } catch (e) {
      const official = await getRecords('shelters');
      res.json({ shelters: official, counts:{authorityVerified:official.filter(s=>s.authorityVerified).length,osmUnverified:0}, fetchedAt:null, warning:`OSM lookup unavailable: ${e.message}` });
    }
  });

  // Add/update an official shelter after district administration verification.
  router.post('/admin/shelters', adminOnly, async (req,res) => {
    const { name, lat, lng, capacity, occupied=0, status='unknown', district, contact, facilities, officialSource, verifiedBy } = req.body;
    if (!name || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || !officialSource || !verifiedBy) return res.status(400).json({error:'name, lat, lng, officialSource and verifiedBy are required'});
    if (!['open','closed','unknown'].includes(status)) return res.status(400).json({error:'status must be open, closed or unknown'});
    const shelter = { id:crypto.randomUUID(), name, lat:Number(lat), lng:Number(lng), capacity:Number.isFinite(Number(capacity))?Number(capacity):null, occupied:Number(occupied), available:Number.isFinite(Number(capacity))?Math.max(0,Number(capacity)-Number(occupied)):null, status, district: district || 'Vidisha', contact:contact||'', facilities:facilities||[], authorityVerified:true, verifiedBy, officialSource, lastUpdated:new Date().toISOString(), source:'District administration / authorized operator' };
    await saveRecord('shelters', shelter);
    res.status(201).json(shelter);
  });

  router.post('/admin/shelters/:id/status', adminOnly, async (req,res) => {
    const rows = await getRecords('shelters');
    const shelter = rows.find(s => s.id === req.params.id && s.authorityVerified);
    if (!shelter) return res.status(404).json({error:'Verified shelter not found'});
    const {status, occupied} = req.body;
    if (status && !['open','closed','unknown'].includes(status)) return res.status(400).json({error:'Invalid status'});
    const updated = {...shelter, ...(status?{status}:{}), ...(occupied!==undefined?{occupied:Number(occupied),available:shelter.capacity==null?null:Math.max(0,shelter.capacity-Number(occupied))}:{}), lastUpdated:new Date().toISOString()};
    if (isDbReady()) await Record.updateOne({kind:'shelters','payload.id':shelter.id},{$set:{payload:updated}});
    else { const i=rows.findIndex(s=>s.id===shelter.id); rows[i]=updated; }
    res.json(updated);
  });

  async function saveObservation(kind, row) {
    if (isDbReady()) {
      const exists = await Record.findOne({kind, 'payload.station':row.station, 'payload.date':row.date}).select('_id').lean();
      if (!exists) await saveRecord(kind, row);
    } else {
      const rows = await getRecords(kind);
      if (!rows.some(x => x.station === row.station && x.date === row.date)) await saveRecord(kind, row);
    }
  }

  // Import historical or recent CWC CSV exports. Supports both river and rainfall datasets.
  router.post('/admin/import/cwc/:kind', adminOnly, upload.single('file'), async (req,res) => {
    if (!['river','rainfall'].includes(req.params.kind)) return res.status(400).json({error:'kind must be river or rainfall'});
    if (!req.file) return res.status(400).json({error:'Upload a CWC CSV file using form field "file"'});
    let rows;
    try { rows = parseCwcCsv(req.file.buffer, req.params.kind); }
    catch(e) { return res.status(400).json({error:`CSV parse failed: ${e.message}`}); }
    if (!rows.length) return res.status(422).json({error:'No usable records found. Check CSV column names: timestamp/date, station, and water level/rainfall.'});
    // Keep only Betwa/Vidisha/Basoda rows if the file contains geographic or river labels.
    const allowUnmatched = req.query.allowUnmatched === 'true';
    const filtered = rows.filter(r => {
      const text = `${r.river} ${r.state} ${r.district} ${r.station}`.toLowerCase();
      const hasGeoLabels = r.river || r.state || r.district;
      return /betwa|vidisha|basoda|madhya pradesh|mp\b/.test(text) || (!hasGeoLabels && allowUnmatched);
    });
    for (const row of filtered) await saveObservation(req.params.kind, row);
    res.status(201).json({ imported:filtered.length, parsed:rows.length, skipped:rows.length-filtered.length, kind:req.params.kind, source:'CWC CSV uploaded by operator', newest:filtered.sort((a,b)=>new Date(b.date)-new Date(a.date))[0]?.date || null, note:'Check station, units, timestamps and official danger levels before using for warning decisions.' });
  });

  // A configured direct CSV URL can be polled on a schedule. Do not scrape portal pages.
  async function syncCsv(url, kind) {
    if (!url) return;
    const response = await fetch(url, { signal:AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${kind} CSV fetch failed: ${response.status}`);
    const rows = parseCwcCsv(Buffer.from(await response.arrayBuffer()), kind);
    const relevant = rows.filter(r => /betwa|vidisha|basoda|madhya pradesh|mp\b/i.test(`${r.river} ${r.state} ${r.district} ${r.station}`));
    if (!relevant.length) { console.warn(`CWC ${kind}: no Betwa/Vidisha/Basoda rows matched; nothing imported.`); return; }
    for (const row of relevant) await saveObservation(kind,row);
    console.log(`CWC ${kind}: imported ${relevant.length} observations`);
  }
  const runConfiguredSync = async () => {
    try { await syncCsv(process.env.CWC_RIVER_CSV_URL,'river'); } catch(e) { console.error(e.message); }
    try { await syncCsv(process.env.CWC_RAIN_CSV_URL,'rainfall'); } catch(e) { console.error(e.message); }
  };
  if (process.env.CWC_RIVER_CSV_URL || process.env.CWC_RAIN_CSV_URL) {
    setTimeout(runConfiguredSync, 5000);
    setInterval(runConfiguredSync, Math.max(15,Number(process.env.CWC_SYNC_MINUTES)||60)*60*1000);
  }

  router.get('/evacuation/route', async (req,res) => {
    const {fromLat,fromLng,toLat,toLng} = req.query;
    const coords = [fromLat,fromLng,toLat,toLng].map(Number);
    if (coords.some(n=>!Number.isFinite(n))) return res.status(400).json({error:'fromLat, fromLng, toLat and toLng are required'});
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${coords[1]},${coords[0]};${coords[3]},${coords[2]}?overview=full&geometries=geojson&steps=true`;
      const r = await fetch(url, {signal:AbortSignal.timeout(20000)});
      if (!r.ok) throw new Error(`OSRM returned ${r.status}`);
      const j = await r.json();
      if (j.code !== 'Ok' || !j.routes?.length) return res.status(404).json({error:'No road route found'});
      const route = j.routes[0];
      res.json({distanceKm:route.distance/1000, durationMinutes:route.duration/60, geometry:route.geometry, status:'UNVERIFIED', engine:'OSRM / OpenStreetMap', warning:'This is a normal road route, NOT a flood-safe route. OSRM does not know live flood depths, road closures, bridge damage or shelter occupancy. Do not use as an evacuation instruction without authority-verified road and destination data.'});
    } catch(e) { res.status(502).json({error:`Routing service unavailable: ${e.message}`}); }
  });

  app.use('/api', router);
}
