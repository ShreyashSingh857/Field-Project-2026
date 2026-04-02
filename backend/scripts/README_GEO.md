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
- All Maharashtra districts (boundary polygons)
- Pune district only: GP-level and block-level boundaries
- ~27,000 GP records for Pune district

## Setup
```bash
cd backend
pip install -r scripts/requirements.txt
```

## Environment
Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env

## Run
```bash
python3 scripts/seed_geo_boundaries.py
```

## Run SQL migration first
Run GEOGRAPHIC_MIGRATION.sql in Supabase SQL Editor before
running this script.

## Expected runtime
~10-15 minutes for Pune district GPs (pagination from govt server).
District polygons are fast (~2 minutes).

## Troubleshooting
- If NIC ArcGIS endpoint is slow/down, the script retries once per page.
  Government servers can be intermittent — re-run if it stops midway.
- If districts GeoJSON fails, the script tries a fallback GitHub raw URL.
- All failures are logged but non-fatal — the script continues.
