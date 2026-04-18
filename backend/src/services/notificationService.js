import { supabaseAdmin } from '../config/supabase.js';

export async function createNotification({ actorType, actorId, kind, title, body, link = null, data = null }) {
  const payload = {
    actor_type: actorType,
    actor_id: actorId,
    kind,
    type: kind,
    title,
    body,
    message: body,
    link,
    data,
    read: false,
  };

  const { data: inserted, error } = await supabaseAdmin
    .from('notifications')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return inserted;
}

export async function createBulkNotifications(items) {
  if (!items.length) return [];
  const payload = items.map((item) => ({
    actor_type: item.actorType,
    actor_id: item.actorId,
    kind: item.kind,
    type: item.kind,
    title: item.title,
    body: item.body,
    message: item.body,
    link: item.link || null,
    data: item.data || null,
    read: false,
  }));

  const { data, error } = await supabaseAdmin.from('notifications').insert(payload).select('*');
  if (error) throw error;
  return data || [];
}

export async function listNotificationsForActor({ actorType, actorId, limit = 20 }) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id,kind,title,body,link,read,created_at,data')
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead({ id, actorType, actorId }) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead({ actorType, actorId }) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('actor_type', actorType)
    .eq('actor_id', actorId)
    .eq('read', false);
  if (error) throw error;
}
