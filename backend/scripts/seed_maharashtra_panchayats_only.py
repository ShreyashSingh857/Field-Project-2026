#!/usr/bin/env python3
import os
from seed_maharashtra_metadata import (
    SEED_STATE_CODE,
    SEED_BATCH_SIZE_GP,
    norm_code,
    get_centroid,
    export_geometry_to_file,
    supabase_select,
    supabase_upsert,
    dedupe_rows,
    iter_release_geojsonl_features,
    PANCHAYATS_RELEASE_TAG,
    PANCHAYATS_RELEASE_ASSET,
)


def main():
    print('=' * 60)
    print('Maharashtra Panchayat Metadata Seeder (Only)')
    print('=' * 60)

    district_rows = supabase_select('geo_districts', select='id,census_code,state_census_code')
    district_id_map = {
        d.get('census_code'): d.get('id')
        for d in district_rows
        if d.get('state_census_code') == SEED_STATE_CODE
    }
    block_rows = supabase_select('geo_blocks', select='id,census_code,state_census_code,district_census_code')
    block_id_map = {
        (b.get('state_census_code'), b.get('district_census_code'), b.get('census_code')): b.get('id')
        for b in block_rows
        if b.get('state_census_code') == SEED_STATE_CODE
    }
    district_codes = set(district_id_map.keys())

    print(f'  Districts: {len(district_codes)} | Blocks: {len(block_rows)}')
    print('\n[1/1] Seeding Maharashtra panchayats...')

    rows = []
    scanned = 0
    inserted = 0

    def flush_rows(buffer):
        nonlocal inserted
        if not buffer:
            return []
        batch = dedupe_rows(buffer, ['census_code'])
        for r in batch:
            export_geometry_to_file(
                r['state_census_code'],
                r['district_census_code'],
                r['block_census_code'] or 'NA',
                r['census_code'],
                r['_geom'],
            )
        upsert_rows = []
        for r in batch:
            item = dict(r)
            item.pop('_geom', None)
            upsert_rows.append(item)
        inserted += supabase_upsert('geo_gram_panchayats', upsert_rows, ['census_code'])
        return []

    for feat in iter_release_geojsonl_features(PANCHAYATS_RELEASE_TAG, PANCHAYATS_RELEASE_ASSET):
        scanned += 1
        props = feat.get('properties', {})
        geom = feat.get('geometry')
        st_code = norm_code(props.get('stcode11') or props.get('state_lgd'), 2)
        dt_code = norm_code(props.get('dtcode11') or props.get('dt_lgd'))
        if st_code != SEED_STATE_CODE or dt_code not in district_codes:
            continue

        blk_code = norm_code(props.get('blklgdcode') or props.get('blk_lgdcod') or props.get('block_lgd'))
        gp_code = norm_code(props.get('gpcode') or props.get('gp_code'))
        district_id = district_id_map.get(dt_code)
        block_id = block_id_map.get((st_code, dt_code, blk_code))
        if not (geom and gp_code and district_id):
            continue

        centroid_lat, centroid_lng = get_centroid(geom)
        composite_gp_code = f'{st_code}{dt_code}{blk_code}{gp_code}'
        rows.append({
            'name': str(props.get('gpname') or props.get('gp_name') or 'Unknown').strip().title(),
            'block_id': block_id,
            'district_id': district_id,
            'census_code': composite_gp_code,
            'state_census_code': st_code,
            'district_census_code': dt_code,
            'block_census_code': blk_code,
            'centroid_lat': centroid_lat,
            'centroid_lng': centroid_lng,
            '_geom': geom,
        })

        if len(rows) >= SEED_BATCH_SIZE_GP:
            rows = flush_rows(rows)
        if scanned % 2000 == 0:
            print(f'  Panchayat scan progress: {scanned} | inserted so far: {inserted}')

    rows = flush_rows(rows)

    print(f'\nInserted/updated Maharashtra panchayats: {inserted}')


if __name__ == '__main__':
    main()
