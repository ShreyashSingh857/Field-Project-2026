import supabase from "../../services/supabaseClient";
import bcrypt from "bcryptjs";

/**
 * Generate unique employee ID in format GWC-WRK-XXXX
 * @returns {string} Generated employee ID
 */
const generateEmployeeId = async () => {
    const { data, error } = await supabase
        .from("workers")
        .select("employee_id")
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) throw new Error("Failed to generate employee ID");

    let nextNumber = 1;
    if (data && data.length > 0) {
        const lastId = data[0].employee_id;
        const match = lastId.match(/GWC-WRK-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1]) + 1;
        }
    }

    return `GWC-WRK-${String(nextNumber).padStart(4, "0")}`;
};

/**
 * Generate 8-character temporary password
 * @returns {string} Random 8-character password
 */
const generateTempPassword = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * Fetch all workers for an admin
 * @param {string} adminId - Admin ID creating these workers
 * @returns {Promise<Array>} List of workers
 */
export const fetchWorkers = async (adminId) => {
    try {
        const { data, error } = await supabase
            .from("workers")
            .select(
                "id, employee_id, name, phone, assigned_area, village_id, language, is_active, last_login_at, created_at"
            )
            .eq("created_by_admin_id", adminId)
            .order("created_at", {
                ascending: false,
            });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching workers:", error);
        throw new Error(`Failed to fetch workers: ${error.message}`);
    }
};

/**
 * Create a new worker
 * @param {Object} workerData - Worker details: {name, phone, assigned_area, village_id, language}
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Created worker object with temp password
 */
export const createWorker = async (workerData, adminId) => {
    try {
        const employeeId = await generateEmployeeId();
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const { data, error } = await supabase
            .from("workers")
            .insert([
                {
                    employee_id: employeeId,
                    name: workerData.name,
                    phone: workerData.phone,
                    assigned_area: workerData.assigned_area,
                    village_id: workerData.village_id,
                    language: workerData.language || "en",
                    password_hash: passwordHash,
                    is_active: true,
                    created_by_admin_id: adminId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;

        // Return worker data with temporary password (one-time only)
        return {
            ...data,
            temp_password: tempPassword,
            note: "Share this temporary password with the worker. They must change it on first login.",
        };
    } catch (error) {
        console.error("Error creating worker:", error);
        throw new Error(`Failed to create worker: ${error.message}`);
    }
};

/**
 * Deactivate a worker
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Updated worker
 */
export const deactivateWorker = async (workerId) => {
    try {
        const { data, error } = await supabase
            .from("workers")
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq("id", workerId)
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("Error deactivating worker:", error);
        throw new Error(`Failed to deactivate worker: ${error.message}`);
    }
};

/**
 * Update worker details
 * @param {string} workerId - Worker ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated worker
 */
export const updateWorker = async (workerId, updates) => {
    try {
        const { data, error } = await supabase
            .from("workers")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", workerId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating worker:", error);
        throw new Error(`Failed to update worker: ${error.message}`);
    }
};

/**
 * Get worker by ID
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Worker details
 */
export const getWorkerById = async (workerId) => {
    try {
        const { data, error } = await supabase
            .from("workers")
            .select("*")
            .eq("id", workerId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching worker:", error);
        throw new Error(`Failed to fetch worker: ${error.message}`);
    }
};
