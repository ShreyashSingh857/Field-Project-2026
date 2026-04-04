#!/usr/bin/env python3
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from backend.scripts import seed_geo_boundaries as seed

CHUNK_SIZE = int(os.getenv('SEED_CHUNK_SIZE', '25'))
MAX_MINUTES = int(os.getenv('SEED_MAX_MINUTES', '55'))
START_OFFSET = int(os.getenv('SEED_START_OFFSET', '0'))
INCLUDE_BLOCKS = os.getenv('SEED_INCLUDE_BLOCKS', '1')
INCLUDE_PANCHAYATS = os.getenv('SEED_INCLUDE_PANCHAYATS', '0')
FAST_MODE = os.getenv('SEED_FAST_MODE', '1')
SIMPLIFY = os.getenv('SEED_SIMPLIFY_GEOMETRY', '0')
CENTROID = os.getenv('SEED_COMPUTE_CENTROID', '0')
UPDATE_DEMO = os.getenv('SEED_UPDATE_DEMO_VILLAGE', '0')


def total_districts():
    geo = seed.fetch_districts_geojson()
    pairs = seed.collect_district_pairs(geo, None)
    return len(pairs)


def run_chunk(offset):
    env = os.environ.copy()
    env['SEED_DISTRICT_OFFSET'] = str(offset)
    env['SEED_MAX_DISTRICTS'] = str(CHUNK_SIZE)
    env['SEED_INCLUDE_BLOCKS'] = INCLUDE_BLOCKS
    env['SEED_INCLUDE_PANCHAYATS'] = INCLUDE_PANCHAYATS
    env['SEED_FAST_MODE'] = FAST_MODE
    env['SEED_SIMPLIFY_GEOMETRY'] = SIMPLIFY
    env['SEED_COMPUTE_CENTROID'] = CENTROID
    env['SEED_UPDATE_DEMO_VILLAGE'] = UPDATE_DEMO
    cmd = [sys.executable, os.path.join(os.path.dirname(__file__), 'seed_geo_boundaries.py')]
    return subprocess.call(cmd, env=env)


def main():
    total = total_districts()
    if total <= 0:
        print('No districts discovered; aborting.')
        sys.exit(1)
    deadline = time.time() + (MAX_MINUTES * 60)
    offset = START_OFFSET
    print(f'Total districts: {total}, chunk size: {CHUNK_SIZE}, max minutes: {MAX_MINUTES}')
    while offset < total and time.time() < deadline:
        print(f'\nRunning chunk at offset {offset} ...')
        rc = run_chunk(offset)
        if rc != 0:
            print(f'Chunk failed at offset {offset} with code {rc}')
            sys.exit(rc)
        offset += CHUNK_SIZE
    print(f'Finished at offset {offset} / {total}')


if __name__ == '__main__':
    main()
