import { supabaseAdmin } from '../config/supabase.js';

const SELECT = 'id,name,employee_id,assigned_area,village_id,phone,is_active,created_by_admin_id,last_login_at,created_at,updated_at';

export async function getWorkerById(workerId) {
	if (!workerId) return null;
	const { data, error } = await supabaseAdmin.from('workers').select(SELECT).eq('id', workerId).maybeSingle();
	if (error) throw error;
	return data || null;
}

export async function getWorkerByEmployeeId(employeeId) {
	if (!employeeId) return null;
	const { data, error } = await supabaseAdmin.from('workers').select(SELECT).ilike('employee_id', employeeId).maybeSingle();
	if (error) throw error;
	return data || null;
}