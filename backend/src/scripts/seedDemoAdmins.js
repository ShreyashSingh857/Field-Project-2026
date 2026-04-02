import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';

const DEMO_PASSWORD = 'Demo@123456';

const admins = [
  { name: 'Zilla Parishad Admin', email: 'zillaparishad@demo.gramwaste.local', role: 'zilla_parishad', jurisdiction_name: 'Pune District' },
  { name: 'Block Samiti Admin', email: 'blocksamiti@demo.gramwaste.local', role: 'block_samiti', jurisdiction_name: 'Haveli Block' },
  { name: 'Gram Panchayat Admin', email: 'grampanchayat@demo.gramwaste.local', role: 'gram_panchayat', jurisdiction_name: 'Uruli Kanchan GP' },
  { name: 'Ward Member', email: 'wardmember@demo.gramwaste.local', role: 'ward_member', jurisdiction_name: 'Gokul Nagar' },
];

async function upsertAdmin(admin, parentId = null, createdBy = null) {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { data: existing } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('email', admin.email)
    .maybeSingle();

  if (existing?.id) {
    await supabaseAdmin
      .from('admins')
      .update({
        name: admin.name,
        role: admin.role,
        jurisdiction_name: admin.jurisdiction_name,
        is_active: true,
        parent_admin_id: parentId,
        created_by: createdBy,
      })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from('admins')
    .insert({
      ...admin,
      password_hash,
      is_active: true,
      parent_admin_id: parentId,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function run() {
  const zillaId = await upsertAdmin(admins[0]);
  const blockId = await upsertAdmin(admins[1], zillaId, zillaId);
  const gramId = await upsertAdmin(admins[2], blockId, blockId);
  await upsertAdmin(admins[3], gramId, gramId);
  console.log('Demo admins seeded successfully');
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
