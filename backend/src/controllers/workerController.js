import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import { signToken } from '../services/jwtService.js';

export async function workerLogin(req, res) {
  try {
    const employee_id = String(req.body?.employee_id || '').trim();
    const password = String(req.body?.password || '');

    if (!employee_id || !password) {
      return res.status(400).json({ error: 'employee_id and password are required' });
    }

    const { data: worker, error } = await supabaseAdmin
      .from('workers')
      .select('id,name,employee_id,password_hash,assigned_area,village_id,phone,is_active,created_by_admin_id')
      .ilike('employee_id', employee_id)
      .maybeSingle();

    if (error || !worker || !worker.is_active) {
      return res.status(401).json({ error: 'Invalid employee ID or password' });
    }

    const ok = await bcrypt.compare(password, worker.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid employee ID or password' });
    }

    await supabaseAdmin.from('workers').update({ last_login_at: new Date().toISOString() }).eq('id', worker.id);

    const token = signToken({
      id: worker.id,
      type: 'worker',
      employee_id: worker.employee_id,
      name: worker.name,
      assigned_area: worker.assigned_area,
      village_id: worker.village_id,
      created_by_admin_id: worker.created_by_admin_id,
    });

    return res.json({
      token,
      worker: {
        id: worker.id,
        name: worker.name,
        employee_id: worker.employee_id,
        assigned_area: worker.assigned_area,
        village_id: worker.village_id,
        created_by_admin_id: worker.created_by_admin_id,
        phone: worker.phone,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to login worker' });
  }
}

export async function workerMe(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('workers')
      .select('id,name,employee_id,assigned_area,village_id,phone,is_active,created_by_admin_id')
      .eq('id', req.worker.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    return res.json({ worker: data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch worker profile' });
  }
}
