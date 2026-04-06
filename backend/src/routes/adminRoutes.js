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

const GEO_STORAGE_URL = (process.env.VITE_GEO_STORAGE_URL || `${process.env.SUPABASE_URL}/storage/v1/object/public/geo`).replace(/\/$/, '');
const MH_STATE_CODE = '27';

async function fetchGeoFeatureByPath(relativePath, properties = {}) {
  const url = `${GEO_STORAGE_URL}/${relativePath}.geojson`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const geojson = await resp.json();
  if (!geojson?.geometry) return null;
  return {
    type: 'Feature',
    properties: {
      ...(geojson.properties || {}),
      ...properties,
      source: 'supabase-storage/geo',
    },
    geometry: geojson.geometry,
  };
}

async function resolveJurisdictionCode(role, lgdCode, jurisdictionName) {
  if (lgdCode) return String(lgdCode);

  const fullName = String(jurisdictionName || '').trim();
  const term = fullName.split(' ')[0];
  if (!term && !fullName) return null;

  const findCode = async (table) => {
    if (fullName) {
      const exact = await supabaseAdmin
        .from(table)
        .select('census_code')
        .eq('name', fullName)
        .limit(1)
        .maybeSingle();
      if (exact.data?.census_code) return String(exact.data.census_code);
    }

    const fuzzy = await supabaseAdmin
      .from(table)
      .select('census_code')
      .ilike('name', `%${term || fullName}%`)
      .limit(1)
      .maybeSingle();
    return fuzzy.data?.census_code ? String(fuzzy.data.census_code) : null;
  };

  if (role === 'zilla_parishad') {
    return findCode('geo_districts');
  }

  if (role === 'block_samiti') {
    return findCode('geo_blocks');
  }

  if (role === 'gram_panchayat') {
    return findCode('geo_gram_panchayats');
  }

  return null;
}

async function resolveGeoRow(table, lgdCode, jurisdictionName) {
  const fullName = String(jurisdictionName || '').trim();
  const code = String(lgdCode || '').trim();

  if (code) {
    const exactByCode = await supabaseAdmin
      .from(table)
      .select('id,name,census_code')
      .eq('census_code', code)
      .maybeSingle();
    if (exactByCode.data) return exactByCode.data;
  }

  if (fullName) {
    const exactByName = await supabaseAdmin
      .from(table)
      .select('id,name,census_code')
      .eq('name', fullName)
      .maybeSingle();
    if (exactByName.data) return exactByName.data;
  }

  const term = fullName.split(' ')[0] || code;
  if (!term) return null;

  const fuzzy = await supabaseAdmin
    .from(table)
    .select('id,name,census_code')
    .ilike('name', `%${term}%`)
    .limit(1)
    .maybeSingle();
  return fuzzy.data || null;
}

async function getChildAdminBoundaryFeature(child) {
  const role = child.role;
  const lgd = child.lgd_jurisdiction_code;
  const name = child.jurisdiction_name || child.name || 'Jurisdiction';

  if (role === 'block_samiti') {
    const row = await resolveGeoRow('geo_blocks', lgd, name);
    if (!row?.census_code) return null;
    const { data: block } = await supabaseAdmin
      .from('geo_blocks')
      .select('district_census_code')
      .eq('census_code', row.census_code)
      .maybeSingle();
    if (!block?.district_census_code) return null;
    return fetchGeoFeatureByPath(`${MH_STATE_CODE}/${block.district_census_code}/${row.census_code}`, {
      name,
      lgd_code: row.census_code,
      level: 'block',
      admin_id: child.id,
    });
  }

  if (role === 'gram_panchayat') {
    const row = await resolveGeoRow('geo_gram_panchayats', lgd, name);
    if (!row?.census_code) return null;
    const { data: gp } = await supabaseAdmin
      .from('geo_gram_panchayats')
      .select('district_census_code,block_census_code')
      .eq('census_code', row.census_code)
      .maybeSingle();
    if (!gp?.district_census_code || !gp?.block_census_code) return null;
    return fetchGeoFeatureByPath(`${MH_STATE_CODE}/${gp.district_census_code}/${gp.block_census_code}/${row.census_code}`, {
      name,
      lgd_code: row.census_code,
      level: 'gp',
      admin_id: child.id,
      block_code: gp.block_census_code,
    });
  }

  return null;
}

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
    const lgdCode = await resolveJurisdictionCode(role, req.admin.lgd_jurisdiction_code, jurisdictionName);

    // ward_member has no boundary polygon
    if (role === 'ward_member') {
      return res.json({ boundary: null });
    }

    if (!lgdCode) return res.json({ boundary: null, message: 'Jurisdiction code not found' });

    if (role === 'zilla_parishad') {
      const feature = await fetchGeoFeatureByPath(`${MH_STATE_CODE}/${lgdCode}`, {
        name: jurisdictionName,
        lgd_code: lgdCode,
        level: 'district',
      });
      return res.json({ boundary: feature });
    }

    if (role === 'block_samiti') {
      const { data: block } = await supabaseAdmin
        .from('geo_blocks')
        .select('district_census_code')
        .eq('census_code', lgdCode)
        .maybeSingle();
      if (!block?.district_census_code) return res.json({ boundary: null });

      const feature = await fetchGeoFeatureByPath(`${MH_STATE_CODE}/${block.district_census_code}/${lgdCode}`, {
        name: jurisdictionName,
        lgd_code: lgdCode,
        level: 'block',
      });
      return res.json({ boundary: feature });
    }

    if (role === 'gram_panchayat') {
      const { data: gp } = await supabaseAdmin
        .from('geo_gram_panchayats')
        .select('district_census_code, block_census_code')
        .eq('census_code', lgdCode)
        .maybeSingle();
      if (!gp?.district_census_code || !gp?.block_census_code) return res.json({ boundary: null });

      const feature = await fetchGeoFeatureByPath(
        `${MH_STATE_CODE}/${gp.district_census_code}/${gp.block_census_code}/${lgdCode}`,
        { name: jurisdictionName, lgd_code: lgdCode, level: 'gp' }
      );
      return res.json({ boundary: feature });
    }

    return res.json({ boundary: null });
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
    const name = req.admin.jurisdiction_name || '';
    const features = [];

    if (role === 'zilla_parishad') {
      const district = await resolveGeoRow('geo_districts', req.admin.lgd_jurisdiction_code, name);
      if (!district?.id) return res.json({ type: 'FeatureCollection', features: [], count: 0 });

      const { data: blocks, error: bErr } = await supabaseAdmin
        .from('geo_blocks')
        .select('name,census_code,district_census_code')
        .eq('district_id', district.id)
        .order('name', { ascending: true });
      if (bErr) throw bErr;

      const { data: admins } = await supabaseAdmin
        .from('admins')
        .select('lgd_jurisdiction_code')
        .eq('parent_admin_id', req.admin.id)
        .eq('role', 'block_samiti')
        .eq('is_active', true);
      const adminCodes = new Set((admins || []).map((a) => String(a.lgd_jurisdiction_code || '')));

      const list = await Promise.all((blocks || []).map((b) =>
        fetchGeoFeatureByPath(`${MH_STATE_CODE}/${b.district_census_code}/${b.census_code}`, {
          name: b.name,
          lgd_code: b.census_code,
          level: 'block',
          has_admin: adminCodes.has(String(b.census_code)),
        })
      ));
      features.push(...list.filter(Boolean));
    }

    if (role === 'block_samiti') {
      const block = await resolveGeoRow('geo_blocks', req.admin.lgd_jurisdiction_code, name);
      if (!block?.id) return res.json({ type: 'FeatureCollection', features: [], count: 0 });

      const { data: gps, error: gErr } = await supabaseAdmin
        .from('geo_gram_panchayats')
        .select('name,census_code,district_census_code,block_census_code')
        .eq('block_id', block.id)
        .order('name', { ascending: true });
      if (gErr) throw gErr;

      const { data: admins } = await supabaseAdmin
        .from('admins')
        .select('lgd_jurisdiction_code')
        .eq('parent_admin_id', req.admin.id)
        .eq('role', 'gram_panchayat')
        .eq('is_active', true);
      const adminCodes = new Set((admins || []).map((a) => String(a.lgd_jurisdiction_code || '')));

      const list = await Promise.all((gps || []).map((g) =>
        fetchGeoFeatureByPath(`${MH_STATE_CODE}/${g.district_census_code}/${g.block_census_code}/${g.census_code}`, {
          name: g.name,
          lgd_code: g.census_code,
          level: 'gp',
          has_admin: adminCodes.has(String(g.census_code)),
          block_code: g.block_census_code,
        })
      ));
      features.push(...list.filter(Boolean));
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

// GET /api/admin/child-jurisdiction-options
// Returns child jurisdiction options with LGD code for Create Admin form.
router.get('/child-jurisdiction-options', verifyAdminJWT, async (req, res) => {
  try {
    const role = req.admin.role;
    const parentDistrict = await resolveGeoRow('geo_districts', req.admin.lgd_jurisdiction_code, req.admin.jurisdiction_name || '');
    const parentBlock = await resolveGeoRow('geo_blocks', req.admin.lgd_jurisdiction_code, req.admin.jurisdiction_name || '');

    if (!parentDistrict && !parentBlock) {
      return res.json({ options: [], childRole: ROLE_CHILD[role] || null });
    }

    if (role === 'zilla_parishad') {
      const { data, error } = await supabaseAdmin
        .from('geo_blocks')
        .select('name,census_code,id')
        .eq('district_id', parentDistrict.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return res.json({
        childRole: 'block_samiti',
        options: (data || []).map((r) => ({ name: r.name, lgd_code: r.census_code })),
      });
    }

    if (role === 'block_samiti') {
      const { data, error } = await supabaseAdmin
        .from('geo_gram_panchayats')
        .select('name,census_code,id')
        .eq('block_id', parentBlock.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return res.json({
        childRole: 'gram_panchayat',
        options: (data || []).map((r) => ({ name: r.name, lgd_code: r.census_code })),
      });
    }

    return res.json({ options: [], childRole: ROLE_CHILD[role] || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch child jurisdiction options' });
  }
});

export default router;
