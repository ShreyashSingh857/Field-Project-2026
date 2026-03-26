import supabase from "../../services/supabaseClient";

/**
 * Fetch all bins in the admin's jurisdiction
 * @param {string} panchayatId - Panchayat ID for filtering (optional - for panchayat_admin role)
 * @returns {Promise<Array>} List of bins with details
 */
export const fetchBins = async (panchayatId = null) => {
    try {
        let query = supabase
            .from("bins")
            .select("id, label, fill_level, fill_status, location_lat, location_lng, assigned_panchayat_id, village_id");

        // Filter by panchayat if provided (for panchayat_admin role)
        if (panchayatId) {
            query = query.eq("assigned_panchayat_id", panchayatId);
        }

        const { data, error } = await query.order("label");

        if (error) throw error;

        return (data || []).map(bin => ({
            ...bin,
            fillLevel: bin.fill_level,
            status: bin.fill_status,
            // For compatibility with frontend, add fillStatus in both forms
            fill_status: bin.fill_status,
        }));
    } catch (error) {
        console.error("Error fetching bins:", error);
        throw new Error(`Failed to fetch bins: ${error.message}`);
    }
};

/**
 * Update bin fill level (typically called from sensor data)
 * @param {string} binId - Bin ID
 * @param {number} fillLevel - Fill level percentage (0-100)
 * @returns {Promise<Object>} Updated bin
 */
export const updateBinFillLevel = async (binId, fillLevel) => {
    try {
        // Determine fill_status based on fill_level
        let status = "empty";
        if (fillLevel <= 20) status = "empty";
        else if (fillLevel <= 40) status = "low";
        else if (fillLevel <= 60) status = "medium";
        else if (fillLevel <= 80) status = "high";
        else if (fillLevel < 100) status = "full";
        else status = "overflow";

        const { data, error } = await supabase
            .from("bins")
            .update({
                fill_level: fillLevel,
                fill_status: status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", binId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating bin fill level:", error);
        throw new Error(`Failed to update bin: ${error.message}`);
    }
};

/**
 * Get bin details with location
 * @param {string} binId - Bin ID
 * @returns {Promise<Object>} Bin details
 */
export const getBinDetails = async (binId) => {
    try {
        const { data, error } = await supabase
            .from("bins")
            .select(
                "id, label, fill_level, fill_status, location_lat, location_lng, " +
                "assigned_panchayat_id, village:villages(id, name), " +
                "panchayat:admins(id, name, jurisdiction_name)"
            )
            .eq("id", binId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching bin details:", error);
        throw new Error(`Failed to fetch bin details: ${error.message}`);
    }
};
