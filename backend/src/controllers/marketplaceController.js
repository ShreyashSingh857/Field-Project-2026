import MarketplaceService from '../services/marketplaceService.js';
import ImageValidationService from '../services/imageValidationService.js';
import MarketplaceNotificationService from '../services/marketplaceNotificationService.js';
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
    if (mine === 'true') {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
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
    const parsedPrice = Number.parseFloat(price);
    if (!title || !contact_number) {
      return res.status(400).json({ error: 'title and contact_number required' });
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    // Image is required
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required for marketplace listing' });
    }

    // Validate image before upload
    const aiValidation = await ImageValidationService.validateImageBuffer(req.file.buffer, req.file.mimetype);
    if (!aiValidation.valid) {
      return res.status(400).json({ error: 'Image rejected: ' + aiValidation.reason });
    }

    // Upload photo only after validation
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

    // Create listing
    const listing = await MarketplaceService.createListing(userId, {
      title: title.trim(),
      description: description?.trim() || null,
      price: parsedPrice,
      photo_url: photoUrl,
      contact_number: contact_number.trim(),
      village_id: req.user?.user_metadata?.village_id || null,
      district: req.user?.user_metadata?.district || null,
    });

    // Update with AI validation result
    const updated = await MarketplaceService.updateAIValidationResult(
      listing.id,
      aiValidation.valid ? 'passed' : 'failed',
      aiValidation.reason
    );

    // Send AI notification
    await MarketplaceNotificationService.notifyAIValidation(userId, listing.id, {
      ...aiValidation,
      title: title.trim(),
    });

    // If AI validation failed, reject and notify
    if (!aiValidation.valid) {
      const rejected = await MarketplaceService.rejectListing(
        listing.id,
        null,
        `Auto-rejected: ${aiValidation.reason}. Please upload a clear photo of second-hand waste items.`
      );

      // Notify rejection
      await MarketplaceNotificationService.notifyRejection(
        userId,
        listing.id,
        title,
        aiValidation.reason
      );

      return res.status(201).json({
        listing: rejected,
        message: `Listing submitted but validation failed: ${aiValidation.reason}. Please try with a different photo.`,
        aiValidation,
      });
    }

    res.status(201).json({
      listing: updated,
      message: 'Listing created successfully! Passed AI validation. Now pending moderator approval.',
      aiValidation,
    });
  } catch (err) {
    console.error('Create listing error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/**
 * User: Update their own pending listing
 */
export async function updateListing(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { title, description, price, contact_number } = req.body;
    const updates = {};
    let aiValidation = null;
    let existingForModeration = null;

    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim() || null;
    if (contact_number !== undefined) updates.contact_number = String(contact_number).trim();
    if (price !== undefined) {
      const parsedPrice = Number.parseFloat(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Valid price required' });
      }
      updates.price = parsedPrice;
    }

    if (req.file) {
      const { data: listingSnapshot } = await supabaseAdmin
        .from('marketplace_listings')
        .select('user_id,title,description,price')
        .eq('id', id)
        .maybeSingle();
      if (listingSnapshot?.user_id === userId) {
        existingForModeration = listingSnapshot;
      }

      aiValidation = await ImageValidationService.validateImageBuffer(req.file.buffer, req.file.mimetype);
      if (!aiValidation.valid) {
        return res.status(400).json({ error: 'Image rejected: ' + aiValidation.reason });
      }

      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const fileName = `listings/${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('marketplace-photos')
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadErr) {
        return res.status(400).json({ error: 'Failed to upload photo' });
      }

      updates.photo_url = supabaseAdmin.storage
        .from('marketplace-photos')
        .getPublicUrl(fileName).data.publicUrl;
    }

    const updated = await MarketplaceService.updateListing(id, userId, updates);

    if (aiValidation) {
      await MarketplaceService.updateAIValidationResult(
        id,
        aiValidation.valid ? 'passed' : 'failed',
        aiValidation.reason
      );

      await MarketplaceNotificationService.notifyAIValidation(userId, id, {
        ...aiValidation,
        title: updates.title || updated.title,
      });

      if (!aiValidation.valid) {
        const rejected = await MarketplaceService.rejectListing(
          id,
          null,
          `Auto-rejected after edit: ${aiValidation.reason}`
        );
        await MarketplaceNotificationService.notifyRejection(
          userId,
          id,
          updates.title || updated.title,
          aiValidation.reason
        );
        return res.json({ listing: rejected, message: 'Updated but failed AI validation' });
      }
    }

    return res.json({ listing: updated, message: 'Listing updated' });
  } catch (err) {
    console.error('Update listing error:', err.message);
    return res.status(400).json({ error: err.message });
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

    // Get listing to find user_id
    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('user_id, title')
      .eq('id', id)
      .single();

    const updated = await MarketplaceService.approveListing(id, adminId, notes);
    
    // Notify user
    if (listing?.user_id) {
      await MarketplaceNotificationService.notifyApproval(
        listing.user_id,
        id,
        listing.title,
        notes
      );
    }

    res.json({ listing: updated, message: 'Listing approved and user notified' });
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

    // Get listing to find user_id
    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('user_id, title')
      .eq('id', id)
      .single();

    const updated = await MarketplaceService.rejectListing(id, adminId, reason);
    
    // Notify user
    if (listing?.user_id) {
      await MarketplaceNotificationService.notifyRejection(
        listing.user_id,
        id,
        listing.title,
        reason
      );
    }

    res.json({ listing: updated, message: 'Listing rejected and user notified' });
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
