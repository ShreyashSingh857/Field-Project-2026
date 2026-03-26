import { supabase } from '../../services/supabaseClient';

export const DEMO_WORKER_CREDENTIALS = {
  email: 'worker.demo@gramwaste.local',
  password: 'Demo@1234',
};

const DEMO_WORKER_TOKEN = 'demo-worker-token';

function getDemoWorkerSession() {
  return {
    token: DEMO_WORKER_TOKEN,
    worker: {
      id: 'demo-worker-001',
      auth_user_id: 'demo-auth-worker-001',
      name: 'Demo Worker',
      employee_id: 'EMP-DEMO-001',
      assigned_area: 'South Village Sector',
      village_id: 'demo-village-001',
      phone: '+91 90000 00000',
    },
  };
}

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
  if (email === DEMO_WORKER_CREDENTIALS.email && password === DEMO_WORKER_CREDENTIALS.password) {
    return getDemoWorkerSession();
  }

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
  if (localStorage.getItem('worker_token') === DEMO_WORKER_TOKEN) {
    return getDemoWorkerSession();
  }

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
