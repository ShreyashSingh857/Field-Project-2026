#!/usr/bin/env python3
"""
GramWasteConnect — Geographic Boundary Seeder
Fetches real boundary polygons from official India geodata release assets
and populates the Supabase geo_* tables.

Sources:
    States/Districts/Blocks/GPs: GitHub release assets from india-geodata
    Fallback district list: NIC Bharat Map Services ArcGIS REST

Scope: India-wide states, districts, blocks, and gram panchayats.

Usage:
  pip install requests geopandas shapely supabase python-dotenv
  python backend/scripts/seed_geo_boundaries.py
"""

import os
import sys
import tempfile
import json
import time
from pathlib import Path

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
SEED_DISTRICT_OFFSET = int(os.getenv('SEED_DISTRICT_OFFSET', '0'))
SEED_MAX_DISTRICTS = int(os.getenv('SEED_MAX_DISTRICTS', '0'))
SEED_DISTRICT_SLEEP_SEC = float(os.getenv('SEED_DISTRICT_SLEEP_SEC', '0.2'))
SEED_VERIFY_SSL = os.getenv('SEED_VERIFY_SSL', '1') != '0'
SEED_CACHE_DIR = os.getenv(
    'SEED_CACHE_DIR',
    str(Path(__file__).resolve().parents[1] / 'data' / 'geo-cache'),
)
SEED_BATCH_SIZE_SMALL = int(os.getenv('SEED_BATCH_SIZE_SMALL', '150'))
SEED_BATCH_SIZE_GP = int(os.getenv('SEED_BATCH_SIZE_GP', '250'))
SEED_INCLUDE_BLOCKS = os.getenv('SEED_INCLUDE_BLOCKS', '1') != '0'
SEED_INCLUDE_PANCHAYATS = os.getenv('SEED_INCLUDE_PANCHAYATS', '1') != '0'
SEED_FAST_MODE = os.getenv('SEED_FAST_MODE', '0') != '0'
SEED_SIMPLIFY_GEOMETRY = os.getenv('SEED_SIMPLIFY_GEOMETRY', '1') != '0'
SEED_COMPUTE_CENTROID = os.getenv('SEED_COMPUTE_CENTROID', '1') != '0'
SEED_UPDATE_DEMO_VILLAGE = os.getenv('SEED_UPDATE_DEMO_VILLAGE', '0') != '0'

DISTRICTS_GEOJSON_URL = (
    'https://yashveeeeeer.github.io/india-geodata/districts.geojson'
)
DISTRICTS_FALLBACK_URL = (
    'https://raw.githubusercontent.com/yashveeeeeer/'
    'india-geodata/main/districts.geojson'
)
DISTRICTS_RELEASE_TAG = 'admin/districts'
DISTRICTS_RELEASE_ASSET = 'LGD_Districts.geojsonl.7z'
STATES_RELEASE_TAG = 'admin/states'
STATES_RELEASE_ASSET = 'LGD_States.geojsonl.7z'
BLOCKS_RELEASE_TAG = 'admin/blocks'
BLOCKS_RELEASE_ASSET = 'LGD_Blocks.geojsonl.7z'
PANCHAYATS_RELEASE_TAG = 'admin/panchayats'
PANCHAYATS_RELEASE_ASSET = 'LGD_Panchayats.geojsonl.7z'

GP_REST_URL = (
    'https://mapservice.gov.in/mapserviceserv176/rest/services/'
    'Panchayat/AdminGPHierarchy/MapServer/3/query'
)


def norm_code(value, width=None):
    s = str(value or '').strip()
    if not s:
        return ''
    return s.zfill(width) if width else s


def arcgis_feature_to_geojson(feature):
    attrs = feature.get('attributes', {})
    geom = feature.get('geometry', {})
    rings = geom.get('rings') or []
    if not rings:
        return None
    return {
        'type': 'Feature',
        'properties': attrs,
        'geometry': {'type': 'Polygon', 'coordinates': rings},
    }


def fetch_json(url, params=None, timeout=60, retries=2):
    last_error = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=timeout, verify=SEED_VERIFY_SSL)
            if resp.status_code == 200:
                return resp.json()
            last_error = f'HTTP {resp.status_code}'
        except Exception as e:
            last_error = e
        time.sleep(min(2 + attempt, 5))
    print(f'  WARN fetch failed: {url} ({last_error})')
    return {}


def get_cached_archive_path(tag, asset_name):
    cache_dir = Path(SEED_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{tag.replace('/', '_')}__{asset_name}"
    return cache_dir / safe_name


def download_release_archive(asset_url, dest_path):
    tmp_path = str(dest_path) + '.part'
    resp = requests.get(
        asset_url,
        headers={'Accept': 'application/octet-stream'},
        stream=True,
        timeout=120,
        verify=SEED_VERIFY_SSL,
    )
    if resp.status_code != 200:
        print(f'  WARN release download failed: HTTP {resp.status_code}')
        return False
    with open(tmp_path, 'wb') as fh:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                fh.write(chunk)
    os.replace(tmp_path, dest_path)
    return True


def get_release_asset_url(tag, asset_name):
    release = fetch_json(
        f'https://api.github.com/repos/yashveeeeeeer/india-geodata/releases/tags/{tag}',
        timeout=60,
    )
    asset = next((a for a in release.get('assets', []) if a.get('name') == asset_name), None)
    if not asset:
        print(f'  WARN release asset not found: {tag}/{asset_name}')
        return None
    return asset.get('url')


def ensure_release_asset_cached(tag, asset_name):
    archive_path = get_cached_archive_path(tag, asset_name)
    if archive_path.exists():
        return str(archive_path)
    asset_url = get_release_asset_url(tag, asset_name)
    if not asset_url:
        return None
    print(f'  Downloading release asset: {tag}/{asset_name}')
    ok = download_release_archive(asset_url, str(archive_path))
    return str(archive_path) if ok else None


def fetch_release_geojson(tag, asset_name):
    try:
        import py7zr
    except Exception as e:
        print(f'  WARN py7zr unavailable: {e}')
        return None
    archive_path = ensure_release_asset_cached(tag, asset_name)
    if not archive_path:
        return None
    with tempfile.TemporaryDirectory() as tmpdir:
        with py7zr.SevenZipFile(archive_path, mode='r') as zf:
            zf.extractall(path=tmpdir)
        for root, _, files in os.walk(tmpdir):
            for name in files:
                if name.endswith('.geojsonl'):
                    path = os.path.join(root, name)
                    features = []
                    with open(path, 'r', encoding='utf-8') as fh:
                        for line in fh:
                            line = line.strip()
                            if line:
                                features.append(json.loads(line))
                    return {'type': 'FeatureCollection', 'features': features}
    return None


def iter_release_geojsonl_features(tag, asset_name):
    try:
        import py7zr
    except Exception as e:
        print(f'  WARN py7zr unavailable: {e}')
        return
    archive_path = ensure_release_asset_cached(tag, asset_name)
    if not archive_path:
        return
    if not os.path.exists(archive_path):
        data = fetch_release_geojson(tag, asset_name)
        if not data:
            return
        for feature in data.get('features', []):
            yield feature
        return
    with tempfile.TemporaryDirectory() as tmpdir:
        with py7zr.SevenZipFile(archive_path, mode='r') as zf:
            zf.extractall(path=tmpdir)
        for root, _, files in os.walk(tmpdir):
            for name in files:
                if name.endswith('.geojsonl'):
                    path = os.path.join(root, name)
                    with open(path, 'r', encoding='utf-8') as fh:
                        for line in fh:
                            line = line.strip()
                            if line:
                                yield json.loads(line)


def fetch_district_pairs_from_nic():
    print('\n[fallback] Building district list from NIC GP layer...')
    pairs = {}
    id_data = fetch_json(
        GP_REST_URL,
        params={'where': '1=1', 'returnIdsOnly': 'true', 'f': 'pjson'},
        timeout=60,
    )
    object_ids = sorted(id_data.get('objectIds') or [])
    if not object_ids:
        print('  WARNING: no OBJECTIDs returned from NIC layer')
        return pairs

    chunk_size = 250
    for i in range(0, len(object_ids), chunk_size):
        chunk = object_ids[i:i + chunk_size]
        where_in = ','.join(str(x) for x in chunk)
        params = {
            'where': f'OBJECTID IN ({where_in})',
            'outFields': 'stcode11,dtcode11,STNAME,DTNAME',
            'returnGeometry': 'false',
            'f': 'pjson',
        }
        data = fetch_json(GP_REST_URL, params=params, timeout=60)
        feats = data.get('features', [])
        for f in feats:
            a = f.get('attributes', {})
            st = norm_code(a.get('stcode11'), 2)
            dt = norm_code(a.get('dtcode11'))
            if st and dt:
                pairs[(st, dt)] = (str(a.get('STNAME') or '').strip(), str(a.get('DTNAME') or '').strip())

        if i and i % 5000 == 0:
            print(f'  Processed OBJECTIDs: {i}/{len(object_ids)}')

    print(f'  District pairs discovered: {len(pairs)}')
    return pairs


def supabase_upsert(table, rows, conflict_cols=None):
    """Insert rows into a Supabase table. Returns number inserted."""
    if not rows:
        return 0
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    headers = dict(HEADERS)
    params = None
    if conflict_cols:
        params = {'on_conflict': ','.join(conflict_cols)}
    resp = requests.post(url, headers=headers, params=params, json=rows, timeout=30)
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
    if SEED_FAST_MODE or not SEED_SIMPLIFY_GEOMETRY:
        return geojson_geom
    try:
        geom = shape(geojson_geom)
        simplified = geom.simplify(tolerance, preserve_topology=True)
        return mapping(simplified)
    except Exception:
        return geojson_geom


def get_centroid(geojson_geom):
    """Return (lat, lng) centroid of a GeoJSON geometry."""
    if SEED_FAST_MODE or not SEED_COMPUTE_CENTROID:
        return None, None
    try:
        geom = shape(geojson_geom)
        c = geom.centroid
        return round(c.y, 6), round(c.x, 6)
    except Exception:
        return None, None


# ── Step 1: Seed all states from district GeoJSON ──────────────────────────

def seed_states_from_districts(districts_geojson, nic_pairs=None):
    print('\n[1/4] Seeding all states...')
    by_code = {}
    if districts_geojson:
        for feat in districts_geojson.get('features', []):
            p = feat.get('properties', {})
            st_code = norm_code(p.get('st_code') or p.get('stcode11') or p.get('ST_CEN_CD'), width=2)
            st_name = str(p.get('stname') or p.get('state_name') or p.get('STATE_NAME') or p.get('NAME_1') or p.get('state') or '').strip()
            if st_code and st_name:
                by_code[st_code] = st_name.title()
    elif nic_pairs:
        for (st_code, _), (st_name, _) in nic_pairs.items():
            by_code[st_code] = (st_name or f'State {st_code}').title()

    rows = [{'name': n, 'census_code': c, 'lgd_code': c} for c, n in sorted(by_code.items())]
    inserted = 0
    for i in range(0, len(rows), 100):
        inserted += supabase_upsert('geo_states', rows[i:i + 100], ['census_code'])
    print(f'  Inserted/updated {inserted} states')

    states = supabase_select('geo_states', select='id,census_code')
    state_id_map = {norm_code(s.get('census_code'), 2): s.get('id') for s in states}
    if not state_id_map:
        print('  ERROR: state table empty after upsert')
        sys.exit(1)
    return state_id_map


# ── Step 2: Seed districts from GeoJSON ─────────────────────

def fetch_districts_geojson():
    print('\n[2/4] Fetching district boundaries...')
    rel = fetch_release_geojson(DISTRICTS_RELEASE_TAG, DISTRICTS_RELEASE_ASSET)
    if rel and rel.get('features'):
        print(f"  Got {len(rel['features'])} district features from release asset")
        return rel
    for url in [DISTRICTS_GEOJSON_URL, DISTRICTS_FALLBACK_URL]:
        try:
            print(f'  Trying {url}')
            data = fetch_json(url, timeout=60)
            if data and data.get('features'):
                print(f'  Got {len(data["features"])} district features')
                return data
        except Exception as e:
            print(f'  Failed: {e}')
    print('  WARNING: district GeoJSON unavailable, switching to NIC fallback')
    return None


def seed_districts(state_id_map, districts_geojson, nic_pairs=None, selected_districts=None):
    print('\n[2/4] Seeding all district boundaries...')
    features = districts_geojson.get('features', []) if districts_geojson else []
    print(f'  Found {len(features)} district features')

    rows = []
    for feat in features:
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
        census_code = norm_code(props.get('dt_code') or props.get('dtcode11') or props.get('DT_CEN_CD'))
        state_census_code = norm_code(props.get('st_code') or props.get('stcode11') or props.get('ST_CEN_CD'), 2)
        if selected_districts and (state_census_code, census_code) not in selected_districts:
            continue
        state_id = state_id_map.get(state_census_code)
        if not census_code or not state_census_code or not state_id:
            continue

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
        n = supabase_upsert('geo_districts', batch, ['census_code', 'state_census_code'])
        inserted += n
        print(f'  Inserted districts batch {i // 50 + 1}: {n} rows')
        time.sleep(0.3)

    print(f'  Total districts inserted: {inserted}')

    if inserted == 0 and nic_pairs:
        fallback_rows = []
        for (st_code, dt_code), (_, dt_name) in nic_pairs.items():
            state_id = state_id_map.get(st_code)
            if not state_id:
                continue
            fallback_rows.append({
                'name': (dt_name or f'District {dt_code}').title(),
                'state_id': state_id,
                'census_code': dt_code,
                'state_census_code': st_code,
                'lgd_code': dt_code,
            })
        fallback_inserted = 0
        for i in range(0, len(fallback_rows), 100):
            fallback_inserted += supabase_upsert(
                'geo_districts',
                fallback_rows[i:i + 100],
                ['census_code', 'state_census_code'],
            )
        print(f'  Fallback inserted/updated {fallback_inserted} districts')


# ── Step 3: Fetch district GPs from ArcGIS REST ─────────────

def fetch_gps_for_district(district_code, state_code):
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
            'f': 'pjson',
            'returnGeometry': 'true',
            'resultOffset': offset,
            'resultRecordCount': page_size,
            'outSR': '4326',
        }
        try:
            data = fetch_json(GP_REST_URL, params=params, timeout=60)
            if data.get('error'):
                print(f"  Query error at offset {offset}: {data.get('error', {}).get('message')}")
                break
            raw_features = data.get('features', [])
            features = [arcgis_feature_to_geojson(f) for f in raw_features]
            features = [f for f in features if f]
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


def seed_blocks_and_gps(district_census_code, state_census_code, gp_features):
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
                'state_census_code': state_census_code,
                'district_census_code': district_census_code,
                'boundary_geojson': simplified,
                'centroid_lat': centroid_lat,
                'centroid_lng': centroid_lng,
            })

        # Insert blocks
        inserted_blocks = 0
        for i in range(0, len(block_rows), 50):
            batch = block_rows[i:i + 50]
            n = supabase_upsert('geo_blocks', batch, ['census_code', 'district_census_code'])
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
            'state_census_code': state_census_code,
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
        n = supabase_upsert('geo_gram_panchayats', batch, ['census_code'])
        inserted_gps += n
        if i % 1000 == 0:
            print(f'  GP progress: {i}/{len(gp_rows)}...')
        time.sleep(0.1)

    print(f'  Inserted {inserted_gps} gram panchayats')


def seed_blocks_from_release(district_id_map, selected_districts=None):
    print('\n[3/4] Seeding blocks from release asset...')
    rows = []
    inserted = 0
    seen = 0
    for feat in iter_release_geojsonl_features(BLOCKS_RELEASE_TAG, BLOCKS_RELEASE_ASSET):
        seen += 1
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        st_code = norm_code(props.get('stcode11') or props.get('state_lgd'), 2)
        dt_code = norm_code(props.get('dtcode11') or props.get('dist_lgd'))
        if selected_districts and (st_code, dt_code) not in selected_districts:
            continue
        block_code = norm_code(props.get('block_lgd') or props.get('blkcode11'))
        district_id = district_id_map.get((st_code, dt_code))
        if not (geom and st_code and dt_code and block_code and district_id):
            continue
        centroid_lat, centroid_lng = get_centroid(geom)
        rows.append({
            'name': str(props.get('block_name') or props.get('block') or 'Unknown').strip().title(),
            'district_id': district_id,
            'census_code': block_code,
            'state_census_code': st_code,
            'district_census_code': dt_code,
            'boundary_geojson': simplify_geometry(geom, 0.003),
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })
        if len(rows) >= SEED_BATCH_SIZE_SMALL:
            inserted += supabase_upsert(
                'geo_blocks',
                rows,
                ['census_code', 'district_census_code'],
            )
            rows = []
        if seen % 500 == 0:
            print(f'  Block scan progress: {seen}')
    if rows:
        inserted += supabase_upsert(
            'geo_blocks',
            rows,
            ['census_code', 'district_census_code'],
        )
    print(f'  Inserted/updated {inserted} blocks')


def seed_panchayats_from_release(district_id_map, selected_districts=None):
    print('\n[3/4] Seeding gram panchayats from release asset...')
    block_rows = supabase_select('geo_blocks', select='id,census_code,state_census_code,district_census_code')
    block_id_map = {(b.get('state_census_code'), b.get('district_census_code'), b.get('census_code')): b.get('id') for b in block_rows}
    rows = []
    inserted = 0
    seen = 0
    for feat in iter_release_geojsonl_features(PANCHAYATS_RELEASE_TAG, PANCHAYATS_RELEASE_ASSET):
        seen += 1
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        st_code = norm_code(props.get('stcode11') or props.get('state_lgd'), 2)
        dt_code = norm_code(props.get('dtcode11') or props.get('dt_lgd'))
        if selected_districts and (st_code, dt_code) not in selected_districts:
            continue
        block_code = norm_code(props.get('blklgdcode') or props.get('blk_lgdcod') or props.get('block_lgd'))
        gp_code = norm_code(props.get('gpcode') or props.get('gp_code'))
        district_id = district_id_map.get((st_code, dt_code))
        block_id = block_id_map.get((st_code, dt_code, block_code))
        if not (geom and gp_code and district_id):
            continue
        centroid_lat, centroid_lng = get_centroid(geom)
        rows.append({
            'name': str(props.get('gpname') or props.get('gp_name') or props.get('b_pan_name') or 'Unknown').strip().title(),
            'block_id': block_id,
            'district_id': district_id,
            'census_code': gp_code,
            'state_census_code': st_code,
            'district_census_code': dt_code,
            'block_census_code': block_code,
            'boundary_geojson': simplify_geometry(geom, 0.001),
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })
        if len(rows) >= SEED_BATCH_SIZE_GP:
            inserted += supabase_upsert(
                'geo_gram_panchayats',
                rows,
                ['census_code'],
            )
            rows = []
        if seen % 2000 == 0:
            print(f'  Panchayat scan progress: {seen}')
    if rows:
        inserted += supabase_upsert(
            'geo_gram_panchayats',
            rows,
            ['census_code'],
        )
    print(f'  Inserted/updated {inserted} gram panchayats')


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


def collect_district_pairs(districts_geojson, nic_pairs=None):
    pairs = set()
    if districts_geojson:
        for feat in districts_geojson.get('features', []):
            p = feat.get('properties', {})
            st_code = norm_code(p.get('st_code') or p.get('stcode11') or p.get('ST_CEN_CD'), 2)
            dt_code = norm_code(p.get('dt_code') or p.get('dtcode11') or p.get('DT_CEN_CD'))
            if st_code and dt_code:
                pairs.add((st_code, dt_code))
    elif nic_pairs:
        pairs = set(nic_pairs.keys())
    ordered = sorted(pairs)
    if SEED_DISTRICT_OFFSET:
        ordered = ordered[SEED_DISTRICT_OFFSET:]
    if SEED_MAX_DISTRICTS > 0:
        ordered = ordered[:SEED_MAX_DISTRICTS]
    return ordered


def build_selected_district_set(districts_geojson, nic_pairs=None):
    pairs = collect_district_pairs(districts_geojson, nic_pairs)
    return set(pairs)


# ── Main ─────────────────────────────────────────────────────

def main():
    print('=' * 60)
    print('GramWasteConnect Geographic Boundary Seeder')
    print('Scope: India-wide states, districts, blocks, gram panchayats')
    print('=' * 60)
    districts_geojson = fetch_districts_geojson()
    nic_pairs = None
    if not districts_geojson:
        nic_pairs = fetch_district_pairs_from_nic()
    blocks_asset = ensure_release_asset_cached(BLOCKS_RELEASE_TAG, BLOCKS_RELEASE_ASSET) if SEED_INCLUDE_BLOCKS else None
    panchayats_asset = ensure_release_asset_cached(PANCHAYATS_RELEASE_TAG, PANCHAYATS_RELEASE_ASSET) if SEED_INCLUDE_PANCHAYATS else None

    selected_districts = build_selected_district_set(districts_geojson, nic_pairs)
    print(f'  Selected district pairs for this run: {len(selected_districts)}')
    state_id_map = seed_states_from_districts(districts_geojson, nic_pairs)
    seed_districts(state_id_map, districts_geojson, nic_pairs, selected_districts)
    district_rows = supabase_select('geo_districts', select='id,census_code,state_census_code')
    district_id_map = {(d.get('state_census_code'), d.get('census_code')): d.get('id') for d in district_rows}

    if SEED_INCLUDE_BLOCKS and blocks_asset:
        seed_blocks_from_release(district_id_map, selected_districts)
    if SEED_INCLUDE_PANCHAYATS and panchayats_asset:
        seed_panchayats_from_release(district_id_map, selected_districts)
    needs_block_fallback = SEED_INCLUDE_BLOCKS and not blocks_asset
    needs_gp_fallback = SEED_INCLUDE_PANCHAYATS and not panchayats_asset
    if needs_block_fallback or needs_gp_fallback:
        district_pairs = collect_district_pairs(districts_geojson, nic_pairs)
        print(f'\n[3/4] Fallback GP fetch for {len(district_pairs)} districts...')
        for idx, (state_code, district_code) in enumerate(district_pairs, start=1):
            print(f'\n  District {idx}/{len(district_pairs)}: state={state_code} district={district_code}')
            gp_features = fetch_gps_for_district(district_code, state_code)
            seed_blocks_and_gps(district_code, state_code, gp_features)
            time.sleep(SEED_DISTRICT_SLEEP_SEC)

    if SEED_UPDATE_DEMO_VILLAGE:
        update_demo_village()

    print('\n' + '=' * 60)
    print('Seeding complete.')
    print('Tables populated: geo_states, geo_districts, geo_blocks,')
    print('                  geo_gram_panchayats')
    print('=' * 60)


if __name__ == '__main__':
    main()
