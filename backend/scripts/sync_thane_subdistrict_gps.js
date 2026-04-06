import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const OVERPASS_LIST = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const UA = 'GramWasteConnect/1.0';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function toFeature(el) {
  const name = el.tags?.['name:en'] || el.tags?.name;
  if (!name) return null;
  const code = String(el.tags?.['ref:lgd'] || el.tags?.ref || el.id);
  const rings = [];
  for (const m of el.members || []) {
    if (m.role === 'outer' && m.geometry?.length) {
      const r = m.geometry.map((p) => [p.lon, p.lat]);
      if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]);
      rings.push(r);
    }
  }
  if (el.type === 'way' && el.geometry?.length) {
    const r = el.geometry.map((p) => [p.lon, p.lat]);
    if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]);
    rings.push(r);
  }
  if (!rings.length) return null;
  const geometry = rings.length === 1 ? { type: 'Polygon', coordinates: rings } : { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) };
  return { name, code, geometry, sourceType: el.type };
}

function centroid(geometry) {
  const pts = [];
  if (geometry.type === 'Polygon') geometry.coordinates.forEach((r) => r.forEach((p) => pts.push(p)));
  if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach((poly) => poly.forEach((r) => r.forEach((p) => pts.push(p))));
  const n = Math.max(pts.length, 1);
  return { lat: pts.reduce((a, p) => a + p[1], 0) / n, lng: pts.reduce((a, p) => a + p[0], 0) / n };
}

async function fetchChildren(parentRelId, lvl) {
  const areaId = 3600000000 + Number(parentRelId);
  const q = `[out:json][timeout:90];area(${areaId})->.a;(relation(area.a)["admin_level"="${lvl}"]["boundary"="administrative"];way(area.a)["admin_level"="${lvl}"]["boundary"="administrative"];);out geom;`;
  for (const ep of OVERPASS_LIST) {
    for (let i = 0; i < 3; i++) {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: `data=${encodeURIComponent(q)}` });
      if (r.ok) {
        const j = await r.json();
        return (j.elements || []).map(toFeature).filter(Boolean);
      }
    }
  }
  throw new Error('Overpass failed after retries');
}

async function run() {
  const { data: district } = await s.from('geo_districts').select('id,census_code,state_census_code').eq('name', 'Thane').single();
  const { data: block } = await s.from('geo_blocks').select('id,census_code').eq('name', 'Thane').eq('district_id', district.id).single();

  let kids = await fetchChildren('10351344', '9');
  if (!kids.length) kids = await fetchChildren('10351344', '10');
  if (!kids.length) kids = await fetchChildren('10351344', '8');

  kids.sort((a, b) => (a.sourceType === 'relation' ? -1 : 1) - (b.sourceType === 'relation' ? -1 : 1));
  const seen = new Set();
  let upserted = 0;
  for (const k of kids) {
    const key = `${k.name}|${k.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const c = centroid(k.geometry);
    const payload = {
      name: k.name,
      block_id: block.id,
      district_id: district.id,
      census_code: k.code,
      state_census_code: district.state_census_code || '27',
      district_census_code: district.census_code,
      block_census_code: block.census_code,
      boundary_geojson: k.geometry,
      centroid_lat: c.lat,
      centroid_lng: c.lng,
    };

    const { data: ex } = await s.from('geo_gram_panchayats').select('id').eq('block_id', block.id).eq('name', k.name).maybeSingle();
    if (ex?.id) await s.from('geo_gram_panchayats').update(payload).eq('id', ex.id);
    else await s.from('geo_gram_panchayats').insert(payload);

    const feature = { type: 'Feature', properties: { name: k.name, lgd_code: k.code, level: 'gp' }, geometry: k.geometry };
    const rel = `27/${district.census_code}/${block.census_code}/${k.code}.geojson`;
    const local = path.join('public', 'geo', ...rel.split('/'));
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, JSON.stringify(feature));
    await s.storage.from('geo').upload(rel, Buffer.from(JSON.stringify(feature)), { contentType: 'application/geo+json', upsert: true });
    upserted += 1;
  }

  console.log(JSON.stringify({ fetched: kids.length, upserted }, null, 2));
}

run().catch((e) => { console.error(e.message); process.exit(1); });
