import { supabaseAdmin } from '../config/supabase.js';
import multer from 'multer';

export async function getListings(req, res) {
  try {
    const { village_id } = req.query;
    let query = supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (village_id) query = query.eq('village_id', village_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ listings: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

export async function createListing(req, res) {
  try {
    const { title, description, price, contact_number } = req.body;

    if (!title || !price || !contact_number) {
      return res.status(400).json({ error: 'title, price, contact_number are required' });
    }

    let photoUrl = null;
    if (req.file) {
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `listings/${req.user.id}-${Date.now()}.${ext}`;
      const { data, error } = await supabaseAdmin.storage
        .from('marketplace_media')
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
      if (!error && data) {
        photoUrl = supabaseAdmin.storage
          .from('marketplace_media')
          .getPublicUrl(fileName).data.publicUrl;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('marketplace_listings')
      .insert({
        title,
        description: description || null,
        price: parseFloat(price),
        contact_number,
        photo_url: photoUrl,
        user_id: req.user.id,
        village_id: req.user.user_metadata?.village_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Create listing error:', err.message);
    res.status(500).json({ error: 'Failed to create listing' });
  }
}
