import { listOpenEscalations, resolveEscalation } from '../services/escalationService.js';

export async function getEscalations(req, res) {
	try {
		return res.json({ escalations: await listOpenEscalations(Number(req.query.limit || 100)) });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to fetch escalations' });
	}
}

export async function resolveEscalationById(req, res) {
	try {
		return res.json({ escalation: await resolveEscalation(req.params.id, req.admin.id, req.body?.kind || 'issue') });
	} catch (err) {
		return res.status(500).json({ error: err.message || 'Failed to resolve escalation' });
	}
}