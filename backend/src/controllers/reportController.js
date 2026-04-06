// backend/src/controllers/reportController.js
import { supabaseAdmin } from '../config/supabase.js';

async function getVillageIdsForAdmin(admin) {
  let query = supabaseAdmin.from('villages').select('id');
  if (admin.role === 'zilla_parishad') query = query.eq('district', admin.jurisdiction_name);
  if (admin.role === 'block_samiti') query = query.eq('block_name', admin.jurisdiction_name);
  if (admin.role === 'gram_panchayat') query = query.eq('gram_panchayat_name', admin.jurisdiction_name);
  const { data } = await query;
  return (data || []).map((v) => v.id);
}

export async function createIssue(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { description, location_lat, location_lng, location_address, bin_id } = req.body;
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
    const insertData = {
        description: description || '',
      location_lat: location_lat != null ? parseFloat(location_lat) : null,
      location_lng: location_lng != null ? parseFloat(location_lng) : null,
        location_address: location_address || '',
        bin_id: bin_id || null,
        photo_url: photoUrl,
        status: 'open',
        user_id: req.user.id,
    };
    
    // Clean nulls to prevent constraint errors if column isn't strictly nullable
    if (!insertData.bin_id) delete insertData.bin_id;
    if (insertData.location_lat == null || isNaN(insertData.location_lat)) {
      delete insertData.location_lat;
    }
    if (insertData.location_lng == null || isNaN(insertData.location_lng)) {
      delete insertData.location_lng;
    }

    const { data, error } = await supabaseAdmin
      .from('issue_reports')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error.message);
      return res.status(500).json({ error: error.message });
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
        query = query.eq('reviewed_by', req.admin.id);
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
    const allowed = ['status', 'rejection_reason', 'created_task_id'];
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
