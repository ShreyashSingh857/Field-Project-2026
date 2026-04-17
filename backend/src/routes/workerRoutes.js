import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { workerLogin, workerMe } from '../controllers/workerController.js';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';
import { requireRole } from '../middleware/requireRole.js';
import { verifyWorkerJWT } from '../middleware/verifyWorkerJWT.js';
import { validateBody } from '../middleware/validateRequest.js';
import {
  workerCreateSchema,
  workerLoginSchema,
  workerPasswordSchema,
  workerStatusSchema,
  workerUpdateSchema,
} from '../validation/schemas.js';

const router = Router();

async function resolveVillageForWardMember(adminId, requestedVillageId) {
  if (requestedVillageId) {
    const { data: explicitVillage, error: explicitErr } = await supabaseAdmin
      .from('villages')
      .select('id,name')
      .eq('id', requestedVillageId)
      .maybeSingle();
    if (explicitErr) throw explicitErr;
    if (!explicitVillage) throw new Error('Selected village does not exist');
    return explicitVillage.id;
  }

  const { data: me, error: meErr } = await supabaseAdmin
    .from('admins')
    .select('id,parent_admin_id')
    .eq('id', adminId)
    .maybeSingle();
  if (meErr) throw meErr;
  if (!me?.parent_admin_id) return null;

  const { data: parent, error: parentErr } = await supabaseAdmin
    .from('admins')
    .select('jurisdiction_name')
    .eq('id', me.parent_admin_id)
    .maybeSingle();
  if (parentErr) throw parentErr;
  if (!parent?.jurisdiction_name) return null;

  const { data: village, error: villageErr } = await supabaseAdmin
    .from('villages')
    .select('id')
    .ilike('gram_panchayat_name', parent.jurisdiction_name)
    .limit(1)
    .maybeSingle();
  if (villageErr) throw villageErr;
  return village?.id || null;
}

function generateEmployeeId() {
  return `GWC-WRK-${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
}

function generateWorkerPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
  let out = '';
  for (let i = 0; i < 10; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

router.post('/login', validateBody(workerLoginSchema), workerLogin);
router.get('/me', verifyWorkerJWT, workerMe);
router.post('/logout', (_req, res) => {
  res.clearCookie('worker_token', { path: '/' });
  return res.json({ ok: true });
});
router.patch('/me/password', verifyWorkerJWT, validateBody(workerPasswordSchema), async (req, res) => {
  try {
    const currentPassword = String(req.body?.current_password || '');
    const newPassword = String(req.body?.new_password || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters long' });
    }

    const { data: worker, error: workerErr } = await supabaseAdmin
      .from('workers')
      .select('id,password_hash')
      .eq('id', req.worker.id)
      .maybeSingle();
    if (workerErr) throw workerErr;
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const ok = await bcrypt.compare(currentPassword, worker.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabaseAdmin
      .from('workers')
      .update({
        password_hash,
        password_changed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.worker.id);
    if (updateErr) throw updateErr;

    return res.json({ message: 'Password changed successfully', password_changed: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to change password' });
  }
});

router.get('/area-options', verifyAdminJWT, requireRole('ward_member'), async (req, res) => {
  try {
    const { data: me, error: meErr } = await supabaseAdmin
      .from('admins')
      .select('id,name,parent_admin_id')
      .eq('id', req.admin.id)
      .single();
    if (meErr) throw meErr;

    let query = supabaseAdmin.from('admins').select('id,name,jurisdiction_name').eq('role', 'ward_member').eq('is_active', true);
    if (me.parent_admin_id) query = query.eq('parent_admin_id', me.parent_admin_id);
    else query = query.eq('id', me.id);

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;

    const options = (data || []).map((a) => ({ id: a.id, label: a.name || a.jurisdiction_name || 'Ward Member Area' }));
    if (!options.some((o) => o.id === me.id)) options.unshift({ id: me.id, label: me.name || 'Ward Member Area' });
    return res.json({ options, defaultArea: me.name || 'Ward Member Area' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load area options' });
  }
});

router.get('/', verifyAdminJWT, requireRole('ward_member'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workers')
      .select('id,name,employee_id,assigned_area,village_id,phone,is_active,last_login_at,created_at')
      .eq('created_by_admin_id', req.admin.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ workers: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch workers' });
  }
});

router.get('/:id', verifyAdminJWT, requireRole('ward_member'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workers')
      .select('id,name,employee_id,assigned_area,village_id,phone,is_active,last_login_at,created_at')
      .eq('id', req.params.id)
      .eq('created_by_admin_id', req.admin.id)
      .single();
    if (error) throw error;
    res.json({ worker: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch worker' });
  }
});

router.post('/', verifyAdminJWT, requireRole('ward_member'), validateBody(workerCreateSchema), async (req, res) => {
  try {
    const { name, phone, assigned_area, village_id, language, password } = req.body || {};
    const { data: me } = await supabaseAdmin.from('admins').select('id,name').eq('id', req.admin.id).maybeSingle();
    const finalAssignedArea = String(assigned_area || me?.name || '').trim();
    if (!name || !finalAssignedArea) {
      return res.status(400).json({ error: 'name and assigned_area are required' });
    }

    const employee_id = generateEmployeeId();
    const resolvedVillageId = await resolveVillageForWardMember(req.admin.id, village_id || null);
    const rawPassword = String(password || generateWorkerPassword());
    const password_hash = await bcrypt.hash(rawPassword, 10);

    const { data, error } = await supabaseAdmin
      .from('workers')
      .insert({
        name,
        employee_id,
        password_hash,
        phone: phone || null,
        assigned_area: finalAssignedArea,
        village_id: resolvedVillageId,
        language: language || 'hi',
        is_active: true,
        created_by_admin_id: req.admin.id,
      })
      .select('id,name,employee_id,assigned_area,village_id,phone,is_active,created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ worker: data, temp_password: rawPassword });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create worker' });
  }
});

router.patch('/:id', verifyAdminJWT, requireRole('ward_member'), validateBody(workerUpdateSchema), async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'assigned_area', 'language'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const { data, error } = await supabaseAdmin
      .from('workers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('created_by_admin_id', req.admin.id)
      .select('id,name,employee_id,assigned_area,village_id,phone,is_active,last_login_at,created_at')
      .single();
    if (error) throw error;
    res.json({ worker: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update worker' });
  }
});

router.patch('/:id/status', verifyAdminJWT, requireRole('ward_member'), validateBody(workerStatusSchema), async (req, res) => {
  try {
    const { is_active } = req.body || {};
    const { data, error } = await supabaseAdmin
      .from('workers')
      .update({ is_active: Boolean(is_active), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('created_by_admin_id', req.admin.id)
      .select('id,name,employee_id,assigned_area,village_id,phone,is_active,last_login_at,created_at')
      .single();
    if (error) throw error;
    res.json({ worker: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update worker status' });
  }
});

export default router;
