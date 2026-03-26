// backend/src/controllers/binsController.js
import { supabaseAdmin } from '../config/supabase.js';

// ── BINS ───────────────────────────────────────────────────────────────────

/** GET /api/bins  — public, optionally filter by village_id */
export async function listBins(req, res) {
  const { village_id, assigned_panchayat_id, is_active } = req.query;
  let query = supabaseAdmin.from('bins').select('*').order('created_at', { ascending: false });
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
  if (!label || location_lat == null || location_lng == null || !assigned_panchayat_id) {
    return res.status(400).json({
      error: 'label, location_lat, location_lng and assigned_panchayat_id are required',
    });
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
      assigned_panchayat_id,
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
