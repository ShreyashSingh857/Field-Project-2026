import { supabaseAdmin } from '../config/supabase.js';
import { createBulkNotifications } from '../services/notificationService.js';

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

export async function createAnnouncement(req, res) {
  try {
    const { title, content, target_village_id, is_pinned } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const villageId =
      typeof target_village_id === 'string' && /^[0-9a-f-]{36}$/i.test(target_village_id)
        ? target_village_id
        : null;

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        created_by: req.admin.id,
        title,
        content,
        target_village_id: villageId,
        is_pinned: Boolean(is_pinned),
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;

    let usersQuery = supabaseAdmin.from('users').select('id');
    let workersQuery = supabaseAdmin.from('workers').select('id').eq('is_active', true);
    if (villageId) {
      usersQuery = usersQuery.eq('village_id', villageId);
      workersQuery = workersQuery.eq('village_id', villageId);
    }

    const [usersRes, workersRes] = await Promise.all([usersQuery, workersQuery]);

    const notifications = [
      ...((usersRes.data || []).map((u) => ({
        actorType: 'user',
        actorId: u.id,
        kind: 'announcement',
        title,
        body: content,
        link: '/announcements',
        data: { announcement_id: data.id },
      }))),
      ...((workersRes.data || []).map((w) => ({
        actorType: 'worker',
        actorId: w.id,
        kind: 'announcement',
        title,
        body: content,
        link: '/announcements',
        data: { announcement_id: data.id },
      }))),
    ];

    await createBulkNotifications(notifications);
    res.status(201).json({ announcement: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create announcement' });
  }
}

export async function updateAnnouncement(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ announcement: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update announcement' });
  }
}

export async function deleteAnnouncement(req, res) {
  try {
    const { error } = await supabaseAdmin
      .from('announcements')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete announcement' });
  }
}
