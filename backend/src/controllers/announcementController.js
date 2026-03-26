import { supabaseAdmin } from '../config/supabase.js';

export async function getAnnouncements(req, res) {
  try {
    const { village_id } = req.query;
    let query = supabaseAdmin
      .from('announcements')
      .select('*, admin:created_by(name, role)')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (village_id) {
      query = query.or(`target_village_id.eq.${village_id},target_village_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ announcements: data });
  } catch (err) {
    console.error('Announcements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}
