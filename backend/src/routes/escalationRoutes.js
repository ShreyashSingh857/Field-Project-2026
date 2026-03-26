import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyAdminJWT } from '../middleware/verifyAdminJWT.js';

const router = Router();

router.get('/', verifyAdminJWT, async (_req, res) => {
	try {
		const { data, error } = await supabaseAdmin
			.from('issue_reports')
			.select('id,description,status,location_address,village_id,created_at,updated_at')
			.eq('status', 'open')
			.order('created_at', { ascending: false });

		if (error) throw error;
		res.json({ escalations: data || [] });
	} catch (err) {
		res.status(500).json({ error: err.message || 'Failed to fetch escalations' });
	}
});

router.patch('/:id/resolve', verifyAdminJWT, async (req, res) => {
	try {
		const { data, error } = await supabaseAdmin
			.from('issue_reports')
			.update({ status: 'resolved', reviewed_by: req.admin.id, updated_at: new Date().toISOString() })
			.eq('id', req.params.id)
			.select('*')
			.single();

		if (error) throw error;
		res.json({ escalation: data });
	} catch (err) {
		res.status(500).json({ error: err.message || 'Failed to resolve escalation' });
	}
});

export default router;
