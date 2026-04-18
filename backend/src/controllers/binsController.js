// backend/src/controllers/binsController.js
import { supabaseAdmin } from '../config/supabase.js';
import { verifyToken } from '../services/jwtService.js';
import { getVillageIdsForAdmin } from '../utils/adminHelpers.js';

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';
const ADMIN_ROLES = new Set(['zilla_parishad', 'block_samiti', 'gram_panchayat', 'ward_member']);

function getAdminFromAuthHeader(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyToken(auth.slice(7));
    if (decoded?.type === 'admin' || ADMIN_ROLES.has(String(decoded?.role || ''))) {
      return decoded;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  if (!geometry?.type || !geometry?.coordinates) return false;
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates;
    if (!outer || !pointInRing(point, outer)) return false;
    return !holes.some((hole) => pointInRing(point, hole));
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => {
      const [outer, ...holes] = poly;
      if (!outer || !pointInRing(point, outer)) return false;
      return !holes.some((hole) => pointInRing(point, hole));
    });
  }
  return false;
}

// ── BINS ───────────────────────────────────────────────────────────────────

/** GET /api/bins  — public, optionally filter by village_id */
export async function listBins(req, res) {
  const { village_id, assigned_panchayat_id, is_active } = req.query;
  let query = supabaseAdmin.from('bins').select('*').order('created_at', { ascending: false });

  const admin = getAdminFromAuthHeader(req);
  if (admin) {
    if (admin.role === 'ward_member') {
      query = query.eq('assigned_panchayat_id', admin.id);
    } else {
      const villageIds = await getVillageIdsForAdmin(admin);
      query = villageIds.length ? query.in('village_id', villageIds) : query.eq('village_id', EMPTY_UUID);
    }
  }

  if (village_id) query = query.eq('village_id', village_id);
  if (assigned_panchayat_id) query = query.eq('assigned_panchayat_id', assigned_panchayat_id);
  if (is_active === 'true') query = query.eq('is_active', true);
  if (is_active === 'false') query = query.eq('is_active', false);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ bins: data });
}

/** GET /api/bins/:id  — public */
export async function getBin(req, res) {
  const { data, error } = await supabaseAdmin
    .from('bins')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Bin not found' });
  return res.json(data);
}

/** GET /api/bins/reverse-geocode?lat=..&lng=..  — public helper */
export async function reverseGeocodeBinLocation(req, res) {
  try {
    const lat = Number(req.query?.lat);
    const lng = Number(req.query?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=jsonv2&zoom=18&addressdetails=1`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'GramWasteConnect/1.0 (field-project; contact@gramwaste.local)',
      },
    });

    if (!resp.ok) {
      return res.status(502).json({ error: 'Failed to resolve address' });
    }

    const data = await resp.json();
    const address = data?.display_name || null;
    return res.json({
      address,
      lat,
      lng,
      source: 'nominatim',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Reverse geocoding failed' });
  }
}

/** POST /api/bins  — admin only */
export async function createBin(req, res) {
  const {
    label,
    location_lat,
    location_lng,
    location_address,
    village_id,
    fill_level,
    assigned_panchayat_id,
    sensor_device_id,
    is_active,
  } = req.body;
  const effectiveAssignedPanchayatId = req.admin?.role === 'ward_member'
    ? req.admin.id
    : assigned_panchayat_id;

  if (!label || location_lat == null || location_lng == null || !effectiveAssignedPanchayatId) {
    return res.status(400).json({
      error: 'label, location_lat, location_lng and assigned_panchayat_id are required',
    });
  }

  if (req.admin?.role === 'ward_member') {
    const { data: me, error: meErr } = await supabaseAdmin
      .from('admins')
      .select('parent_admin_id')
      .eq('id', req.admin.id)
      .maybeSingle();
    if (meErr) return res.status(500).json({ error: meErr.message });
    if (!me?.parent_admin_id) {
      return res.status(400).json({ error: 'Parent jurisdiction is not configured yet' });
    }

    const { data: parentAdmin, error: parentErr } = await supabaseAdmin
      .from('admins')
      .select('id,role,jurisdiction_name,jurisdiction_geom,lgd_jurisdiction_code')
      .eq('id', me.parent_admin_id)
      .maybeSingle();
    if (parentErr) return res.status(500).json({ error: parentErr.message });

    const parentBoundary = parentAdmin?.jurisdiction_geom || null;
    if (!parentBoundary) {
      return res.status(400).json({ error: 'Parent jurisdiction boundary is not configured yet' });
    }

    const inside = pointInGeometry([Number(location_lng), Number(location_lat)], parentBoundary);
    if (!inside) {
      return res.status(403).json({ error: 'Dustbin location is outside your parent jurisdiction' });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bins')
    .insert({
      label,
      location_lat,
      location_lng,
      location_address: location_address || null,
      village_id: village_id || null,
      fill_level: fill_level ?? 0,
      assigned_panchayat_id: effectiveAssignedPanchayatId,
      sensor_device_id: sensor_device_id || null,
      is_active: is_active ?? true,
      last_sensor_update: fill_level != null ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}

/** PATCH /api/bins/:id  — admin only */
export async function updateBin(req, res) {
  const allowed = [
    'label',
    'location_lat',
    'location_lng',
    'location_address',
    'village_id',
    'fill_level',
    'assigned_panchayat_id',
    'sensor_device_id',
    'is_active',
  ];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  if (updates.fill_level != null) {
    updates.last_sensor_update = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('bins')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
}

/** DELETE /api/bins/:id  — admin only */
export async function deleteBin(req, res) {
  const { error } = await supabaseAdmin.from('bins').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
}

// ── RECYCLING CENTERS ──────────────────────────────────────────────────────

/** GET /api/recycling-centers  — public */
export async function listRecyclingCenters(req, res) {
  const { village_id } = req.query;
  let query = supabaseAdmin.from('recycling_centers').select('*').order('name');
  if (village_id) query = query.eq('village_id', village_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ centers: data });
}

/** POST /api/recycling-centers  — admin only */
export async function createRecyclingCenter(req, res) {
  const { name, location_lat, location_lng, village_id, address, accepts } = req.body;
  if (!name || location_lat == null || location_lng == null)
    return res.status(400).json({ error: 'name, location_lat, location_lng are required' });

  const { data, error } = await supabaseAdmin
    .from('recycling_centers')
    .insert({ name, location_lat, location_lng, village_id, address: address || '', accepts: accepts || [] })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}

/** PATCH /api/recycling-centers/:id  — admin only */
export async function updateRecyclingCenter(req, res) {
  const allowed = ['name', 'location_lat', 'location_lng', 'village_id', 'address', 'accepts'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin
    .from('recycling_centers')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
}

/** DELETE /api/recycling-centers/:id  — admin only */
export async function deleteRecyclingCenter(req, res) {
  const { error } = await supabaseAdmin.from('recycling_centers').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
}
