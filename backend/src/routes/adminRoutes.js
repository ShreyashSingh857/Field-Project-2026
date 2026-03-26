import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { adminLogin, adminMe } from '../controllers/adminController.js';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';

const ROLE_CHILD = {
  zilla_parishad: 'block_samiti',
  block_samiti: 'gram_panchayat',
  gram_panchayat: 'panchayat_admin',
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
      .select('id,name,email,role,jurisdiction_name,is_active,created_at,parent_admin_id')
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
    if (me?.role === 'panchayat_admin' && me.parent_admin_id) {
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

    const { name, email, password, jurisdiction_name } = req.body || {};
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

export default router;
