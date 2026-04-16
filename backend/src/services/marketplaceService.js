// backend/src/services/marketplaceService.js
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Marketplace Moderation Service
 * Handles listing creation, browsing, moderation, and seller management
 */

class MarketplaceService {
  /**
   * Get pending listings for a district admin's moderation queue
   */
  static async getPendingListingsForAdmin(adminId, districtName) {
    const { data: listings, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select(
        `id, title, description, price, photo_url, contact_number, 
         user_id, village_id, district, status, created_at, expires_at,
         users(name, phone), villages(name, location_lat, location_lng)`
      )
      .in('status', ['pending', 'flagged', 'approved'])
      .eq('district', districtName)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return listings || [];
  }

  /**
   * Get flagged listings for a district admin
   */
  static async getFlaggedListingsForAdmin(adminId, districtName) {
    const { data: listings, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select(
        `id, title, description, price, photo_url, contact_number,
         user_id, village_id, district, status, created_at, moderation_notes,
         users(name, phone), villages(name)`
      )
      .eq('status', 'flagged')
      .eq('district', districtName)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return listings || [];
  }

  /**
   * Get approved listings (for users browsing marketplace)
   */
  static async getApprovedListings(filters = {}) {
    let query = supabaseAdmin
      .from('marketplace_listings')
      .select(
        `id, title, description, price, photo_url, contact_number,
         user_id, village_id, district, created_at, updated_at,
         users(name, phone, avatar_url, village_id), 
         villages(name, location_lat, location_lng)`
      )
      .eq('status', 'approved');

    // Filter by village if provided
    if (filters.villageId) {
      query = query.eq('village_id', filters.villageId);
    }

    // Filter by district if provided
    if (filters.district) {
      query = query.eq('district', filters.district);
    }

    // Search by title/description
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Sort by newest first
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's listings (for my listings page)
   */
  static async getUserListings(userId) {
    const { data: listings, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select(
        `id, title, description, price, photo_url, contact_number,
         status, created_at, updated_at, moderation_notes, expires_at,
         ai_validation_status, ai_validation_notes`
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return listings || [];
  }

  /**
   * Get single listing
   */
  static async getListingById(listingId) {
    const { data: listing, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select(
        `id, title, description, price, photo_url, contact_number,
         user_id, village_id, status, created_at, updated_at,
         moderation_notes, moderation_at, moderation_by,
         ai_validation_status, ai_validation_notes,
         users(name, phone, avatar_url),
         villages(name, district),
         admins(name)` // moderation_by admin name
      )
      .eq('id', listingId)
      .single();

    if (error) throw error;
    return listing;
  }

  /**
   * Create new marketplace listing (basic validation, AI validation done separately)
   */
  static async createListing(userId, listingData) {
    // Check if seller is banned or suspended
    const { data: moderation, error: modErr } = await supabaseAdmin
      .from('seller_moderation')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Ignore "single" not found error
    if (modErr && modErr.code !== 'PGRST116') throw modErr;

    if (moderation) {
      if (moderation.action === 'banned') {
        throw new Error('Seller is permanently banned from marketplace');
      }
      if (moderation.action === 'suspended' && moderation.suspended_until > new Date()) {
        throw new Error(
          `Seller is suspended until ${new Date(moderation.suspended_until).toLocaleString()}`
        );
      }
    }

    // Get user's village and district
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('village_id, villages(district)')
      .eq('id', userId)
      .maybeSingle();

    if (userErr && userErr.code !== 'PGRST116') throw userErr;

    const district = user?.villages?.[0]?.district || listingData.district || null;
    const villageId = user?.village_id || listingData.village_id || null;

    // Create listing
    const { data: listing, error } = await supabaseAdmin
      .from('marketplace_listings')
      .insert({
        user_id: userId,
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        photo_url: listingData.photo_url, // Required
        contact_number: listingData.contact_number,
        village_id: villageId,
        district,
        status: 'pending', // Start as pending
        ai_validation_status: 'pending', // Awaiting AI validation
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Log creation
    await this.logAction(listing.id, 'created', userId, null, null, 'pending', 'Listing created');

    return listing;
  }

  /**
   * Update listing (user can only edit pending listings)
   */
  static async updateListing(listingId, userId, updates) {
    // Verify ownership and status
    const { data: listing, error: getErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('user_id, status')
      .eq('id', listingId)
      .single();

    if (getErr) throw getErr;
    if (listing.user_id !== userId) throw new Error('Unauthorized: Not listing owner');
    if (listing.status !== 'pending') {
      throw new Error('Can only edit pending listings');
    }

    // Reset AI validation if image changed
    const updateData = { ...updates };
    if (updates.photo_url) {
      updateData.ai_validation_status = 'pending';
      updateData.ai_validation_notes = null;
      updateData.ai_validation_at = null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update(updateData)
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;

    // Log edit
    await this.logAction(listingId, 'edited', userId, null, 'pending', 'pending', 'Listing updated');

    return updated;
  }

  /**
   * Delete listing
   */
  static async deleteListing(listingId, userId = null, adminId = null) {
    const { data: listing, error: getErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('user_id')
      .eq('id', listingId)
      .single();

    if (getErr) throw getErr;

    // Only owner or admin can delete
    if (userId && listing.user_id !== userId) {
      throw new Error('Unauthorized: Not listing owner');
    }

    const { error } = await supabaseAdmin
      .from('marketplace_listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;

    // Log deletion
    const changedByAdmin = adminId ? adminId : null;
    const changedByUser = userId ? userId : null;
    await this.logAction(
      listingId,
      'deleted',
      changedByUser,
      changedByAdmin,
      'approved',
      'deleted',
      'Listing deleted'
    );
  }

  /**
   * Approve listing
   */
  static async approveListing(listingId, adminId, notes = null) {
    const { data: listing, error: getErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('status')
      .eq('id', listingId)
      .single();

    if (getErr) throw getErr;

    // Can only approve pending or flagged listings
    if (!['pending', 'flagged'].includes(listing.status)) {
      throw new Error(`Cannot approve listing with status: ${listing.status}`);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({
        status: 'approved',
        moderation_by: adminId,
        moderation_at: new Date().toISOString(),
        moderation_notes: notes || 'Approved by moderator',
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;

    // Log approval
    await this.logAction(
      listingId,
      'approved',
      null,
      adminId,
      listing.status,
      'approved',
      notes || 'Approved by moderator'
    );

    return updated;
  }

  /**
   * Reject listing
   */
  static async rejectListing(listingId, adminId, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const { data: listing, error: getErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('status')
      .eq('id', listingId)
      .single();

    if (getErr) throw getErr;

    if (listing.status === 'approved') {
      throw new Error('Cannot reject already approved listings');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({
        status: 'rejected',
        moderation_by: adminId,
        moderation_at: new Date().toISOString(),
        moderation_notes: reason,
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;

    // Log rejection
    await this.logAction(
      listingId,
      'rejected',
      null,
      adminId,
      listing.status,
      'rejected',
      reason
    );

    return updated;
  }

  /**
   * Flag listing as inappropriate
   */
  static async flagListing(listingId, adminId, reason) {
    if (!reason) throw new Error('Flag reason required');

    const { data: listing, error: getErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('status')
      .eq('id', listingId)
      .single();

    if (getErr) throw getErr;

    if (listing.status === 'flagged') {
      throw new Error('Listing already flagged');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({
        status: 'flagged',
        moderation_by: adminId,
        moderation_at: new Date().toISOString(),
        moderation_notes: reason,
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;

    // Log flag
    await this.logAction(
      listingId,
      'flagged',
      null,
      adminId,
      listing.status,
      'flagged',
      reason
    );

    return updated;
  }

  /**
   * Ban seller permanently
   */
  static async banSeller(userId, adminId, reason) {
    if (!reason) throw new Error('Ban reason required');

    // Check if already banned
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('seller_moderation')
      .select('*')
      .eq('user_id', userId)
      .eq('action', 'banned')
      .eq('status', 'active')
      .single();

    if (checkErr && checkErr.code !== 'PGRST116') throw checkErr;
    if (existing) throw new Error('Seller is already banned');

    // Create ban record
    const { data: ban, error } = await supabaseAdmin
      .from('seller_moderation')
      .insert({
        user_id: userId,
        action: 'banned',
        reason,
        moderation_by_admin_id: adminId,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    // Archive all active listings by this seller
    await supabaseAdmin
      .from('marketplace_listings')
      .update({ status: 'deleted', moderation_notes: 'Seller banned' })
      .eq('user_id', userId)
      .eq('status', 'approved');

    return ban;
  }

  /**
   * Suspend seller temporarily
   */
  static async suspendSeller(userId, adminId, reason, suspendUntilDate) {
    if (!reason) throw new Error('Suspension reason required');
    if (!suspendUntilDate || new Date(suspendUntilDate) <= new Date()) {
      throw new Error('Suspension end date must be in the future');
    }

    // Check if already suspended
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('seller_moderation')
      .select('*')
      .eq('user_id', userId)
      .eq('action', 'suspended')
      .eq('status', 'active')
      .single();

    if (checkErr && checkErr.code !== 'PGRST116') throw checkErr;
    if (existing) throw new Error('Seller already has active suspension');

    // Create suspension record
    const { data: suspension, error } = await supabaseAdmin
      .from('seller_moderation')
      .insert({
        user_id: userId,
        action: 'suspended',
        reason,
        moderation_by_admin_id: adminId,
        suspended_until: suspendUntilDate,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return suspension;
  }

  /**
   * Lift band/suspension
   */
  static async liftModeration(moderationId, adminId, appealNotes) {
    const { data: updated, error } = await supabaseAdmin
      .from('seller_moderation')
      .update({
        status: 'lifted',
        appeal_notes: appealNotes || 'Lifted by admin',
        appeal_at: new Date().toISOString(),
      })
      .eq('id', moderationId)
      .select()
      .single();

    if (error) throw error;

    return updated;
  }

  /**
   * Get seller moderation history
   */
  static async getSellerModerationHistory(userId) {
    const { data: history, error } = await supabaseAdmin
      .from('seller_moderation')
      .select(
        `id, action, reason, moderation_by_admin_id, suspended_until, status,
         appeal_notes, appeal_at, created_at, updated_at,
         admins(name)` // moderation_by admin name
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return history || [];
  }

  /**
   * Record an action in audit log
   */
  static async logAction(
    listingId,
    action,
    changedByUserId = null,
    changedByAdminId = null,
    oldStatus = null,
    newStatus = null,
    notes = null
  ) {
    const { error } = await supabaseAdmin
      .from('marketplace_listing_log')
      .insert({
        listing_id: listingId,
        action,
        changed_by_user_id: changedByUserId,
        changed_by_admin_id: changedByAdminId,
        old_status: oldStatus,
        new_status: newStatus,
        notes,
      });

    if (error) {
      console.error('Error logging marketplace action:', error);
      // Don't throw - logging errors shouldn't break the flow
    }
  }

  /**
   * Update AI validation result for a listing
   */
  static async updateAIValidationResult(listingId, status, notes = null) {
    const validStatuses = ['pending', 'passed', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid AI validation status: ${status}`);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({
        ai_validation_status: status,
        ai_validation_notes: notes,
        ai_validation_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;

    return updated;
  }

  /**
   * Auto-reject expired pending listings (call periodically or via cron)
   */
  static async autoRejectExpiredListings() {
    const { data: listings, error: selectErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('id')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (selectErr) throw selectErr;

    if (!listings || listings.length === 0) {
      return { count: 0 };
    }

    const listingIds = listings.map(l => l.id);

    // Bulk reject
    const { error } = await supabaseAdmin
      .from('marketplace_listings')
      .update({
        status: 'rejected',
        moderation_notes: 'Auto-rejected: No admin action within 14 days',
      })
      .in('id', listingIds);

    if (error) throw error;

    // Log each rejection
    for (const listingId of listingIds) {
      await this.logAction(
        listingId,
        'auto_rejected',
        null,
        null,
        'pending',
        'rejected',
        'Expired after 14 days pending'
      );
    }

    return { count: listingIds.length };
  }
}

export default MarketplaceService;
