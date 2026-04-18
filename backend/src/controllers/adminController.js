import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import { signToken } from '../services/jwtService.js';
import { buildAuthCookieOptions } from '../utils/cookieOptions.js';

const DEMO_ADMIN_PASSWORD = 'Demo@123456';
const DEMO_ADMINS = {
  'zillaparishad@demo.gramwaste.local': { id: '00000000-0000-0000-0000-000000000101', role: 'zilla_parishad', jurisdiction_name: 'Pune District', name: 'Zilla Parishad Admin' },
  'blocksamiti@demo.gramwaste.local': { id: '00000000-0000-0000-0000-000000000102', role: 'block_samiti', jurisdiction_name: 'Haveli Block', name: 'Block Samiti Admin' },
  'grampanchayat@demo.gramwaste.local': { id: '00000000-0000-0000-0000-000000000103', role: 'gram_panchayat', jurisdiction_name: 'Uruli Kanchan GP', name: 'Gram Panchayat Admin' },
  'wardmember@demo.gramwaste.local': { id: '00000000-0000-0000-0000-000000000104', role: 'ward_member', jurisdiction_name: 'Gokul Nagar', name: 'Ward Member' },
};

export async function adminLogin(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('id,name,email,role,jurisdiction_name,lgd_jurisdiction_code,password_hash,is_active')
      .ilike('email', email)
      .maybeSingle();

    if (error || !admin || !admin.is_active) {
      const demoAdmin = process.env.NODE_ENV !== 'production' ? DEMO_ADMINS[email] : null;
      if (demoAdmin && password === DEMO_ADMIN_PASSWORD) {
        const token = signToken({
          id: demoAdmin.id,
          role: demoAdmin.role,
          type: 'admin',
          jurisdiction_name: demoAdmin.jurisdiction_name,
          lgd_jurisdiction_code: null,
          name: demoAdmin.name,
          email,
          demo: true,
        });
        res.cookie('admin_token', token, buildAuthCookieOptions());
        return res.json({ token, admin: { id: demoAdmin.id, name: demoAdmin.name, email, role: demoAdmin.role, jurisdiction_name: demoAdmin.jurisdiction_name, lgd_jurisdiction_code: null } });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await supabaseAdmin.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);

    const token = signToken({
      id: admin.id,
      role: admin.role,
      type: 'admin',
      jurisdiction_name: admin.jurisdiction_name,
      lgd_jurisdiction_code: admin.lgd_jurisdiction_code,
      name: admin.name,
      email: admin.email,
    });

    res.cookie('admin_token', token, buildAuthCookieOptions());

    return res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        jurisdiction_name: admin.jurisdiction_name,
        lgd_jurisdiction_code: admin.lgd_jurisdiction_code,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to login admin' });
  }
}

export async function adminMe(req, res) {
  try {
    if (req.admin?.demo) {
      return res.json({
        admin: {
          id: req.admin.id,
          name: req.admin.name,
          email: req.admin.email,
          role: req.admin.role,
          jurisdiction_name: req.admin.jurisdiction_name,
          lgd_jurisdiction_code: req.admin.lgd_jurisdiction_code || null,
          is_active: true,
          parent_admin_id: null,
          created_at: null,
        },
      });
    }

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('id,name,email,role,jurisdiction_name,lgd_jurisdiction_code,is_active,parent_admin_id,created_at')
      .eq('id', req.admin.id)
      .single();

    if (error || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.json({ admin });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch admin profile' });
  }
}
