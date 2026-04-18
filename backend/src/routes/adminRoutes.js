import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { adminLogin, adminMe } from '../controllers/adminController.js';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { validateBody } from '../middleware/validateRequest.js';
import { adminLoginSchema } from '../validation/schemas.js';

const ROLE_CHILD = {
  zilla_parishad: 'block_samiti',
  block_samiti: 'gram_panchayat',
  gram_panchayat: 'ward_member',
};

const DISTRICT_HIERARCHY = {
  default: {
    type: 'rural_block_gp',
    districtLabel: 'District',
    level2Label: 'Block',
    level3Label: 'Gram Panchayat',
  },
  mumbai_city: {
    type: 'urban_metro',
    districtLabel: 'District',
    level2Label: 'Taluka / Subdivision',
    level3Label: 'Ward / Local Unit',
  },
  mumbai_suburban: {
    type: 'urban_metro',
    districtLabel: 'District',
    level2Label: 'Taluka / Subdivision',
    level3Label: 'Ward / Local Unit',
  },
};

const DISTRICT_PRESET_CHILD_OPTIONS = {
  mumbai_city: {
    childRole: 'block_samiti',
    childLabel: 'Taluka / Subdivision',
    options: 'A Ward|B Ward|C Ward|D Ward|E Ward|F North Ward|F South Ward|G North Ward|G South Ward|H East Ward|H West Ward|K East Ward|K West Ward|L Ward|M East Ward|M West Ward|N Ward|P North Ward|P South Ward|R North Ward|R Central Ward|R South Ward|S Ward|T Ward'
      .split('|')
      .map((name, idx) => ({ name, lgd_code: `MC-${idx + 1}` })),
    source: 'preset-mumbai-city',
  },
  mumbai_suburban: {
    childRole: 'block_samiti',
    childLabel: 'Taluka / Subdivision',
    options: [
      { name: 'Andheri', lgd_code: 'M-1' },
      { name: 'Borivali', lgd_code: 'M-2' },
      { name: 'Kurla', lgd_code: 'M-3' },
    ],
    source: 'preset-mumbai-suburban',
  },
};

function normDistrictName(name) {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('mumbai suburban') || raw.includes('mumbai suburb')) return 'mumbai_suburban';
  if (raw.includes('mumbai city') || raw === 'mumbai') return 'mumbai_city';
  return raw;
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function getHierarchyProfile(districtName) {
  const key = normDistrictName(districtName);
  return DISTRICT_HIERARCHY[key] || DISTRICT_HIERARCHY.default;
}

async function resolveHierarchyProfileForDistrict(districtName) {
  const base = getHierarchyProfile(districtName);
  if (base.type !== 'rural_block_gp') return base;

  const district = await resolveGeoRow('geo_districts', null, districtName || '');
  if (!district?.id) return base;

  const { count, error } = await supabaseAdmin
    .from('geo_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('district_id', district.id);
  if (error) return base;

  return (count || 0) > 0
    ? base
    : {
      type: 'urban_no_blocks',
      districtLabel: 'District',
      level2Label: 'Taluka / Subdivision',
      level3Label: 'Ward / Local Unit',
    };
}

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

async function resolveAdminJurisdictionGeometry(role, lgdCode, jurisdictionName) {
  if (role === 'ward_member') return null;

  const name = String(jurisdictionName || '').trim();
  if (!name && !lgdCode) return null;

  if (role === 'zilla_parishad') {
    const lgd = await resolveJurisdictionCode(role, lgdCode, name);
    if (!lgd) return null;
    const feature = await fetchGeoFeatureByPath(`${MH_STATE_CODE}/${lgd}`, { name, lgd_code: lgd, level: 'district' });
    return feature?.geometry || null;
  }

  if (role === 'block_samiti') {
    const row = await resolveGeoRow('geo_blocks', lgdCode, name);
    if (!row?.census_code) return null;
    const { data: block } = await supabaseAdmin
      .from('geo_blocks')
      .select('district_census_code')
      .eq('census_code', row.census_code)
      .maybeSingle();
    if (!block?.district_census_code) return null;
    const feature = await fetchGeoFeatureByPath(`${MH_STATE_CODE}/${block.district_census_code}/${row.census_code}`, { name, lgd_code: row.census_code, level: 'block' });
    return feature?.geometry || null;
  }

  if (role === 'gram_panchayat') {
    const row = await resolveGeoRow('geo_gram_panchayats', lgdCode, name);
    if (!row?.census_code) return null;
    const { data: gp } = await supabaseAdmin
      .from('geo_gram_panchayats')
      .select('district_census_code,block_census_code')
      .eq('census_code', row.census_code)
      .maybeSingle();
    if (!gp?.district_census_code || !gp?.block_census_code) return null;
    const feature = await fetchGeoFeatureByPath(`${MH_STATE_CODE}/${gp.district_census_code}/${gp.block_census_code}/${row.census_code}`, { name, lgd_code: row.census_code, level: 'gp' });
    return feature?.geometry || null;
  }

  return null;
}

async function buildBoundaryFeatureForAdmin(admin) {
  if (!admin?.role) return null;
  const role = admin.role;
  const jurisdictionName = String(admin.jurisdiction_name || '').trim();

  if (admin.jurisdiction_geom) {
    return {
      type: 'Feature',
      geometry: admin.jurisdiction_geom,
      properties: {
        name: jurisdictionName,
        lgd_code: admin.lgd_jurisdiction_code || null,
        level: role === 'zilla_parishad' ? 'district' : role === 'block_samiti' ? 'subdivision' : role === 'gram_panchayat' ? 'gp' : 'ward',
        source: 'admins-db-geometry',
      },
    };
  }

  if (role === 'ward_member') return null;

  const lgdCode = await resolveJurisdictionCode(role, admin.lgd_jurisdiction_code, jurisdictionName);
  if (!lgdCode) return null;

  if (role === 'zilla_parishad') {
    return fetchGeoFeatureByPath(`${MH_STATE_CODE}/${lgdCode}`, {
      name: jurisdictionName,
      lgd_code: lgdCode,
      level: 'district',
    });
  }

  if (role === 'block_samiti') {
    const { data: block } = await supabaseAdmin
      .from('geo_blocks')
      .select('district_census_code')
      .eq('census_code', lgdCode)
      .maybeSingle();

    if (!block?.district_census_code) {
      const { fetchNominatimBoundary } = await import('../services/lgdBoundaryService.js');
      const fallback = await fetchNominatimBoundary(`${jurisdictionName}, Maharashtra, India`);
      if (!fallback?.geometry) return null;
      return {
        type: 'Feature',
        geometry: fallback.geometry,
        properties: {
          ...(fallback.properties || {}),
          name: jurisdictionName,
          lgd_code: lgdCode,
          level: 'subdivision',
          source: 'nominatim-fallback',
        },
      };
    }

    return fetchGeoFeatureByPath(`${MH_STATE_CODE}/${block.district_census_code}/${lgdCode}`, {
      name: jurisdictionName,
      lgd_code: lgdCode,
      level: 'block',
    });
  }

  if (role === 'gram_panchayat') {
    const { data: gp } = await supabaseAdmin
      .from('geo_gram_panchayats')
      .select('district_census_code, block_census_code')
      .eq('census_code', lgdCode)
      .maybeSingle();
    if (!gp?.district_census_code || !gp?.block_census_code) return null;

    return fetchGeoFeatureByPath(
      `${MH_STATE_CODE}/${gp.district_census_code}/${gp.block_census_code}/${lgdCode}`,
      { name: jurisdictionName, lgd_code: lgdCode, level: 'gp' }
    );
  }

  return null;
}

async function getAdminRow(adminId) {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id,role,jurisdiction_name,parent_admin_id,lgd_jurisdiction_code,jurisdiction_geom')
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

async function resolveDistrictNameForAdmin(admin) {
  if (!admin?.id) return null;
  if (admin.role === 'zilla_parishad') return admin.jurisdiction_name || null;
  return getTopAncestorJurisdictionName(admin.id);
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

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (crosses) inside = !inside;
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

function geometryVertices(geometry) {
  const pts = [];
  if (!geometry?.type || !geometry?.coordinates) return pts;
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring) => ring.forEach((p) => pts.push(p)));
  }
  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach((p) => pts.push(p))));
  }
  return pts;
}

router.post('/login', validateBody(adminLoginSchema), adminLogin);
router.get('/me', verifyAdminJWT, adminMe);
router.post('/logout', (_req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  return res.json({ ok: true });
});

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

router.get('/hierarchy-context', verifyAdminJWT, async (req, res) => {
  try {
    const me = await getAdminRow(req.admin.id);
    const districtName = await resolveDistrictNameForAdmin({ ...req.admin, ...me });
    const profile = await resolveHierarchyProfileForDistrict(districtName);
    return res.json({
      districtName: districtName || null,
      hierarchyType: profile.type,
      labels: {
        district: profile.districtLabel,
        level2: profile.level2Label,
        level3: profile.level3Label,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch hierarchy context' });
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
      .select('id,name,email,role,jurisdiction_name,lgd_jurisdiction_code,is_active,created_at,parent_admin_id,jurisdiction_geom')
      .single();

    if (error) throw error;
    const geometry = await resolveAdminJurisdictionGeometry(data.role, data.lgd_jurisdiction_code, data.jurisdiction_name);
    if (geometry) {
      const { error: geomErr } = await supabaseAdmin
        .from('admins')
        .update({ jurisdiction_geom: geometry, updated_at: new Date().toISOString() })
        .eq('id', data.id);
      if (!geomErr) data.jurisdiction_geom = geometry;
    }
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
    const me = await getAdminRow(req.admin.id);
    const boundary = await buildBoundaryFeatureForAdmin({ ...req.admin, ...me });
    return res.json({ boundary: boundary || null });
  } catch (err) {
    console.error('[jurisdiction-boundary]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch boundary' });
  }
});

// GET /api/admin/parent-jurisdiction-boundary
// Returns parent admin boundary to drive focus/fit for child admins.
router.get('/parent-jurisdiction-boundary', verifyAdminJWT, async (req, res) => {
  try {
    const me = await getAdminRow(req.admin.id);
    if (!me?.parent_admin_id) {
      return res.json({ boundary: null, parent: null });
    }

    const parent = await getAdminRow(me.parent_admin_id);
    if (!parent) {
      return res.json({ boundary: null, parent: null });
    }

    const boundary = await buildBoundaryFeatureForAdmin(parent);
    return res.json({
      boundary: boundary || null,
      parent: {
        id: parent.id,
        role: parent.role,
        jurisdiction_name: parent.jurisdiction_name,
      },
    });
  } catch (err) {
    console.error('[parent-jurisdiction-boundary]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch parent boundary' });
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

    // For map rendering, always prefer computed jurisdiction boundaries from geo/OSM.
    // Stored admin geometries can be tiny/manual and may not represent full subdivisions.

    if (role === 'zilla_parishad') {
      const district = await resolveGeoRow('geo_districts', req.admin.lgd_jurisdiction_code, name);
      const districtName = await resolveDistrictNameForAdmin(req.admin);
      const profile = await resolveHierarchyProfileForDistrict(districtName);

      let blocks = [];
      if (district?.id) {
        const { data, error: bErr } = await supabaseAdmin
          .from('geo_blocks')
          .select('name,census_code,district_census_code')
          .eq('district_id', district.id)
          .order('name', { ascending: true });
        if (bErr) throw bErr;
        blocks = data || [];
      }

      if (blocks.length === 0 || profile.type !== 'rural_block_gp') {
        const { getAdminBoundaries } = await import('../services/lgdBoundaryService.js');
        const { childBoundaries } = await getAdminBoundaries('zilla_parishad', name || districtName || '');
        const mapped = (childBoundaries || []).map((f) => ({
          ...f,
          properties: {
            ...(f.properties || {}),
            level: 'subdivision',
          },
        }));
        features.push(...mapped.filter((f) => f?.geometry));
      } else {
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
    }

    if (role === 'block_samiti') {
      const block = await resolveGeoRow('geo_blocks', req.admin.lgd_jurisdiction_code, name);
      let gps = [];
      if (block?.id) {
        const { data, error: gErr } = await supabaseAdmin
          .from('geo_gram_panchayats')
          .select('name,census_code,district_census_code,block_census_code')
          .eq('block_id', block.id)
          .order('name', { ascending: true });
        if (gErr) throw gErr;
        gps = data || [];
      }

      if (gps.length === 0) {
        const { getAdminBoundaries } = await import('../services/lgdBoundaryService.js');
        const { childBoundaries } = await getAdminBoundaries('block_samiti', name || '');
        const mapped = (childBoundaries || []).map((f) => ({
          ...f,
          properties: {
            ...(f.properties || {}),
            level: 'gp',
          },
        }));
        features.push(...mapped.filter((f) => f?.geometry));
      } else {
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
    }

    if (role === 'gram_panchayat') {
      const { data: wards, error: wErr } = await supabaseAdmin
        .from('admins')
        .select('id,name,jurisdiction_name,lgd_jurisdiction_code,jurisdiction_geom')
        .eq('parent_admin_id', req.admin.id)
        .eq('role', 'ward_member')
        .eq('is_active', true)
        .not('jurisdiction_geom', 'is', null)
        .order('name', { ascending: true });
      if (wErr) throw wErr;

      const wardFeatures = (wards || []).map((w) => ({
        type: 'Feature',
        geometry: w.jurisdiction_geom,
        properties: {
          name: w.name || w.jurisdiction_name,
          ward_name: w.jurisdiction_name || w.name,
          lgd_code: w.lgd_jurisdiction_code || null,
          level: 'ward',
          admin_id: w.id,
          source: 'admins-db-geometry',
        },
      }));
      features.push(...wardFeatures.filter((f) => !!f.geometry));
    }

    // Fallback: if computed source has no children, return stored child admin geometries.
    if (features.length === 0 && (role === 'zilla_parishad' || role === 'block_samiti')) {
      const childRole = role === 'zilla_parishad' ? 'block_samiti' : 'gram_panchayat';
      const level = role === 'zilla_parishad' ? 'subdivision' : 'gp';

      const { data: dbChildren, error: dbErr } = await supabaseAdmin
        .from('admins')
        .select('id,jurisdiction_name,lgd_jurisdiction_code,jurisdiction_geom')
        .eq('parent_admin_id', req.admin.id)
        .eq('role', childRole)
        .eq('is_active', true)
        .not('jurisdiction_geom', 'is', null)
        .order('jurisdiction_name', { ascending: true });

      if (dbErr) throw dbErr;

      const fromDb = (dbChildren || []).map((c) => ({
        type: 'Feature',
        geometry: c.jurisdiction_geom,
        properties: {
          name: c.jurisdiction_name,
          lgd_code: c.lgd_jurisdiction_code || null,
          level,
          source: 'admins-db-geometry-fallback',
          admin_id: c.id,
        },
      }));

      features.push(...fromDb.filter((f) => !!f.geometry));
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
    const districtName = await resolveDistrictNameForAdmin(req.admin);
    const profile = await resolveHierarchyProfileForDistrict(districtName);
    const districtKey = normDistrictName(districtName || req.admin.jurisdiction_name || '');

    if (role === 'zilla_parishad' && DISTRICT_PRESET_CHILD_OPTIONS[districtKey]) {
      return res.json(DISTRICT_PRESET_CHILD_OPTIONS[districtKey]);
    }

    const parentDistrict = await resolveGeoRow('geo_districts', req.admin.lgd_jurisdiction_code, req.admin.jurisdiction_name || '');
    const parentBlock = await resolveGeoRow('geo_blocks', req.admin.lgd_jurisdiction_code, req.admin.jurisdiction_name || '');

    if (!parentDistrict && !parentBlock) {
      return res.json({ options: [], childRole: ROLE_CHILD[role] || null, childLabel: profile.level2Label });
    }

    if (role === 'zilla_parishad') {
      let blockOptions = [];
      if (parentDistrict?.id) {
        const { data, error } = await supabaseAdmin
          .from('geo_blocks')
          .select('name,census_code,id')
          .eq('district_id', parentDistrict.id)
          .order('name', { ascending: true });
        if (error) throw error;
        blockOptions = (data || []).map((r) => ({ name: r.name, lgd_code: r.census_code }));
      }
      if (blockOptions.length > 0 && profile.type === 'rural_block_gp') {
        return res.json({ childRole: 'block_samiti', childLabel: profile.level2Label, options: blockOptions, source: 'geo_blocks' });
      }

      const { getSubJurisdictions } = await import('../services/lgdBoundaryService.js');
      const osmChildren = await getSubJurisdictions('zilla_parishad', req.admin.jurisdiction_name || districtName || '');
      return res.json({
        childRole: 'block_samiti',
        childLabel: profile.level2Label,
        options: (osmChildren || []).map((r) => ({ name: r.name, lgd_code: r.lgd_code || r.osm_id || '' })),
        source: 'osm',
      });
    }

    if (role === 'block_samiti') {
      let gpOptions = [];
      if (parentBlock?.id) {
        const { data, error } = await supabaseAdmin
          .from('geo_gram_panchayats')
          .select('name,census_code,id')
          .eq('block_id', parentBlock.id)
          .order('name', { ascending: true });
        if (error) throw error;
        gpOptions = (data || []).map((r) => ({ name: r.name, lgd_code: r.census_code }));
      }
      if (gpOptions.length > 0) {
        return res.json({ childRole: 'gram_panchayat', childLabel: profile.level3Label, options: gpOptions, source: 'geo_gram_panchayats' });
      }

      const { getSubJurisdictions } = await import('../services/lgdBoundaryService.js');
      const osmChildren = await getSubJurisdictions('block_samiti', req.admin.jurisdiction_name || '');
      return res.json({
        childRole: 'gram_panchayat',
        childLabel: profile.level3Label,
        options: (osmChildren || []).map((r) => ({ name: r.name, lgd_code: r.lgd_code || r.osm_id || '' })),
        source: 'osm',
      });
    }

    return res.json({ options: [], childRole: ROLE_CHILD[role] || null, childLabel: profile.level3Label });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch child jurisdiction options' });
  }
});

// GET /api/admin/ward-subadmins
// Gram panchayat: list active ward members under current admin.
router.get('/ward-subadmins', verifyAdminJWT, async (req, res) => {
  try {
    const me = await getAdminRow(req.admin.id);
    const role = normalizeRole(me?.role || req.admin.role);
    if (role !== 'gram_panchayat') {
      return res.status(403).json({ error: 'Only gram panchayat can access ward members' });
    }

    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id,name,email,jurisdiction_name,jurisdiction_geom,is_active')
      .eq('parent_admin_id', req.admin.id)
      .eq('role', 'ward_member')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;

    return res.json({ wardMembers: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch ward members' });
  }
});

// PUT /api/admin/ward-subadmins/:wardId/jurisdiction
// Gram panchayat can assign ward polygon; polygon must lie within GP boundary.
router.put('/ward-subadmins/:wardId/jurisdiction', verifyAdminJWT, async (req, res) => {
  try {
    const me = await getAdminRow(req.admin.id);
    const role = normalizeRole(me?.role || req.admin.role);
    if (role !== 'gram_panchayat') {
      return res.status(403).json({ error: 'Only gram panchayat can update ward jurisdictions' });
    }

    const rawGeometry = req.body?.geometry;
    if (!rawGeometry || !['Polygon', 'MultiPolygon'].includes(rawGeometry.type)) {
      return res.status(400).json({ error: 'Valid Polygon/MultiPolygon geometry is required' });
    }

    const { data: ward, error: wardErr } = await supabaseAdmin
      .from('admins')
      .select('id,parent_admin_id,role,is_active')
      .eq('id', req.params.wardId)
      .maybeSingle();
    if (wardErr) throw wardErr;
    if (!ward || ward.role !== 'ward_member' || !ward.is_active || ward.parent_admin_id !== req.admin.id) {
      return res.status(404).json({ error: 'Ward member not found in your jurisdiction' });
    }

    const parentBoundaryFeature = await buildBoundaryFeatureForAdmin({ ...req.admin, ...me, role });
    const clientParentBoundary = req.body?.parentBoundaryGeometry;
    const validationBoundary = parentBoundaryFeature?.geometry || clientParentBoundary || null;
    if (!validationBoundary) {
      return res.status(400).json({ error: 'Parent jurisdiction boundary unavailable' });
    }

    const vertices = geometryVertices(rawGeometry);
    if (!vertices.length) {
      return res.status(400).json({ error: 'Geometry has no vertices' });
    }

    const allInside = vertices.every((p) => pointInGeometry(p, validationBoundary));
    if (!allInside) {
      return res.status(400).json({ error: 'Ward jurisdiction must be fully inside gram panchayat boundary' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('admins')
      .update({
        jurisdiction_geom: rawGeometry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ward.id)
      .eq('parent_admin_id', req.admin.id)
      .select('id,name,jurisdiction_name,jurisdiction_geom')
      .single();
    if (updateErr) throw updateErr;

    return res.json({ wardMember: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update ward jurisdiction' });
  }
});

export default router;
