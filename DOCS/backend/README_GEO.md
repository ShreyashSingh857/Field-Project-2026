# Geographic Boundary Data Pipeline

## What this does
Downloads real GP, block, and district boundaries from Indian
government sources and populates the Supabase geo_* tables.

## Data sources
- Districts: https://yashveeeeeer.github.io/india-geodata/
  (aggregates LGD + Census 2011 + Bhuvan/ISRO data)
- Gram Panchayats: NIC Bharat Map Services (mapservice.gov.in)
  ArcGIS REST API — official government GIS portal
- Blocks: Derived by dissolving GP polygons on block code

## Scope
- All India states and districts (boundary polygons)
- All district-level GP boundaries available from NIC map services
- Block boundaries derived by dissolving GP polygons

## Setup
```bash
cd backend
pip install -r scripts/requirements.txt
```

## Environment
Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env

## Run
```bash
python scripts/seed_geo_boundaries.py
```

## Resumable controls
- `SEED_DISTRICT_OFFSET` start from district index offset
- `SEED_MAX_DISTRICTS` limit count for chunked runs (0 = all)
- `SEED_DISTRICT_SLEEP_SEC` delay between districts
- `SEED_VERIFY_SSL` set `0` only if your network breaks TLS handshakes

## Run SQL migration first
Run GEOGRAPHIC_MIGRATION.sql in Supabase SQL Editor before
running this script.

## Expected runtime
Full India run can take many hours depending on NIC response times.
Use chunked runs with offset/limit to safely continue across sessions.

## Troubleshooting
- If NIC ArcGIS endpoint is slow/down, the script retries once per page.
  Government servers can be intermittent — re-run if it stops midway.
- If districts GeoJSON fails, the script tries a fallback GitHub raw URL.
- All failures are logged but non-fatal — the script continues.
