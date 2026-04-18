// backend/src/controllers/reportController.js
import { supabaseAdmin } from '../config/supabase.js';
import { getVillageIdsForAdmin } from '../utils/adminHelpers.js';
import { createBulkNotifications } from '../services/notificationService.js';
import { sendWhatsAppSafely } from '../services/whatsappService.js';

export async function createIssue(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { description, location_lat, location_lng, location_address, priority } = req.body;
    const photoBuckets = ['issue-photos', 'issue-audio'];
    
    // Default handles for uploaded files
    let photoUrl = null;

    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        try {
          const file = req.files.photo[0];
          const ext = file.mimetype.split('/')[1] || 'jpg';
          const fileName = `photo-${Date.now()}.${ext}`;
          for (const bucket of photoBuckets) {
            const { data, error } = await supabaseAdmin.storage
              .from(bucket)
              .upload(fileName, file.buffer, { contentType: file.mimetype });
            if (!error && data) {
              photoUrl = supabaseAdmin.storage
                .from(bucket)
                .getPublicUrl(fileName).data.publicUrl;
              break;
            }
            if (error) {
              console.warn(`[createIssue] Photo upload failed for bucket ${bucket}:`, error.message);
            }
          }
        } catch (storageErr) {
          console.warn('[createIssue] Photo upload failed, continuing without photo:', storageErr.message);
        }
      }

    }

    // Insert into DB
    const parsedLat = location_lat != null ? Number(location_lat) : null;
    const parsedLng = location_lng != null ? Number(location_lng) : null;
    if (parsedLat == null || Number.isNaN(parsedLat) || parsedLng == null || Number.isNaN(parsedLng)) {
      return res.status(400).json({ error: 'location_lat and location_lng are required' });
    }

    const insertData = {
      description: description || '',
      location_lat: parsedLat,
      location_lng: parsedLng,
      location_address: location_address || '',
      priority: Number(priority || 2),
      photo_url: photoUrl,
      status: 'open',
      user_id: req.user.id,
      village_id: req.user.user_metadata?.village_id || null,
    };

    const { data, error } = await supabaseAdmin
      .from('issue_reports')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    if (insertData.village_id) {
      const { data: admins } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('is_active', true)
        .eq('role', 'ward_member');

      await createBulkNotifications((admins || []).map((admin) => ({
        actorType: 'admin',
        actorId: admin.id,
        kind: 'issue_created',
        title: 'New issue reported',
        body: description?.slice(0, 120) || 'A new issue has been reported.',
        link: '/issues',
        data: { issue_id: data.id, village_id: insertData.village_id },
      })));
    }

    // Notify reporting user via WhatsApp when phone is available.
    let reporterPhone =
      req.user?.phone
      || req.user?.phone_number
      || req.user?.user_metadata?.phone
      || req.user?.user_metadata?.phone_number
      || null;

    if (!reporterPhone && req.user?.id) {
      const { data: reporter } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('id', req.user.id)
        .maybeSingle();
      reporterPhone = reporter?.phone || null;
    }

    const fallbackPhone = process.env.TWILIO_REPORT_FALLBACK_TO || null;
    const destinationPhone = reporterPhone || fallbackPhone;

    if (destinationPhone) {
      const reportTemplateSid = process.env.TWILIO_REPORT_SUBMITTED_CONTENT_SID || null;
      const useTemplate = String(process.env.TWILIO_USE_CONTENT_TEMPLATE || 'false').toLowerCase() === 'true';
      const reportedAt = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date());
      const waResult = await sendWhatsAppSafely({
        to: destinationPhone,
        body: `Your report has been submitted successfully on ${reportedAt}. It will be reviewed by the authorities shortly.`,
        contentSid: useTemplate ? (reportTemplateSid || undefined) : undefined,
        contentVariables: useTemplate && reportTemplateSid
          ? {
              '1': String(data.id),
              '2': String(insertData.priority),
            }
          : undefined,
        tag: 'issue-reported-alert',
      });

      if (waResult?.skipped) {
        console.warn('[issue-reported-alert] WhatsApp skipped:', waResult.reason);
      } else {
        console.info('[issue-reported-alert] WhatsApp sent:', waResult?.sid, reporterPhone ? '(reporter)' : '(fallback)');
      }
    } else {
      console.warn('[issue-reported-alert] WhatsApp skipped: no reporter phone found and TWILIO_REPORT_FALLBACK_TO is not set');
    }
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
}

export async function getIssues(req, res) {
  try {
    const { mine } = req.query;
    let query = supabaseAdmin.from('issue_reports').select('*').order('created_at', { ascending: false });

    if (req.admin?.type === 'admin') {
      if (req.admin.role === 'ward_member') {
        const villageIds = await getVillageIdsForAdmin(req.admin);
        if (!villageIds.length) return res.json({ issues: [] });
        query = query.in('village_id', villageIds);
      } else {
        const villageIds = await getVillageIdsForAdmin(req.admin);
        if (!villageIds.length) return res.json({ issues: [] });
        query = query.in('village_id', villageIds);
      }
    }
    
    if (mine === 'true' && req.user?.id) {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ issues: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
}

export async function updateIssue(req, res) {
  try {
    const updates = {};
    const allowed = ['status', 'rejection_reason', 'created_task_id', 'priority'];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }

    if (req.admin?.id) {
      updates.reviewed_by = req.admin.id;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('issue_reports')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update issue' });
  }
}
