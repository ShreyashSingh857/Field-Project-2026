import supabase from "../../services/supabaseClient";

/**
 * Fetch all active announcements
 * @param {Object} filters - Optional filters (is_pinned, target_village_id)
 * @returns {Promise<Array>} List of announcements
 */
export const fetchAnnouncements = async (filters = {}) => {
    try {
        let query = supabase
            .from("announcements")
            .select(
                "id, title, content, target_village_id, is_pinned, is_active, " +
                "created_at, updated_at, creator:admins(id, name, role)"
            )
            .eq("is_active", true);

        // Apply filters
        if (filters.is_pinned !== undefined) {
            query = query.eq("is_pinned", filters.is_pinned);
        }
        if (filters.target_village_id) {
            query = query.or(`target_village_id.eq.${filters.target_village_id},target_village_id.is.null`);
        }

        const { data, error } = await query
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching announcements:", error);
        throw new Error(`Failed to fetch announcements: ${error.message}`);
    }
};

/**
 * Create a new announcement
 * @param {Object} announcementData - Announcement details: {title, content, target_village_id}
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Created announcement
 */
export const createAnnouncement = async (announcementData, adminId) => {
    try {
        const { data, error } = await supabase
            .from("announcements")
            .insert([
                {
                    title: announcementData.title,
                    content: announcementData.content,
                    target_village_id: announcementData.target_village_id || null, // NULL = broadcast to all
                    is_pinned: announcementData.is_pinned || false,
                    is_active: true,
                    created_by: adminId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error creating announcement:", error);
        throw new Error(`Failed to create announcement: ${error.message}`);
    }
};

/**
 * Delete/deactivate an announcement
 * @param {string} announcementId - Announcement ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteAnnouncement = async (announcementId) => {
    try {
        // Soft delete - mark as inactive instead of removing
        const { data, error } = await supabase
            .from("announcements")
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq("id", announcementId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            message: "Announcement deleted successfully",
        };
    } catch (error) {
        console.error("Error deleting announcement:", error);
        throw new Error(`Failed to delete announcement: ${error.message}`);
    }
};

/**
 * Toggle pin status of announcement
 * @param {string} announcementId - Announcement ID
 * @param {boolean} isPinned - Pin status
 * @returns {Promise<Object>} Updated announcement
 */
export const togglePin = async (announcementId, isPinned) => {
    try {
        const { data, error } = await supabase
            .from("announcements")
            .update({
                is_pinned: isPinned,
                updated_at: new Date().toISOString(),
            })
            .eq("id", announcementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error toggling announcement pin:", error);
        throw new Error(`Failed to toggle announcement pin: ${error.message}`);
    }
};

/**
 * Update announcement
 * @param {string} announcementId - Announcement ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated announcement
 */
export const updateAnnouncement = async (announcementId, updates) => {
    try {
        const { data, error } = await supabase
            .from("announcements")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", announcementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating announcement:", error);
        throw new Error(`Failed to update announcement: ${error.message}`);
    }
};

/**
 * Increment view count for announcement
 * @param {string} announcementId - Announcement ID
 * @returns {Promise<Object>} Updated announcement
 */
export const incrementViewCount = async (announcementId) => {
    try {
        const { data: announcement } = await supabase
            .from("announcements")
            .select("view_count")
            .eq("id", announcementId)
            .single();

        const newCount = (announcement?.view_count || 0) + 1;

        const { data, error } = await supabase
            .from("announcements")
            .update({
                view_count: newCount,
            })
            .eq("id", announcementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error incrementing view count:", error);
        throw new Error(`Failed to increment view count: ${error.message}`);
    }
};

/**
 * Get announcement by ID
 * @param {string} announcementId - Announcement ID
 * @returns {Promise<Object>} Announcement details
 */
export const getAnnouncementById = async (announcementId) => {
    try {
        const { data, error } = await supabase
            .from("announcements")
            .select(
                `*,
         admin:admins(id, name, email, role)`
            )
            .eq("id", announcementId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching announcement:", error);
        throw new Error(`Failed to fetch announcement: ${error.message}`);
    }
};

/**
 * Get pinned announcements
 * @param {string} scope - Admin's jurisdiction scope
 * @returns {Promise<Array>} List of pinned announcements
 */
export const getPinnedAnnouncements = async (scope) => {
    try {
        let query = supabase
            .from("announcements")
            .select(
                "id, announcement_id, title, content, image_url, category, priority, created_at"
            )
            .eq("is_pinned", true)
            .eq("status", "published");

        if (scope && scope !== "national") {
            query = query.eq("jurisdiction_scope", scope);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching pinned announcements:", error);
        throw new Error(`Failed to fetch pinned announcements: ${error.message}`);
    }
};
