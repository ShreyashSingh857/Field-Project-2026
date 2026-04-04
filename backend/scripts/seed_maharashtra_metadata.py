#!/usr/bin/env python3
"""
GramWasteConnect — Geographic Boundary Seeder (Metadata-Only, Client-Side Geometry)
Loads ONLY Maharashtra (state 27) metadata into database.
Exports all geometries to backend/public/geo/ for client-side rendering.

Usage:
  python backend/scripts/seed_maharashtra_metadata.py

Environment:
  SEED_STATE_CODE=27 (default)
  SEED_FAST_MODE=1 (recommended)
  SEED_VERIFY_SSL=1
"""

import os
import sys
import tempfile
import json
import time
import shutil
from pathlib import Path

import geopandas as gpd
import requests
from dotenv import load_dotenv
from shapely.geometry import mapping, shape

# Load .env from backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

# ── Constants ────────────────────────────────────────────────
SEED_STATE_CODE = os.getenv('SEED_STATE_CODE', '27').zfill(2)  # Maharashtra
SEED_VERIFY_SSL = os.getenv('SEED_VERIFY_SSL', '1') != '0'
SEED_CACHE_DIR = os.getenv(
    'SEED_CACHE_DIR',
    str(Path(__file__).resolve().parents[1] / 'data' / 'geo-cache'),
)
SEED_BATCH_SIZE_SMALL = int(os.getenv('SEED_BATCH_SIZE_SMALL', '150'))
SEED_BATCH_SIZE_GP = int(os.getenv('SEED_BATCH_SIZE_GP', '250'))

GEO_EXPORT_DIR = str(Path(__file__).resolve().parents[1] / 'public' / 'geo')

DISTRICTS_RELEASE_TAG = 'admin/districts'
DISTRICTS_RELEASE_ASSET = 'LGD_Districts.geojsonl.7z'
STATES_RELEASE_TAG = 'admin/states'
STATES_RELEASE_ASSET = 'LGD_States.geojsonl.7z'
BLOCKS_RELEASE_TAG = 'admin/blocks'
BLOCKS_RELEASE_ASSET = 'LGD_Blocks.geojsonl.7z'
PANCHAYATS_RELEASE_TAG = 'admin/panchayats'
PANCHAYATS_RELEASE_ASSET = 'LGD_Panchayats.geojsonl.7z'


def norm_code(value, width=None):
    s = str(value or '').strip()
    if not s:
        return ''
    return s.zfill(width) if width else s


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


def iter_release_geojsonl_features(tag, asset_name):
    try:
        import py7zr
    except Exception as e:
        print(f'  WARN py7zr unavailable: {e}')
        return
    archive_path = ensure_release_asset_cached(tag, asset_name)
    if not archive_path:
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


def get_centroid(geojson_geom):
    """Return (lat, lng) centroid of a GeoJSON geometry."""
    try:
        geom = shape(geojson_geom)
        c = geom.centroid
        return round(c.y, 6), round(c.x, 6)
    except Exception:
        return None, None


def simplify_geometry(geojson_geom, tolerance=0.01):
    """Simplify for file storage."""
    try:
        geom = shape(geojson_geom)
        simplified = geom.simplify(tolerance, preserve_topology=True)
        return mapping(simplified)
    except Exception:
        return geojson_geom


def export_geometry_to_file(st_code, dt_code, blk_code, gp_code, geom):
    """Export geometry to backend/public/geo/ hierarchy."""
    if not geom:
        return
    Path(GEO_EXPORT_DIR).mkdir(parents=True, exist_ok=True)
    
    if gp_code:
        # state/district/block/gp_code.geojson
        path = Path(GEO_EXPORT_DIR) / st_code / dt_code / blk_code / f"{gp_code}.geojson"
    elif blk_code:
        # state/district/block_code.geojson
        path = Path(GEO_EXPORT_DIR) / st_code / dt_code / f"{blk_code}.geojson"
    elif dt_code:
        # state/district_code.geojson
        path = Path(GEO_EXPORT_DIR) / st_code / f"{dt_code}.geojson"
    else:
        # state/state_code.geojson
        path = Path(GEO_EXPORT_DIR) / f"{st_code}.geojson"
    
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({
            'type': 'Feature',
            'geometry': simplify_geometry(geom, tolerance=0.001),
            'properties': {
                'state_code': st_code,
                'district_code': dt_code,
                'block_code': blk_code,
                'gp_code': gp_code,
            }
        }, f)


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


def supabase_delete(table, query):
    url = f'{SUPABASE_URL}/rest/v1/{table}?{query}'
    resp = requests.delete(url, headers=HEADERS, timeout=30)
    return resp.status_code in (200, 204)


def supabase_patch(table, query, payload):
    url = f'{SUPABASE_URL}/rest/v1/{table}?{query}'
    resp = requests.patch(url, headers=HEADERS, json=payload, timeout=30)
    return resp.status_code in (200, 204)


def dedupe_rows(rows, key_fields):
    unique = {}
    for row in rows:
        key = tuple(row.get(k) for k in key_fields)
        unique[key] = row
    return list(unique.values())


def enforce_maharashtra_only_metadata():
    print('\n[0/4] Enforcing Maharashtra-only metadata in DB...')
    supabase_delete('geo_gram_panchayats', f'state_census_code=neq.{SEED_STATE_CODE}')
    supabase_delete('geo_blocks', f'state_census_code=neq.{SEED_STATE_CODE}')
    supabase_delete('geo_districts', f'state_census_code=neq.{SEED_STATE_CODE}')
    supabase_delete('geo_states', f'census_code=neq.{SEED_STATE_CODE}')
    supabase_patch('geo_gram_panchayats', f'state_census_code=eq.{SEED_STATE_CODE}&boundary_geojson=not.is.null', {'boundary_geojson': None})
    supabase_patch('geo_blocks', f'state_census_code=eq.{SEED_STATE_CODE}&boundary_geojson=not.is.null', {'boundary_geojson': None})
    supabase_patch('geo_districts', f'state_census_code=eq.{SEED_STATE_CODE}&boundary_geojson=not.is.null', {'boundary_geojson': None})
    supabase_patch('geo_states', f'census_code=eq.{SEED_STATE_CODE}&boundary_geojson=not.is.null', {'boundary_geojson': None})


def reset_geometry_export_dir():
    base = Path(GEO_EXPORT_DIR)
    if base.exists():
        shutil.rmtree(base)
    base.mkdir(parents=True, exist_ok=True)


# ── Main seeding functions ──────────────────────────────────

def seed_maharashtra():
    print('=' * 60)
    print('Maharashtra Metadata + Client-Side Geometry Seeder')
    print('=' * 60)
    enforce_maharashtra_only_metadata()
    reset_geometry_export_dir()
    
    # Fetch state
    print(f'\n[1/4] Seeding state {SEED_STATE_CODE}...')
    rows = [{'name': 'Maharashtra', 'census_code': SEED_STATE_CODE, 'lgd_code': SEED_STATE_CODE}]
    supabase_upsert('geo_states', rows, ['census_code'])
    
    states = supabase_select('geo_states', select='id,census_code')
    state_id_map = {s.get('census_code'): s.get('id') for s in states}
    state_id = state_id_map.get(SEED_STATE_CODE)
    if not state_id:
        print('  ERROR: Maharashtra state insert failed')
        return
    print(f'  State ID: {state_id}')
    
    # Fetch districts for Maharashtra
    print(f'\n[2/4] Fetching districts for state {SEED_STATE_CODE}...')
    districts_rows = []
    districts_by_code = {}
    scanned = 0
    
    for feat in iter_release_geojsonl_features(DISTRICTS_RELEASE_TAG, DISTRICTS_RELEASE_ASSET):
        scanned += 1
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        st_code = norm_code(props.get('st_code') or props.get('stcode11') or props.get('ST_CEN_CD'), 2)
        
        if st_code != SEED_STATE_CODE:
            continue
        
        dt_code = norm_code(props.get('dt_code') or props.get('dtcode11'))
        name = str(props.get('dtname') or props.get('NAME_2') or 'Unknown').strip().title()
        
        if not (geom and dt_code):
            continue
        
        centroid_lat, centroid_lng = get_centroid(geom)
        
        # Metadata only (no geometry in DB)
        districts_rows.append({
            'name': name,
            'state_id': state_id,
            'census_code': dt_code,
            'state_census_code': st_code,
            'lgd_code': dt_code,
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })
        
        # Export geometry to file
        export_geometry_to_file(st_code, dt_code, None, None, geom)
        districts_by_code[dt_code] = True
    
    # Insert districts
    inserted = 0
    for i in range(0, len(districts_rows), 50):
        batch = districts_rows[i:i + 50]
        inserted += supabase_upsert('geo_districts', batch, ['census_code', 'state_census_code'])
    print(f'  Inserted {inserted} districts, exported geometries')
    
    # Get district IDs
    db_districts = supabase_select('geo_districts', select='id,census_code,state_census_code')
    district_id_map = {d.get('census_code'): d.get('id') for d in db_districts}
    
    # Seed blocks
    print(f'\n[3/4] Seeding blocks...')
    blocks_rows = []
    blocks_scanned = 0
    
    for feat in iter_release_geojsonl_features(BLOCKS_RELEASE_TAG, BLOCKS_RELEASE_ASSET):
        blocks_scanned += 1
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        st_code = norm_code(props.get('stcode11') or props.get('state_lgd'), 2)
        dt_code = norm_code(props.get('dtcode11') or props.get('dist_lgd'))
        
        if st_code != SEED_STATE_CODE or dt_code not in districts_by_code:
            continue
        
        blk_code = norm_code(props.get('block_lgd') or props.get('blkcode11'))
        district_id = district_id_map.get(dt_code)
        
        if not (geom and blk_code and district_id):
            continue
        
        centroid_lat, centroid_lng = get_centroid(geom)
        
        blocks_rows.append({
            'name': str(props.get('block_name') or props.get('block') or 'Unknown').strip().title(),
            'district_id': district_id,
            'census_code': blk_code,
            'state_census_code': st_code,
            'district_census_code': dt_code,
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })
        
        # Export geometry
        export_geometry_to_file(st_code, dt_code, blk_code, None, geom)
        
        if len(blocks_rows) >= SEED_BATCH_SIZE_SMALL:
            supabase_upsert('geo_blocks', blocks_rows, ['census_code', 'district_census_code'])
            blocks_rows = []
        
        if blocks_scanned % 500 == 0:
            print(f'  Block scan progress: {blocks_scanned}')
    
    if blocks_rows:
        supabase_upsert('geo_blocks', blocks_rows, ['census_code', 'district_census_code'])
    
    print(f'  Blocks exported to files')
    
    # Get block IDs
    db_blocks = supabase_select('geo_blocks', select='id,census_code,state_census_code,district_census_code')
    block_id_map = {(b.get('state_census_code'), b.get('district_census_code'), b.get('census_code')): b.get('id') for b in db_blocks}
    
    # Seed panchayats
    print(f'\n[4/4] Seeding panchayats...')
    gps_rows = []
    gps_scanned = 0
    
    for feat in iter_release_geojsonl_features(PANCHAYATS_RELEASE_TAG, PANCHAYATS_RELEASE_ASSET):
        gps_scanned += 1
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        st_code = norm_code(props.get('stcode11') or props.get('state_lgd'), 2)
        dt_code = norm_code(props.get('dtcode11') or props.get('dt_lgd'))
        
        if st_code != SEED_STATE_CODE or dt_code not in districts_by_code:
            continue
        
        blk_code = norm_code(props.get('blklgdcode') or props.get('blk_lgdcod') or props.get('block_lgd'))
        gp_code = norm_code(props.get('gpcode') or props.get('gp_code'))
        district_id = district_id_map.get(dt_code)
        block_id = block_id_map.get((st_code, dt_code, blk_code))
        
        if not (geom and gp_code and district_id):
            continue
        
        centroid_lat, centroid_lng = get_centroid(geom)
        
        composite_gp_code = f'{st_code}{dt_code}{blk_code}{gp_code}'
        gps_rows.append({
            'name': str(props.get('gpname') or props.get('gp_name') or 'Unknown').strip().title(),
            'block_id': block_id,
            'district_id': district_id,
            'census_code': composite_gp_code,
            'state_census_code': st_code,
            'district_census_code': dt_code,
            'block_census_code': blk_code,
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
        })
        
        # Export geometry
        export_geometry_to_file(st_code, dt_code, blk_code, gp_code, geom)
        
        if len(gps_rows) >= SEED_BATCH_SIZE_GP:
            batch = dedupe_rows(gps_rows, ['census_code'])
            supabase_upsert('geo_gram_panchayats', batch, ['census_code'])
            gps_rows = []
        
        if gps_scanned % 2000 == 0:
            print(f'  Panchayat scan progress: {gps_scanned}')
    
    if gps_rows:
        batch = dedupe_rows(gps_rows, ['census_code'])
        supabase_upsert('geo_gram_panchayats', batch, ['census_code'])
    
    print(f'  Panchayats exported to files')
    
    print('\n' + '=' * 60)
    print('Maharashtra metadata + geometry export complete.')
    print(f'Geometries exported to: {GEO_EXPORT_DIR}')
    print('=' * 60)


if __name__ == '__main__':
    seed_maharashtra()
