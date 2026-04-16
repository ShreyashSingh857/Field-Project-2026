import { supabaseAdmin } from '../config/supabase.js';
import { verifyToken } from '../services/jwtService.js';

function buildItem(kind, title, body, link, sourceId, createdAt, extra = {}) {
	return { id: `${kind}:${sourceId}`, kind, title, body, link, created_at: createdAt, ...extra };
}

async function resolveActor(req) {
	const auth = req.headers.authorization || '';
	if (!auth.startsWith('Bearer ')) return null;
	const token = auth.slice(7);
	try {
		const decoded = verifyToken(token);
		if (decoded?.type === 'worker') return { type: 'worker', worker: decoded };
		if (decoded?.type === 'admin') return { type: 'admin', admin: decoded };
	} catch (_err) {
		// fall through to Supabase user token
	}
	const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
	if (error || !user) return null;
	return { type: 'user', user };
}

async function resolveUserVillage(user) {
	const { data } = await supabaseAdmin.from('users').select('village_id,name').eq('id', user.id).maybeSingle();
	return { villageId: data?.village_id || user.user_metadata?.village_id || null, name: data?.name || user.user_metadata?.name || 'User' };
}

async function resolveWorkerProfile(workerId) {
	const { data } = await supabaseAdmin.from('workers').select('id,name,village_id,assigned_area').eq('id', workerId).maybeSingle();
	return data || null;
}

async function getVillageIdsForAdmin(admin) {
	let query = supabaseAdmin.from('villages').select('id');
	if (admin.role === 'zilla_parishad') query = query.eq('district', admin.jurisdiction_name);
	if (admin.role === 'block_samiti') query = query.eq('block_name', admin.jurisdiction_name);
	if (admin.role === 'gram_panchayat') query = query.eq('gram_panchayat_name', admin.jurisdiction_name);
	const { data } = await query;
	return (data || []).map((v) => v.id);
}

export async function getNotifications(req, res) {
	try {
		const actor = await resolveActor(req);
		if (!actor) return res.status(401).json({ error: 'No token provided' });

		const items = [];
		if (actor.type === 'user') {
			const { villageId } = await resolveUserVillage(actor.user);
			const [{ data: announcements }, { data: bins }, { data: issues }, { data: listings }] = await Promise.all([
				supabaseAdmin.from('announcements').select('id,title,content,created_at,is_pinned,target_village_id').eq('is_active', true).or(villageId ? `target_village_id.eq.${villageId},target_village_id.is.null` : 'target_village_id.is.null').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(10),
				supabaseAdmin.from('bins').select('id,label,fill_level,fill_status,location_address,village_id,updated_at').eq('is_active', true).gte('fill_level', 80).order('fill_level', { ascending: false }).limit(10),
				supabaseAdmin.from('issue_reports').select('id,description,status,created_at,updated_at,location_address').eq('user_id', actor.user.id).order('updated_at', { ascending: false }).limit(10),
				supabaseAdmin.from('marketplace_listings').select('id,title,status,ai_validation_status,ai_validation_notes,moderation_notes,created_at,updated_at,ai_validation_at,moderation_at').eq('user_id', actor.user.id).order('updated_at', { ascending: false }).limit(10),
			]);
			(announcements || []).forEach((a) => items.push(buildItem('announcement', a.title, a.content, '/announcements', a.id, a.created_at, { severity: a.is_pinned ? 'high' : 'info' })));
			(bins || []).forEach((b) => items.push(buildItem('bin', `${b.label} is getting full`, `Fill level is ${b.fill_level}%`, '/bins', b.id, b.updated_at || b.created_at, { severity: b.fill_level >= 95 ? 'high' : 'warning' })));
			(issues || []).forEach((i) => items.push(buildItem('issue', `Issue ${i.status}`, i.description, '/report', i.id, i.updated_at || i.created_at, { severity: i.status === 'rejected' ? 'high' : 'info' })));
			(listings || []).forEach((m) => {
				if (m.ai_validation_status === 'failed') {
					items.push(buildItem('marketplace', 'Marketplace validation failed', m.ai_validation_notes || 'AI validation failed. Please upload a clearer image.', '/my-listings', `${m.id}:ai_failed`, m.ai_validation_at || m.updated_at || m.created_at, { severity: 'high' }));
					return;
				}
				if (m.status === 'approved') {
					items.push(buildItem('marketplace', 'Listing approved', `${m.title} is now live in marketplace.`, '/my-listings', `${m.id}:approved`, m.moderation_at || m.updated_at || m.created_at, { severity: 'info' }));
					return;
				}
				if (m.status === 'rejected') {
					items.push(buildItem('marketplace', 'Listing rejected', m.moderation_notes || 'Your listing was rejected. Please edit and submit again.', '/my-listings', `${m.id}:rejected`, m.moderation_at || m.updated_at || m.created_at, { severity: 'high' }));
					return;
				}
				if (m.ai_validation_status === 'passed' && m.status === 'pending') {
					items.push(buildItem('marketplace', 'Listing submitted', `${m.title} passed AI check and is awaiting moderator approval.`, '/my-listings', `${m.id}:pending`, m.ai_validation_at || m.updated_at || m.created_at, { severity: 'info' }));
				}
			});
		}

		if (actor.type === 'worker') {
			const worker = await resolveWorkerProfile(actor.worker.id);
			const villageId = worker?.village_id || actor.worker.village_id || null;
			const [{ data: tasks }, { data: announcements }] = await Promise.all([
				supabaseAdmin.from('tasks').select('id,title,status,due_at,created_at,updated_at,location_address,assigned_worker_id').eq('assigned_worker_id', worker?.id || actor.worker.id).in('status', ['pending', 'assigned', 'in_progress']).order('updated_at', { ascending: false }).limit(10),
				supabaseAdmin.from('announcements').select('id,title,content,created_at,is_pinned,target_village_id').eq('is_active', true).or(villageId ? `target_village_id.eq.${villageId},target_village_id.is.null` : 'target_village_id.is.null').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
			]);
			(announcements || []).forEach((a) => items.push(buildItem('announcement', a.title, a.content, '/announcements', a.id, a.created_at, { severity: a.is_pinned ? 'high' : 'info' })));
			(tasks || []).forEach((t) => items.push(buildItem('task_assigned', `Task assigned: ${t.title}`, t.location_address || `Due ${t.due_at ? new Date(t.due_at).toLocaleString() : 'soon'}`, `/tasks/${t.id}`, `${t.id}:${t.updated_at || t.created_at}`, t.updated_at || t.created_at, { severity: t.due_at && new Date(t.due_at) < new Date() ? 'high' : 'warning' })));
		}

		if (actor.type === 'admin') {
			const admin = actor.admin;
			const villageIds = await getVillageIdsForAdmin(admin);
			const [announcementsRes, issuesRes, tasksRes] = await Promise.all([
				supabaseAdmin.from('announcements').select('id,title,content,created_at,is_pinned,target_village_id').eq('created_by', admin.id).eq('is_active', true).order('created_at', { ascending: false }).limit(10),
				supabaseAdmin.from('issue_reports').select('id,description,status,created_at,updated_at,location_address,village_id').in('status', ['open', 'assigned']).in(villageIds.length ? 'village_id' : 'id', villageIds.length ? villageIds : ['00000000-0000-0000-0000-000000000000']).order('updated_at', { ascending: false }).limit(10),
				supabaseAdmin.from('tasks').select('id,title,status,due_at,created_at,updated_at,location_address,village_id').in(villageIds.length ? 'village_id' : 'id', villageIds.length ? villageIds : ['00000000-0000-0000-0000-000000000000']).in('status', ['pending', 'assigned', 'in_progress']).order('due_at', { ascending: true }).limit(10),
			]);
			if (announcementsRes.data) announcementsRes.data.forEach((a) => items.push(buildItem('announcement', a.title, a.content, '/announcements', a.id, a.created_at, { severity: a.is_pinned ? 'high' : 'info' })));
			if (issuesRes.data) issuesRes.data.forEach((i) => items.push(buildItem('issue', `Issue ${i.status}`, i.description, '/issues', i.id, i.updated_at || i.created_at, { severity: i.status === 'assigned' ? 'warning' : 'info' })));
			if (tasksRes.data) tasksRes.data.forEach((t) => items.push(buildItem('task', `Task ${t.status}`, t.title, '/escalations', t.id, t.updated_at || t.created_at, { severity: t.due_at && new Date(t.due_at) < new Date() ? 'high' : 'warning' })));
		}

		items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		return res.json({ notifications: items.slice(0, 20) });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
	}
}