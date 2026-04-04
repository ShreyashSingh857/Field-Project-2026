/**
 * lgdBoundaryService.js
 *
 * Fetches real administrative boundary polygons using:
 * - Nominatim (OpenStreetMap) for individual jurisdiction boundaries
 * - Overpass API for listing child admin areas within a parent
 *
 * Data is cached to disk to minimise external API calls.
 *
 * India OSM admin levels (Maharashtra):
 *   4 → State  |  5 → District  |  6 → Taluka/Block  |  9/10 → GP/Village
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../../data/boundary-cache');

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OVERPASS  = 'https://overpass-api.de/api/interpreter';
const UA        = 'GramWasteConnect/1.0 (field-project; contact@gramwaste.local)';

// ── Cache helpers ─────────────────────────────────────────────────────────────

function cacheFile(key) {
  return join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.json`);
}

async function withCache(key, fn) {
  const file = cacheFile(key);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch {}
  }
  const result = await fn();
  if (result !== null && result !== undefined) {
    writeFileSync(file, JSON.stringify(result, null, 0));
  }
  return result;
}

// ── Nominatim: fetch single boundary GeoJSON Feature ─────────────────────────

export async function fetchNominatimBoundary(searchQuery) {
  return withCache(`nominatim_${searchQuery}`, async () => {
    const url =
      `${NOMINATIM}/search?q=${encodeURIComponent(searchQuery)}` +
      `&polygon_geojson=1&format=geojson&limit=5&addressdetails=0`;

    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;

    const data = await res.json();
    const feature = (data.features || []).find(
      f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
    );
    return feature || null;
  });
}

// ── Overpass: convert relation element (with geometry) to GeoJSON Feature ─────

function overpassToFeature(el) {
  const name = el.tags?.['name:en'] || el.tags?.name || `Area ${el.id}`;
  const props = {
    name,
    osm_id:      el.id,
    admin_level: el.tags?.admin_level,
    lgd_code:    el.tags?.['ref:lgd'] || el.tags?.ref || null,
  };

  // Build polygon rings from outer members (relations)
  const outerRings = [];
  for (const m of el.members || []) {
    if (m.role === 'outer' && m.geometry?.length) {
      const ring = m.geometry.map(pt => [pt.lon, pt.lat]);
      if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push(ring[0]);
      }
      outerRings.push(ring);
    }
  }

  // Handle ways (closed polygons stored as way)
  if (el.type === 'way' && el.geometry?.length) {
    const ring = el.geometry.map(pt => [pt.lon, pt.lat]);
    if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
      ring.push(ring[0]);
    }
    outerRings.push(ring);
  }

  if (!outerRings.length) return null;

  const geometry =
    outerRings.length === 1
      ? { type: 'Polygon', coordinates: outerRings }
      : { type: 'MultiPolygon', coordinates: outerRings.map(r => [r]) };

  return { type: 'Feature', properties: props, geometry };
}

// ── Overpass: get child admin areas inside a parent OSM relation ──────────────
// Uses area(id + 3600000000) formula for Overpass areas from OSM relations.

async function fetchChildBoundaries(parentOsmId, childLevel) {
  const areaId = 3600000000 + Number(parentOsmId);
  const key = `overpass_children_${parentOsmId}_lvl${childLevel}`;

  return withCache(key, async () => {
    const query = `
[out:json][timeout:45];
area(${areaId})->.parent;
(
  relation(area.parent)["admin_level"="${childLevel}"]["boundary"="administrative"];
  way(area.parent)["admin_level"="${childLevel}"]["boundary"="administrative"];
);
out geom;
    `.trim();

    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements || []).map(overpassToFeature).filter(Boolean);
  });
}

// ── Role → OSM child level mapping ───────────────────────────────────────────
// Verified empirically for Maharashtra OSM data:
//   District (lvl 5) → Talukas/Blocks (lvl 6)
//   Taluka  (lvl 6) → Gram Panchayats (lvl 9 or 10; use 8 first, fallback 9)

const ROLE_CONFIG = {
  zilla_parishad:  { ownLevel: 5, childLevel: 6  },  // District → Talukas
  block_samiti:    { ownLevel: 6, childLevel: 9  },   // Taluka → GPs
  gram_panchayat:  { ownLevel: 9, childLevel: null }, // GP → no official ward layer
  ward_member:     { ownLevel: null, childLevel: null },
};

// Map jurisdiction names to better Nominatim search queries
const SEARCH_QUERY_MAP = {
  'Pune District':    'Pune district, Maharashtra, India',
  'Pune':             'Pune district, Maharashtra, India',
  'Haveli Block':     'Haveli, Pune district, Maharashtra, India',
  'Haveli':           'Haveli, Pune district, Maharashtra, India',
  'Uruli Kanchan GP': 'Uruli Kanchan, Haveli, Pune, Maharashtra, India',
  'Uruli Kanchan':    'Uruli Kanchan, Haveli, Pune, Maharashtra, India',
};

function resolveSearchQuery(jurisdictionName) {
  return SEARCH_QUERY_MAP[jurisdictionName]
    || `${jurisdictionName}, Maharashtra, India`;
}

// ── Main exports ──────────────────────────────────────────────────────────────

/**
 * Returns { ownBoundary: GeoJSON Feature | null, childBoundaries: GeoJSON Feature[] }
 */
export async function getAdminBoundaries(role, jurisdictionName) {
  const config = ROLE_CONFIG[role];
  if (!config || !config.ownLevel) {
    return { ownBoundary: null, childBoundaries: [] };
  }

  const searchQuery = resolveSearchQuery(jurisdictionName || '');
  const ownBoundary = await fetchNominatimBoundary(searchQuery);

  if (!ownBoundary) {
    return { ownBoundary: null, childBoundaries: [] };
  }
  if (ownBoundary.properties) {
    ownBoundary.properties.jurisdiction_name = jurisdictionName;
  }

  if (!config.childLevel) {
    return { ownBoundary, childBoundaries: [] };
  }

  const osmId = ownBoundary.properties?.osm_id;
  if (!osmId) {
    return { ownBoundary, childBoundaries: [] };
  }

  const childBoundaries = await fetchChildBoundaries(osmId, config.childLevel);
  return { ownBoundary, childBoundaries };
}

/**
 * Returns a flat list of sub-jurisdiction metadata for the Dashboard panel.
 */
export async function getSubJurisdictions(role, jurisdictionName) {
  const { childBoundaries } = await getAdminBoundaries(role, jurisdictionName);
  return childBoundaries.map(f => ({
    name:        f.properties?.name || 'Unknown',
    osm_id:      f.properties?.osm_id || null,
    lgd_code:    f.properties?.lgd_code || null,
    admin_level: f.properties?.admin_level || null,
  }));
}
