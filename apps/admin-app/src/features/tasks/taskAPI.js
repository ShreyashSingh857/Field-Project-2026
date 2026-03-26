import supabase from "../../services/supabaseClient";

/**
 * Fetch all tasks for an admin (scoped by created_by_admin_id)
 * @param {string} adminId - Admin ID
 * @param {Object} filters - Optional filters (status, assigned_worker_id)
 * @returns {Promise<Array>} List of tasks
 */
export const fetchTasks = async (adminId, filters = {}) => {
    try {
        let query = supabase
            .from("tasks")
            .select(
                "id, type, title, description, status, priority, due_at, started_at, completed_at, " +
                "location_lat, location_lng, location_address, proof_photo_url, " +
                "assigned_worker_id, created_by_admin_id, reported_by_user_id, bin_id, village_id, " +
                "created_at, updated_at, worker:workers(id, employee_id, name, phone)"
            )
            .eq("created_by_admin_id", adminId);

        // Apply filters
        if (filters.status) {
            query = query.eq("status", filters.status);
        }
        if (filters.assigned_worker_id) {
            query = query.eq("assigned_worker_id", filters.assigned_worker_id);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching tasks:", error);
        throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
};

/**
 * Create a new task
 * @param {Object} taskData - Task details: {type, title, description, location_lat, location_lng, location_address, priority, village_id, bin_id, reported_by_user_id, due_at}
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Created task
 */
export const createTask = async (taskData, adminId) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .insert([
                {
                    type: taskData.type,
                    title: taskData.title,
                    description: taskData.description,
                    location_lat: taskData.location_lat,
                    location_lng: taskData.location_lng,
                    location_address: taskData.location_address,
                    status: "pending",
                    priority: taskData.priority || 2, // 1=Urgent, 2=Normal, 3=Low
                    village_id: taskData.village_id,
                    bin_id: taskData.bin_id || null,
                    reported_by_user_id: taskData.reported_by_user_id || null,
                    due_at: taskData.due_at || null,
                    created_by_admin_id: adminId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error creating task:", error);
        throw new Error(`Failed to create task: ${error.message}`);
    }
};

/**
 * Assign a task to a worker
 * @param {string} taskId - Task ID
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Updated task
 */
export const assignWorker = async (taskId, workerId) => {
    try {
        // Verify worker exists and is active
        const { data: worker, error: workerError } = await supabase
            .from("workers")
            .select("id, is_active")
            .eq("id", workerId)
            .single();

        if (workerError || !worker || !worker.is_active) {
            throw new Error("Worker not found or is inactive");
        }

        const { data, error } = await supabase
            .from("tasks")
            .update({
                assigned_worker_id: workerId,
                status: "assigned",
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error assigning task:", error);
        throw new Error(`Failed to assign task: ${error.message}`);
    }
};

/**
 * Cancel a task
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export const cancelTask = async (taskId) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error cancelling task:", error);
        throw new Error(`Failed to cancel task: ${error.message}`);
    }
};

/**
 * Update task status
 * @param {string} taskId - Task ID
 * @param {string} status - New status (pending|assigned|in_progress|done|cancelled)
 * @returns {Promise<Object>} Updated task
 */
export const updateTaskStatus = async (taskId, status) => {
    try {
        const updateData = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (status === "done") {
            updateData.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from("tasks")
            .update(updateData)
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating task status:", error);
        throw new Error(`Failed to update task status: ${error.message}`);
    }
};

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Task details
 */
export const getTaskById = async (taskId) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .select(
                "id, type, title, description, status, priority, due_at, started_at, completed_at, " +
                "location_lat, location_lng, location_address, proof_photo_url, " +
                "assigned_worker_id, created_by_admin_id, reported_by_user_id, bin_id, village_id, " +
                "created_at, updated_at, worker:workers(id, employee_id, name, phone)"
            )
            .eq("id", taskId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching task:", error);
        throw new Error(`Failed to fetch task: ${error.message}`);
    }
};
