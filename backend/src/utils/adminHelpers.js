import { supabaseAdmin } from '../config/supabase.js';

export async function getVillageIdsForAdmin(admin) {
  if (!admin?.role) return [];

  if (admin.role === 'ward_member') {
    const { data: me } = await supabaseAdmin
      .from('admins')
      .select('id,parent_admin_id')
      .eq('id', admin.id)
      .maybeSingle();
    if (!me?.parent_admin_id) return [];

    const { data: parent } = await supabaseAdmin
      .from('admins')
      .select('jurisdiction_name')
      .eq('id', me.parent_admin_id)
      .maybeSingle();
    if (!parent?.jurisdiction_name) return [];

    const { data: villages } = await supabaseAdmin
      .from('villages')
      .select('id')
      .ilike('gram_panchayat_name', parent.jurisdiction_name);

    return (villages || []).map((v) => v.id);
  }

  let query = supabaseAdmin.from('villages').select('id');
  if (admin.role === 'zilla_parishad') query = query.eq('district', admin.jurisdiction_name);
  if (admin.role === 'block_samiti') query = query.eq('block_name', admin.jurisdiction_name);
  if (admin.role === 'gram_panchayat') query = query.eq('gram_panchayat_name', admin.jurisdiction_name);
  const { data } = await query;
  return (data || []).map((v) => v.id);
}
