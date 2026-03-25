import supabase from "../../services/supabaseClient";

/**
 * Fetch all announcements with optional filtering
 * @param {string} adminId - Admin ID
 * @param {string} scope - Admin's jurisdiction scope
 * @param {Object} filters - Optional filters (status, is_pinned, created_by)
 * @returns {Promise<Array>} List of announcements
 */
export const fetchAnnouncements = async (adminId, scope, filters = {}) => {
    try {
        let query = supabase.from("announcements").select(
            `id,
       announcement_id,
       title,
       content,
       image_url,
       category,
       priority,
       status,
       is_pinned,
       view_count,
       created_by,
       created_at,
       updated_at,
       expires_at,
       target_role,
       target_audience,
       admin:admins(id, name, email, role)`
        );

        // Apply scope filtering
        if (scope && scope !== "national") {
            query = query.eq("jurisdiction_scope", scope);
        }

        // Apply provided filters
        if (filters.status) {
            query = query.eq("status", filters.status);
        }
        if (filters.is_pinned !== undefined) {
            query = query.eq("is_pinned", filters.is_pinned);
        }
        if (filters.created_by) {
            query = query.eq("created_by", filters.created_by);
        }
        if (filters.category) {
            query = query.eq("category", filters.category);
        }

        const { data, error } = await query.order("is_pinned", {
            ascending: false,
        }).order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching announcements:", error);
        throw new Error(`Failed to fetch announcements: ${error.message}`);
    }
};

/**
 * Create a new announcement
 * @param {Object} announcementData - Announcement details
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Created announcement
 */
export const createAnnouncement = async (announcementData, adminId) => {
    try {
        // Generate announcement ID
        const { data: lastAnnouncement } = await supabase
            .from("announcements")
            .select("announcement_id")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (lastAnnouncement && lastAnnouncement.length > 0) {
            const match = lastAnnouncement[0].announcement_id.match(/ANN-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const announcementId = `ANN-${String(nextNumber).padStart(5, "0")}`;

        const { data, error } = await supabase
            .from("announcements")
            .insert([
                {
                    announcement_id: announcementId,
                    title: announcementData.title,
                    content: announcementData.content,
                    image_url: announcementData.image_url || null,
                    category: announcementData.category || "general",
                    priority: announcementData.priority || "normal",
                    status: "published",
                    is_pinned: announcementData.is_pinned || false,
                    target_role: announcementData.target_role || "all", // all, admin, worker
                    target_audience: announcementData.target_audience || "all",
                    created_by: adminId,
                    created_at: new Date().toISOString(),
                    expires_at: announcementData.expires_at || null,
                    view_count: 0,
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
 * Delete an announcement
 * @param {string} announcementId - Announcement ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteAnnouncement = async (announcementId) => {
    try {
        // Soft delete - mark as deleted instead of removing
        const { data, error } = await supabase
            .from("announcements")
            .update({
                status: "deleted",
                deleted_at: new Date().toISOString(),
            })
            .eq("id", announcementId)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            message: "Announcement deleted successfully",
            announcement_id: data.id,
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
