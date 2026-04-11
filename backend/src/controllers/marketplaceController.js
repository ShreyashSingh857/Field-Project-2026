import MarketplaceService from '../services/marketplaceService.js';
import ImageValidationService from '../services/imageValidationService.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Public: Browse approved marketplace listings
 */
export async function getListings(req, res) {
  try {
    const { village_id, mine, page = 1, limit = 20, search } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    let listings;
    if (mine === 'true' && req.user?.id) {
      // User's own listings (all statuses)
      listings = await MarketplaceService.getUserListings(req.user.id);
      listings = listings.slice(offset, offset + limitNum);
    } else {
      // Browse approved listings
      listings = await MarketplaceService.getApprovedListings({
        villageId: village_id,
        search,
        limit: limitNum,
        offset,
      });
    }

    res.json({ listings, count: listings.length });
  } catch (err) {
    console.error('Get listings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

/**
 * User: Create marketplace listing (requires image with AI validation)
 */
export async function createListing(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, price, contact_number } = req.body;
    if (!title || !contact_number) {
      return res.status(400).json({ error: 'title and contact_number required' });
    }
    if (price === undefined || price === null || Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    // Image is required
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required for marketplace listing' });
    }

    // Upload photo first
    let photoUrl = null;
    try {
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `listings/${userId}/${Date.now()}.${ext}`;
      const { data, error: uploadErr } = await supabaseAdmin.storage
        .from('marketplace-photos')
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadErr) throw uploadErr;
      photoUrl = supabaseAdmin.storage
        .from('marketplace-photos')
        .getPublicUrl(fileName).data.publicUrl;
    } catch (err) {
      console.error('Photo upload error:', err);
      return res.status(400).json({ error: 'Failed to upload photo' });
    }

    // AI Validation: Check image contains second-hand items
    console.log(`[AI] Validating image: ${photoUrl}`);
    const aiValidation = await ImageValidationService.validateListingImage(photoUrl);
    console.log(`[AI] Validation result:`, aiValidation);

    // Create listing
    const listing = await MarketplaceService.createListing(userId, {
      title: title.trim(),
      description: description?.trim() || null,
      price: parseFloat(price),
      photo_url: photoUrl,
      contact_number: contact_number.trim(),
    });

    // Update with AI validation result
    const updated = await MarketplaceService.updateAIValidationResult(
      listing.id,
      aiValidation.valid ? 'passed' : 'failed',
      aiValidation.reason
    );

    // If AI validation failed, still create listing but mark as rejected
    if (!aiValidation.valid) {
      await MarketplaceService.rejectListing(
        listing.id,
        null,
        `AI Image Validation: ${aiValidation.reason}. Listing auto-rejected.`
      );

      return res.status(201).json({
        listing: updated,
        message: `Listing created but rejected by AI validation: ${aiValidation.reason}. Please upload a clear photo of second-hand waste items.`,
        aiValidation,
      });
    }

    res.status(201).json({
      listing: updated,
      message: 'Listing created successfully, pending moderator approval',
      aiValidation,
    });
  } catch (err) {
    console.error('Create listing error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/**
 * User: Delete their own listing
 */
export async function deleteListing(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    await MarketplaceService.deleteListing(id, userId);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error('Delete listing error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/**
 * Admin: Get pending moderation queue (for district admin)
 */
export async function getPendingModerationQueue(req, res) {
  try {
    const adminId = req.admin?.id;
    const adminDistrict = req.admin?.jurisdiction_name;

    if (!adminId) return res.status(401).json({ error: 'Admin access required' });

    const listings = await MarketplaceService.getPendingListingsForAdmin(
      adminId,
      adminDistrict
    );
    res.json({ listings, count: listings.length });
  } catch (err) {
    console.error('Get moderation queue error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Admin: Approve listing
 */
export async function approveListing(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(401).json({ error: 'Admin access required' });

    const { id } = req.params;
    const { notes } = req.body;

    const updated = await MarketplaceService.approveListing(id, adminId, notes);
    res.json({ listing: updated, message: 'Listing approved' });
  } catch (err) {
    console.error('Approve listing error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/**
 * Admin: Reject listing
 */
export async function rejectListing(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(401).json({ error: 'Admin access required' });

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

    const updated = await MarketplaceService.rejectListing(id, adminId, reason);
    res.json({ listing: updated, message: 'Listing rejected' });
  } catch (err) {
    console.error('Reject listing error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/**
 * Admin: Ban seller
 */
export async function banSeller(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(401).json({ error: 'Admin access required' });

    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ error: 'Ban reason required' });

    const ban = await MarketplaceService.banSeller(userId, adminId, reason);
    res.json({ ban, message: 'Seller banned' });
  } catch (err) {
    console.error('Ban seller error:', err.message);
    res.status(400).json({ error: err.message });
  }
}
