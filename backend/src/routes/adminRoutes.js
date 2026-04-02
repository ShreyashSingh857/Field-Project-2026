import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { adminLogin, adminMe } from '../controllers/adminController.js';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';

const ROLE_CHILD = {
  zilla_parishad: 'block_samiti',
  block_samiti: 'gram_panchayat',
  gram_panchayat: 'ward_member',
};

const router = Router();

async function getAdminRow(adminId) {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id,role,jurisdiction_name,parent_admin_id')
    .eq('id', adminId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTopAncestorJurisdictionName(adminId) {
  let currentId = adminId;
  let lastJurisdiction = null;

  for (let i = 0; i < 10 && currentId; i += 1) {
    const row = await getAdminRow(currentId);
    if (!row) break;
    if (row.jurisdiction_name) lastJurisdiction = row.jurisdiction_name;
    if (!row.parent_admin_id) break;
    currentId = row.parent_admin_id;
  }

  return lastJurisdiction;
}

async function ensureVillageForGramPanchayat(creatorAdminId, gramAdmin) {
  const creator = await getAdminRow(creatorAdminId);
  const villageName = String(gramAdmin.jurisdiction_name || gramAdmin.name || '').trim();
  if (!creator || !villageName) return null;

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('villages')
    .select('id,name,gram_panchayat_name,block_name,district')
    .ilike('gram_panchayat_name', villageName)
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing?.id) return existing;

  const district = (await getTopAncestorJurisdictionName(creator.id)) || 'Unknown District';

  const { data: created, error: createErr } = await supabaseAdmin
    .from('villages')
    .insert({
      name: villageName,
      gram_panchayat_name: villageName,
      block_name: creator.jurisdiction_name || 'Unknown Block',
      district,
    })
    .select('id,name,gram_panchayat_name,block_name,district')
    .single();
  if (createErr) throw createErr;
  return created;
}

router.post('/login', adminLogin);
router.get('/me', verifyAdminJWT, adminMe);

router.get('/sub-admins', verifyAdminJWT, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id,name,email,role,jurisdiction_name,lgd_jurisdiction_code,is_active,created_at,parent_admin_id')
      .eq('parent_admin_id', req.admin.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ admins: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch sub-admins' });
  }
});

router.get('/villages', verifyAdminJWT, async (req, res) => {
  try {
    const me = await getAdminRow(req.admin.id);
    let query = supabaseAdmin.from('villages').select('id,name,gram_panchayat_name,block_name,district').order('name', { ascending: true });

    if (me?.role === 'zilla_parishad') query = query.ilike('district', me.jurisdiction_name);
    if (me?.role === 'block_samiti') query = query.ilike('block_name', me.jurisdiction_name);
    if (me?.role === 'gram_panchayat') query = query.ilike('gram_panchayat_name', me.jurisdiction_name);
    if (me?.role === 'ward_member' && me.parent_admin_id) {
      const parent = await getAdminRow(me.parent_admin_id);
      if (parent?.jurisdiction_name) query = query.ilike('gram_panchayat_name', parent.jurisdiction_name);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ villages: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch villages' });
  }
});

router.post('/sub-admins', verifyAdminJWT, async (req, res) => {
  try {
    const childRole = ROLE_CHILD[req.admin.role];
    if (!childRole) {
      return res.status(403).json({ error: 'This role cannot create sub-admins' });
    }

    const { name, email, password, jurisdiction_name, lgd_jurisdiction_code } = req.body || {};
    if (!name || !email || !password || !jurisdiction_name) {
      return res.status(400).json({ error: 'name, email, password, jurisdiction_name are required' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert({
        name,
        email: String(email).trim().toLowerCase(),
        password_hash,
        role: childRole,
        jurisdiction_name,
        lgd_jurisdiction_code: lgd_jurisdiction_code || null,
        parent_admin_id: req.admin.id,
        created_by: req.admin.id,
        is_active: true,
      })
      .select('id,name,email,role,jurisdiction_name,is_active,created_at,parent_admin_id')
      .single();

    if (error) throw error;
    let village = null;
    if (childRole === 'gram_panchayat') {
      try {
        village = await ensureVillageForGramPanchayat(req.admin.id, data);
      } catch (villageErr) {
        await supabaseAdmin.from('admins').delete().eq('id', data.id);
        throw villageErr;
      }
    }
    return res.status(201).json({ admin: data, village });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create sub-admin' });
  }
});

router.delete('/sub-admins/:id', verifyAdminJWT, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('parent_admin_id', req.admin.id)
      .select('id,is_active')
      .single();

    if (error) throw error;
    res.json({ admin: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to deactivate sub-admin' });
  }
});

// GET /api/admin/jurisdiction-boundary
// Returns the GeoJSON boundary polygon for the logged-in admin's
// jurisdiction, fetched from the geo_* tables in the database.
// The level of boundary depends on the admin's role:
//   zilla_parishad -> district polygon from geo_districts
//   block_samiti   -> block polygon from geo_blocks
//   gram_panchayat -> GP polygon from geo_gram_panchayats
//   ward_member    -> null (no boundary shown, only bins)
router.get('/jurisdiction-boundary', verifyAdminJWT, async (req, res) => {
  try {
    const role = req.admin.role;
    const jurisdictionName = req.admin.jurisdiction_name || '';
    const lgdCode = req.admin.lgd_jurisdiction_code || null;

    // ward_member has no boundary polygon
    if (role === 'ward_member') {
      return res.json({ boundary: null });
    }

    let table, nameField, codeField, levelLabel;
    if (role === 'zilla_parishad') {
      table = 'geo_districts'; nameField = 'name';
      codeField = 'census_code'; levelLabel = 'district';
    } else if (role === 'block_samiti') {
      table = 'geo_blocks'; nameField = 'name';
      codeField = 'census_code'; levelLabel = 'block';
    } else if (role === 'gram_panchayat') {
      table = 'geo_gram_panchayats'; nameField = 'name';
      codeField = 'census_code'; levelLabel = 'gp';
    } else {
      return res.json({ boundary: null });
    }

    let data, error;

    // Try by LGD code first (exact match)
    if (lgdCode) {
      ({ data, error } = await supabaseAdmin
        .from(table)
        .select(`id, name, ${codeField}, boundary_geojson, centroid_lat, centroid_lng`)
        .eq(codeField, lgdCode)
        .maybeSingle());
    }

    // Fall back to name fuzzy match
    if (!data && jurisdictionName) {
      ({ data, error } = await supabaseAdmin
        .from(table)
        .select(`id, name, ${codeField}, boundary_geojson, centroid_lat, centroid_lng`)
        .ilike(nameField, `%${jurisdictionName.split(' ')[0]}%`)
        .maybeSingle());
    }

    if (error) throw error;

    if (!data || !data.boundary_geojson) {
      // No boundary data in DB yet — return null gracefully
      return res.json({ boundary: null, message: 'Boundary data not yet available for this jurisdiction' });
    }

    const feature = {
      type: 'Feature',
      properties: {
        name: data.name,
        lgd_code: data[codeField],
        level: levelLabel,
        source: 'lgdirectory.nic.in / NIC Bharat Map Services',
      },
      geometry: data.boundary_geojson,
    };

    return res.json({ boundary: feature });
  } catch (err) {
    console.error('[jurisdiction-boundary]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch boundary' });
  }
});

// GET /api/admin/sub-boundaries
// Returns all child boundaries for the admin's jurisdiction.
// zilla_parishad -> all blocks in their district
// block_samiti   -> all GPs in their block
// gram_panchayat -> null (individual ward data not available)
router.get('/sub-boundaries', verifyAdminJWT, async (req, res) => {
  try {
    const role = req.admin.role;
    const lgdCode = req.admin.lgd_jurisdiction_code || null;
    const jurisdictionName = req.admin.jurisdiction_name || '';

    let features = [];

    if (role === 'zilla_parishad') {
      // Fetch all blocks in this district
      let query = supabaseAdmin
        .from('geo_blocks')
        .select('name, census_code, boundary_geojson, centroid_lat, centroid_lng');
      if (lgdCode) {
        query = query.eq('district_census_code', lgdCode);
      } else {
        // Fuzzy match via district name
        const distMatch = await supabaseAdmin
          .from('geo_districts')
          .select('census_code')
          .ilike('name', `%${jurisdictionName.split(' ')[0]}%`)
          .maybeSingle();
        if (distMatch.data?.census_code) {
          query = query.eq('district_census_code', distMatch.data.census_code);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      features = (data || [])
        .filter(r => r.boundary_geojson)
        .map(r => ({
          type: 'Feature',
          properties: { name: r.name, lgd_code: r.census_code, level: 'block' },
          geometry: r.boundary_geojson,
        }));

    } else if (role === 'block_samiti') {
      // Fetch all GPs in this block
      let query = supabaseAdmin
        .from('geo_gram_panchayats')
        .select('name, census_code, boundary_geojson, centroid_lat, centroid_lng');
      if (lgdCode) {
        query = query.eq('block_census_code', lgdCode);
      } else {
        const blockMatch = await supabaseAdmin
          .from('geo_blocks')
          .select('census_code')
          .ilike('name', `%${jurisdictionName.split(' ')[0]}%`)
          .maybeSingle();
        if (blockMatch.data?.census_code) {
          query = query.eq('block_census_code', blockMatch.data.census_code);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      features = (data || [])
        .filter(r => r.boundary_geojson)
        .map(r => ({
          type: 'Feature',
          properties: { name: r.name, lgd_code: r.census_code, level: 'gp' },
          geometry: r.boundary_geojson,
        }));
    }

    return res.json({
      type: 'FeatureCollection',
      features,
      count: features.length,
    });
  } catch (err) {
    console.error('[sub-boundaries]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch sub-boundaries' });
  }
});

// GET /api/admin/sub-jurisdictions
// Returns a list of child jurisdiction names/codes for the logged-in admin.
// Used by the Dashboard sub-jurisdictions panel.
router.get('/sub-jurisdictions', verifyAdminJWT, async (req, res) => {
  try {
    const me = await getAdminRow(req.admin.id);
    const role = req.admin.role;
    const jurisdictionName = me?.jurisdiction_name || null;

    if (!jurisdictionName || role === 'ward_member' || role === 'gram_panchayat') {
      return res.json({ subJurisdictions: [] });
    }

    const { getSubJurisdictions } = await import('../services/lgdBoundaryService.js');
    const list = await getSubJurisdictions(role, jurisdictionName);

    return res.json({ subJurisdictions: list });
  } catch (err) {
    console.error('[sub-jurisdictions]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch sub-jurisdictions' });
  }
});

export default router;
