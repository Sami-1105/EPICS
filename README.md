# CLARKE — Betwa River Disaster Intelligence Platform

A runnable MVP focused on the Betwa River around Vidisha and Basoda, Madhya Pradesh.

## Features
- Disaster data: river observations, rainfall, affected areas, shelters and assessment records.
- Monitoring dashboard: risk cards, river/rainfall charts and recent alerts.
- Flood-risk engine: transparent rule-based score (not a validated hydrological forecast).
- Drone assessment: upload aerial images; demo mode records an assessment and returns clearly labelled illustrative detections. Replace with a trained YOLO/segmentation model for real detection.
- Emergency: demo login, SOS and incident reporting, alerts.
- Shelter & evacuation: Leaflet map, shelters, affected-area markers and suggested routes.

## Requirements
- Node.js 18+
- npm
- MongoDB optional. Without MongoDB, API uses bundled sample data in memory.

## Run
### 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
API: http://localhost:5000

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Data integrity / safety
The bundled Betwa observations and shelters are **demonstration/sample records**, not verified live measurements or official evacuation facilities. The dashboard labels sample data. Do not use this prototype for real emergency decisions. Connect verified CWC/IMD feeds, validate thresholds with local authorities, and verify shelter capacity, road closures and routes before operational use.

## Connect MongoDB
Set `MONGO_URI` in `backend/.env`. If unset or connection fails, the server uses sample data.

## API
- `GET /api/overview`
- `GET /api/river`
- `GET /api/rainfall`
- `GET /api/flood-risk`
- `GET /api/areas`
- `GET /api/shelters`
- `GET /api/alerts`
- `POST /api/reports`
- `POST /api/sos`
- `POST /api/drone/assess` (multipart field: `image`)
- `GET /api/drone/assessments`
- `POST /api/auth/login` (demo: any email + password of 4+ chars)
- `POST /api/auth/register`

## Real data integration
No public live CWC endpoint is assumed by this starter. Import verified station observations into `backend/data/betwa-demo.json` or implement a source-specific adapter after obtaining authorized API/feed access. Likewise use an official IMD feed/API or verified rainfall dataset. Never relabel sample data as live.

## Real data integration (new)

This build adds:
- `GET /api/shelters`: OpenStreetMap Overpass shelter candidates (cached for 15 minutes) plus only authority-verified shelter records. OSM locations are NOT proof that a building is an operating relief shelter.
- `POST /api/admin/shelters`: authorized operator endpoint to add an official shelter record.
- `POST /api/admin/shelters/:id/status`: update open/closed/unknown status and occupied count.
- `POST /api/admin/import/cwc/river` and `/api/admin/import/cwc/rainfall`: import a CWC CSV export, including historical records.
- `GET /api/evacuation/route`: obtains a normal driving route from OSRM. It is explicitly marked UNVERIFIED; OSRM does not know flood depth, closures, damaged bridges or shelter status.

### Configure
1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI` to your MongoDB connection string and set a long random `ADMIN_API_KEY`.
3. Install dependencies with `npm install` in `backend` and restart the server.
4. For CWC data, open the official NWDP CWC River Water Level Telemetry dataset, select the relevant resource and download its CSV. Verify that the CSV actually contains Betwa / Vidisha / Basoda station rows. Do not assume that a nearby river-basin station is a Betwa station.
5. Import a CSV with the examples below. Historical files can be imported the same way. The importer expects columns resembling Date/Timestamp, Station, and Water Level or Rainfall. Check units and station metadata after import.

### Import CWC CSV using curl
```bash
curl -X POST http://localhost:5000/api/admin/import/cwc/river \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -F "file=@./betwa_river_levels.csv"

curl -X POST http://localhost:5000/api/admin/import/cwc/rainfall \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -F "file=@./vidisha_rainfall.csv"
```

You can also set `CWC_RIVER_CSV_URL` and/or `CWC_RAIN_CSV_URL` to a stable direct CSV download URL and set `CWC_SYNC_MINUTES`. The server will poll those URLs. Do not paste a dataset landing-page URL; it must be a direct CSV resource URL. The scheduled importer only saves rows whose river/station/state/district labels match Betwa, Vidisha, Basoda or Madhya Pradesh. Check the import log and verify the station before relying on it.

### Add a shelter verified by the district administration
```bash
curl -X POST http://localhost:5000/api/admin/shelters \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"name":"Official relief shelter name","lat":23.5,"lng":77.8,"capacity":200,"occupied":35,"status":"open","district":"Vidisha","officialSource":"District Disaster Management Authority notice/reference","verifiedBy":"Authorized officer name"}'
```

Update its status/occupancy:
```bash
curl -X POST http://localhost:5000/api/admin/shelters/SHELTER_ID/status \
  -H "Content-Type: application/json" -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"status":"open","occupied":52}'
```

The shelter map distinguishes authority-verified shelters from OSM candidates. The route button is shown only for a verified shelter marked open. Even then, the returned OSRM route is only a road route and is not safe-to-evacuate certified. To claim flood-safe routing, connect official road-closure reports, georeferenced flood polygons, bridge status and a live shelter status feed, then exclude blocked road segments and revalidate the entire route.

### Important data limitations
- CWC/NWDP data is published as downloadable CSV/API resources, but the existence of a Betwa/Vidisha/Basoda gauge record must be checked in the actual resource. No Betwa station is hard-coded.
- OSM shelter tags are community map data, not an official live shelter occupancy feed. Capacity, open/closed status and verification require the district authority or an authorized operator to update the CLARKE database.
- A source timestamp is not the same as the time CLARKE fetched it. Show both and mark stale readings.
- Never invent danger levels. Configure station-specific warning/danger levels only from CWC/local administration.
