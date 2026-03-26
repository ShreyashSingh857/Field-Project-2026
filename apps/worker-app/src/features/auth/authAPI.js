import { supabase } from '../../services/supabaseClient';

function mapWorker(user) {
  const metadata = user?.user_metadata || {};
  return {
    id: metadata.worker_id || user?.id,
    auth_user_id: user?.id,
    name: metadata.name || user?.email || 'Worker',
    employee_id: metadata.employee_id || 'N/A',
    assigned_area: metadata.assigned_area || 'Not Assigned',
    village_id: metadata.village_id || null,
  };
}

export async function loginWorkerWithSupabase(email, password) {
  if (!supabase) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  const accessToken = data?.session?.access_token;
  return {
    token: accessToken,
    worker: mapWorker(data?.user),
  };
}

export async function getCurrentWorkerSession() {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return null;
  }

  return {
    token: data.session.access_token,
    worker: mapWorker(userData.user),
  };
}

export async function logoutWorkerSession() {
  if (!supabase) {
    localStorage.removeItem('worker_token');
    return;
  }

  await supabase.auth.signOut();
}
