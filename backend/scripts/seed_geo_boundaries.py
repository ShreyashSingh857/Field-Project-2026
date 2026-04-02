#!/usr/bin/env python3
"""
GramWasteConnect — Geographic Boundary Seeder
Fetches real boundary polygons from Indian government GIS sources
and populates the Supabase geo_* tables.

Sources:
  Districts : https://yashveeeeeer.github.io/india-geodata/districts.geojson
  GPs/Blocks: https://mapservice.gov.in (NIC Bharat Map Services ArcGIS REST)

Scope: Maharashtra state (code 27), Pune district (code 523) for GP level.

Usage:
  pip install requests geopandas shapely supabase python-dotenv
  python backend/scripts/seed_geo_boundaries.py
"""

import os
import sys
import time

import geopandas as gpd
import requests
from dotenv import load_dotenv
from shapely.geometry import mapping, shape

# Load .env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

# Supabase REST API headers — use service role to bypass RLS
HEADERS = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

# ── Constants ────────────────────────────────────────────────
MAHARASHTRA_STATE_CODE = '27'
PUNE_DISTRICT_CODE = '523'

DISTRICTS_GEOJSON_URL = (
    'https://yashveeeeeer.github.io/india-geodata/districts.geojson'
)
DISTRICTS_FALLBACK_URL = (
    'https://raw.githubusercontent.com/yashveeeeeer/'
    'india-geodata/main/districts.geojson'
)

GP_REST_URL = (
    'https://mapservice.gov.in/mapserviceserv176/rest/services/'
    'Panchayat/AdminGPHierarchy/MapServer/3/query'
)


def supabase_upsert(table, rows, conflict_cols=None):
    """Insert rows into a Supabase table. Returns number inserted."""
    if not rows:
        return 0
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    headers = dict(HEADERS)
    if conflict_cols:
        # On conflict, update all other columns
        headers['Prefer'] = 'resolution=merge-duplicates'
    resp = requests.post(url, headers=headers, json=rows, timeout=30)
    if resp.status_code not in (200, 201):
        print(f'  ERROR inserting into {table}: {resp.status_code} {resp.text[:300]}')
        return 0
    return len(rows)


def supabase_select(table, select='*', filters=None):
    """Select rows from a Supabase table."""
    url = f'{SUPABASE_URL}/rest/v1/{table}?select={select}'
    if filters:
        for k, v in filters.items():
            url += f'&{k}=eq.{v}'
    resp = requests.get(url, headers=HEADERS, timeout=30)
    if resp.status_code != 200:
        print(f'  ERROR fetching {table}: {resp.status_code}')
        return []
    return resp.json()


def simplify_geometry(geojson_geom, tolerance=0.01):
    """
    Simplify a GeoJSON geometry using Shapely.
    tolerance=0.01 degrees ≈ ~1km. Reduces polygon vertex count
    dramatically for web rendering performance.
    """
    try:
        geom = shape(geojson_geom)
        simplified = geom.simplify(tolerance, preserve_topology=True)
        return mapping(simplified)
    except Exception:
        return geojson_geom


def get_centroid(geojson_geom):
    """Return (lat, lng) centroid of a GeoJSON geometry."""
    try:
        geom = shape(geojson_geom)
        c = geom.centroid
        return round(c.y, 6), round(c.x, 6)
    except Exception:
        return None, None


# ── Step 1: Seed Maharashtra state ──────────────────────────

def seed_state():
    print('\n[1/4] Seeding Maharashtra state...')
    row = {
        'name': 'Maharashtra',
        'census_code': MAHARASHTRA_STATE_CODE,
        'lgd_code': '27',
    }
    n = supabase_upsert('geo_states', [row])
    print(f'  Inserted/updated {n} state(s)')

    states = supabase_select('geo_states', filters={'census_code': MAHARASHTRA_STATE_CODE})
    if not states:
        print('  ERROR: Could not fetch state after insert')
        sys.exit(1)
    return states[0]['id']


# ── Step 2: Seed districts from GeoJSON ─────────────────────

def fetch_districts_geojson():
    print('\n[2/4] Fetching district boundaries...')
    for url in [DISTRICTS_GEOJSON_URL, DISTRICTS_FALLBACK_URL]:
        try:
            print(f'  Trying {url}')
            resp = requests.get(url, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                print(f'  Got {len(data["features"])} district features')
                return data
        except Exception as e:
            print(f'  Failed: {e}')
    print('  ERROR: Could not fetch district GeoJSON from any source')
    sys.exit(1)


def seed_districts(state_id, districts_geojson):
    print('  Filtering to Maharashtra districts...')
    mh_features = [
        f for f in districts_geojson['features']
        if str(f.get('properties', {}).get('st_code', '')).zfill(2) == MAHARASHTRA_STATE_CODE
        or str(f.get('properties', {}).get('stname', '')).lower() == 'maharashtra'
    ]
    print(f'  Found {len(mh_features)} Maharashtra districts')

    rows = []
    for feat in mh_features:
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        if not geom:
            continue

        simplified = simplify_geometry(geom, tolerance=0.005)
        centroid_lat, centroid_lng = get_centroid(geom)

        # Normalize district name
        name = (
            props.get('dtname')
            or props.get('NAME_2')
            or props.get('district')
            or 'Unknown'
        )
        census_code = str(props.get('dt_code') or props.get('DT_CEN_CD') or '')
        state_census_code = MAHARASHTRA_STATE_CODE

        rows.append({
            'name': name.strip().title(),
            'state_id': state_id,
            'census_code': census_code,
            'state_census_code': state_census_code,
            'lgd_code': census_code,
            'boundary_geojson': simplified,
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })

    # Insert in batches of 50 (boundary_geojson can be large)
    inserted = 0
    for i in range(0, len(rows), 50):
        batch = rows[i:i + 50]
        n = supabase_upsert('geo_districts', batch)
        inserted += n
        print(f'  Inserted districts batch {i // 50 + 1}: {n} rows')
        time.sleep(0.3)

    print(f'  Total districts inserted: {inserted}')


# ── Step 3: Fetch GPs for Pune from ArcGIS REST ─────────────

def fetch_gps_for_district(district_code, state_code=MAHARASHTRA_STATE_CODE):
    """
    Fetch all GP polygons for a given district from NIC Bharat Map Services.
    Paginates through results 1000 at a time.
    Returns a list of GeoJSON feature dicts.
    """
    print(f'\n[3/4] Fetching GP boundaries for district {district_code}...')
    all_features = []
    offset = 0
    page_size = 1000

    while True:
        params = {
            'where': f"stcode11='{state_code}' AND dtcode11='{district_code}'",
            'outFields': 'GPCODE,GPNAME,stcode11,dtcode11,blkcode11,BLKNAME,DTNAME',
            'f': 'geojson',
            'resultOffset': offset,
            'resultRecordCount': page_size,
            'outSR': '4326',
        }
        try:
            resp = requests.get(GP_REST_URL, params=params, timeout=60)
            if resp.status_code != 200:
                print(f'  HTTP {resp.status_code} at offset {offset}')
                break
            data = resp.json()
            features = data.get('features', [])
            if not features:
                break
            all_features.extend(features)
            print(f'  Fetched {len(features)} GPs (total so far: {len(all_features)})')
            if len(features) < page_size:
                break
            offset += page_size
            time.sleep(0.5)
        except Exception as e:
            print(f'  Error at offset {offset}: {e}')
            break

    print(f'  Total GPs fetched for district {district_code}: {len(all_features)}')
    return all_features


def seed_blocks_and_gps(district_census_code, gp_features):
    """
    From GP features, derive blocks by dissolving on blkcode11,
    then insert blocks and GPs into the database.
    """
    if not gp_features:
        print('  No GP features to process')
        return

    print(f'  Building GeoDataFrame for {len(gp_features)} GPs...')

    # Build GeoDataFrame
    try:
        gdf = gpd.GeoDataFrame.from_features(gp_features, crs='EPSG:4326')
    except Exception as e:
        print(f'  ERROR building GeoDataFrame: {e}')
        return

    # ── Fetch parent district ID from database ──────────────
    districts = supabase_select('geo_districts', filters={'census_code': district_census_code})
    district_db_id = districts[0]['id'] if districts else None
    if not district_db_id:
        print(
            f'  WARNING: district {district_census_code} not found in DB. '
            'Run district seed first.'
        )

    # ── Derive and seed blocks via dissolve ─────────────────
    print('  Deriving block boundaries by dissolving GPs...')
    # Ensure blkcode11 column exists and is string
    if 'blkcode11' not in gdf.columns:
        print('  WARNING: blkcode11 column missing, skipping block seeding')
    else:
        gdf['blkcode11'] = gdf['blkcode11'].astype(str)
        block_groups = gdf.dissolve(by='blkcode11', aggfunc='first').reset_index()

        block_rows = []
        block_db_ids = {}

        for _, row in block_groups.iterrows():
            blk_code = str(row.get('blkcode11', ''))
            blk_name = str(row.get('BLKNAME', '') or row.get('blkname', '') or f'Block {blk_code}')
            geom = row.geometry
            if geom is None or geom.is_empty:
                continue

            simplified = simplify_geometry(mapping(geom), tolerance=0.003)
            centroid_lat, centroid_lng = get_centroid(mapping(geom))

            block_rows.append({
                'name': blk_name.strip().title(),
                'district_id': district_db_id,
                'census_code': blk_code,
                'state_census_code': MAHARASHTRA_STATE_CODE,
                'district_census_code': district_census_code,
                'boundary_geojson': simplified,
                'centroid_lat': centroid_lat,
                'centroid_lng': centroid_lng,
            })

        # Insert blocks
        inserted_blocks = 0
        for i in range(0, len(block_rows), 50):
            batch = block_rows[i:i + 50]
            n = supabase_upsert('geo_blocks', batch)
            inserted_blocks += n
            time.sleep(0.2)
        print(f'  Inserted {inserted_blocks} blocks')

        # Fetch block IDs for GP foreign keys
        db_blocks = supabase_select(
            'geo_blocks',
            select='id,census_code',
            filters={'district_census_code': district_census_code}
        )
        block_db_ids = {b['census_code']: b['id'] for b in db_blocks}

    # ── Seed individual GPs ──────────────────────────────────
    print(f'  Seeding {len(gp_features)} GPs...')
    gp_rows = []

    for feat in gp_features:
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        if not geom:
            continue

        gp_code = str(props.get('GPCODE', ''))
        gp_name = str(props.get('GPNAME', '') or f'GP {gp_code}')
        blk_code = str(props.get('blkcode11', ''))
        dt_code = str(props.get('dtcode11', ''))

        simplified = simplify_geometry(geom, tolerance=0.001)
        centroid_lat, centroid_lng = get_centroid(geom)
        block_db_id = block_db_ids.get(blk_code)

        gp_rows.append({
            'name': gp_name.strip().title(),
            'block_id': block_db_id,
            'district_id': district_db_id,
            'census_code': gp_code,
            'state_census_code': MAHARASHTRA_STATE_CODE,
            'district_census_code': dt_code,
            'block_census_code': blk_code,
            'boundary_geojson': simplified,
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })

    # Insert GPs in batches of 100
    inserted_gps = 0
    for i in range(0, len(gp_rows), 100):
        batch = gp_rows[i:i + 100]
        n = supabase_upsert('geo_gram_panchayats', batch)
        inserted_gps += n
        if i % 1000 == 0:
            print(f'  GP progress: {i}/{len(gp_rows)}...')
        time.sleep(0.1)

    print(f'  Inserted {inserted_gps} gram panchayats')


# ── Step 4: Update demo village with LGD codes ───────────────

def update_demo_village():
    print('\n[4/4] Updating demo village with LGD codes...')
    url = f'{SUPABASE_URL}/rest/v1/villages'
    patch_url = url + '?gram_panchayat_name=ilike.Uruli Kanchan*'
    payload = {
        'lgd_state_code': '27',
        'lgd_district_code': '523',
        'lgd_block_code': '5504',
        'lgd_gp_code': '556432',
        'location_lat': 18.5089,
        'location_lng': 74.0578,
    }
    resp = requests.patch(patch_url, headers=HEADERS, json=payload, timeout=15)
    if resp.status_code in (200, 204):
        print('  Demo village updated with LGD codes')
    else:
        print(f'  Note: {resp.status_code} — village may not exist yet')
        # Insert if not exists
        insert_payload = {
            'name': 'Uruli Kanchan',
            'district': 'Pune District',
            'block_name': 'Haveli Block',
            'gram_panchayat_name': 'Uruli Kanchan GP',
            'location_lat': 18.5089,
            'location_lng': 74.0578,
            'lgd_state_code': '27',
            'lgd_district_code': '523',
            'lgd_block_code': '5504',
            'lgd_gp_code': '556432',
        }
        r2 = requests.post(url, headers=HEADERS, json=insert_payload, timeout=15)
        if r2.status_code in (200, 201):
            print('  Demo village inserted')
        else:
            print(f'  Insert result: {r2.status_code}')


# ── Main ─────────────────────────────────────────────────────

def main():
    print('=' * 60)
    print('GramWasteConnect Geographic Boundary Seeder')
    print('Scope: Maharashtra state | Pune district (GP-level)')
    print('=' * 60)

    state_id = seed_state()

    districts_geojson = fetch_districts_geojson()
    seed_districts(state_id, districts_geojson)

    gp_features = fetch_gps_for_district(PUNE_DISTRICT_CODE)
    seed_blocks_and_gps(PUNE_DISTRICT_CODE, gp_features)

    update_demo_village()

    print('\n' + '=' * 60)
    print('Seeding complete.')
    print('Tables populated: geo_states, geo_districts, geo_blocks,')
    print('                  geo_gram_panchayats')
    print('=' * 60)


if __name__ == '__main__':
    main()
