// backend/src/controllers/reportController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function createIssue(req, res) {
  try {
    const { description, location_lat, location_lng, location_address, bin_id } = req.body;
    
    // Default handles for uploaded files
    let photoUrl = null;
    let audioUrl = null;

    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        const file = req.files.photo[0];
        const ext = file.mimetype.split('/')[1] || 'jpg';
        const fileName = `photo-${Date.now()}.${ext}`;
        const { data, error } = await supabaseAdmin.storage
          .from('issue_media')
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (!error && data) {
           photoUrl = supabaseAdmin.storage.from('issue_media').getPublicUrl(fileName).data.publicUrl;
        }
      }

      if (req.files.audio_file && req.files.audio_file[0]) {
        const file = req.files.audio_file[0];
        const ext = file.originalname.split('.').pop() || 'webm';
        const fileName = `audio-${Date.now()}.${ext}`;
        const { data, error } = await supabaseAdmin.storage
          .from('issue_media')
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (!error && data) {
           audioUrl = supabaseAdmin.storage.from('issue_media').getPublicUrl(fileName).data.publicUrl;
        }
      }
    }

    // Insert into DB
    const insertData = {
        description: description || '',
        location_lat: parseFloat(location_lat) || null,
        location_lng: parseFloat(location_lng) || null,
        location_address: location_address || '',
        bin_id: bin_id || null,
        photo_url: photoUrl,
        audio_url: audioUrl,
        status: 'pending',
        user_id: req.user?.id || null,
    };
    
    // Clean nulls to prevent constraint errors if column isn't strictly nullable
    if (!insertData.bin_id) delete insertData.bin_id;
    if (!insertData.location_lat) delete insertData.location_lat;
    if (!insertData.location_lng) delete insertData.location_lng;

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
