import { supabaseAdmin } from '../config/supabase.js';

export async function getListings(req, res) {
  try {
    const { village_id, mine, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    let query = supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (village_id) query = query.eq('village_id', village_id);
    if (mine === 'true' && req.user?.id) query = query.eq('user_id', req.user.id);

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
    const normalizedTitle = String(title || '').trim();
    const parsedPrice = Number.parseFloat(price);
    const fallbackContact = String(
      req.user?.phone || req.user?.user_metadata?.phone || req.user?.user_metadata?.phone_number || ''
    ).trim();
    const normalizedContact = String(contact_number || '').trim() || fallbackContact || 'Not provided';

    const missing = [];
    if (!normalizedTitle) missing.push('title');
    if (!Number.isFinite(parsedPrice)) missing.push('price');
    if (parsedPrice < 0) missing.push('price_must_be_non_negative');

    if (missing.length) {
      return res.status(400).json({
        error: 'Validation failed',
        missing,
        debug: {
          receivedKeys: Object.keys(req.body || {}),
          hasFile: Boolean(req.file),
          normalizedContact,
        },
      });
    }

    let photoUrl = null;
    if (req.file) {
      try {
        const ext = req.file.mimetype.split('/')[1] || 'jpg';
        const fileName = `listings/${req.user.id}/${Date.now()}.${ext}`;
        const { data, error } = await supabaseAdmin.storage
          .from('marketplace-photos')
          .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        if (!error && data) {
          photoUrl = supabaseAdmin.storage
            .from('marketplace-photos')
            .getPublicUrl(fileName).data.publicUrl;
        }
        if (error) {
          console.warn('[createListing] Photo upload failed, continuing without photo:', error.message);
        }
      } catch (storageErr) {
        console.warn('[createListing] Photo upload threw, continuing without photo:', storageErr.message);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('marketplace_listings')
      .insert({
        title: normalizedTitle,
        description: description || null,
        price: parsedPrice,
        contact_number: normalizedContact,
        photo_url: photoUrl,
        user_id: req.user.id,
        village_id: req.user.user_metadata?.village_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create listing DB error:', error);
      return res.status(400).json({ error: error.message, code: error.code || null });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('Create listing error:', err.message);
    res.status(500).json({ error: 'Failed to create listing', debug: err.message });
  }
}

export async function deleteListing(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    if (error) {
      return res.status(500).json({ error: 'Failed to remove listing' });
    }
    return res.json({ message: 'Listing removed' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove listing' });
  }
}
