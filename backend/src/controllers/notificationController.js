import { supabaseAdmin } from '../config/supabase.js';
import { verifyToken } from '../services/jwtService.js';
import { getRequestToken } from '../utils/authToken.js';
import {
	listNotificationsForActor,
	markAllNotificationsRead,
	markNotificationRead,
} from '../services/notificationService.js';

async function resolveActor(req) {
	const token = getRequestToken(req);
	if (!token) return null;
	try {
		const decoded = verifyToken(token);
		if (decoded?.type === 'worker') return { actorType: 'worker', actorId: decoded.id };
		if (decoded?.type === 'admin') return { actorType: 'admin', actorId: decoded.id };
	} catch (_err) {
		// fall through to Supabase user token
	}
	const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
	if (error || !user) return null;
	return { actorType: 'user', actorId: user.id };
}

export async function getNotifications(req, res) {
	try {
		const actor = await resolveActor(req);
		if (!actor) return res.status(401).json({ error: 'No token provided' });
		const notifications = await listNotificationsForActor({
			actorType: actor.actorType,
			actorId: actor.actorId,
			limit: Number(req.query.limit || 20),
		});
		const unread = notifications.filter((item) => !item.read).length;
		return res.json({ notifications, unread });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
	}
}

export async function markNotificationAsRead(req, res) {
	try {
		const actor = await resolveActor(req);
		if (!actor) return res.status(401).json({ error: 'No token provided' });

		const updated = await markNotificationRead({
			id: req.params.id,
			actorType: actor.actorType,
			actorId: actor.actorId,
		});
		return res.json({ notification: updated });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to mark notification as read' });
	}
}

export async function markAllAsRead(req, res) {
	try {
		const actor = await resolveActor(req);
		if (!actor) return res.status(401).json({ error: 'No token provided' });

		await markAllNotificationsRead({ actorType: actor.actorType, actorId: actor.actorId });
		return res.json({ ok: true });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to mark all notifications as read' });
	}
}