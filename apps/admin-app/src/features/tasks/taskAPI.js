import supabase from "../../services/supabaseClient";

/**
 * Fetch all tasks with optional filtering
 * @param {string} adminId - Admin ID
 * @param {string} scope - Admin's jurisdiction scope
 * @param {Object} filters - Optional filters (status, assigned_to, zone, beat)
 * @returns {Promise<Array>} List of tasks
 */
export const fetchTasks = async (adminId, scope, filters = {}) => {
    try {
        let query = supabase.from("tasks").select(
            `id, 
       task_id, 
       type, 
       location, 
       zone, 
       beat, 
       description, 
       assigned_to, 
       status, 
       priority, 
       issue_id,
       created_at, 
       due_date, 
       completed_at,
       workers(id, employee_id, name, phone)`
        );

        // Apply scope filtering
        if (scope && scope !== "national") {
            query = query.eq("jurisdiction_scope", scope);
        }

        // Apply provided filters
        if (filters.status) {
            query = query.eq("status", filters.status);
        }
        if (filters.assigned_to) {
            query = query.eq("assigned_to", filters.assigned_to);
        }
        if (filters.zone) {
            query = query.eq("zone", filters.zone);
        }
        if (filters.beat) {
            query = query.eq("beat", filters.beat);
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
 * @param {Object} taskData - Task details
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Created task
 */
export const createTask = async (taskData, adminId) => {
    try {
        // Generate task ID
        const { data: lastTask } = await supabase
            .from("tasks")
            .select("task_id")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (lastTask && lastTask.length > 0) {
            const match = lastTask[0].task_id.match(/TASK-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const taskId = `TASK-${String(nextNumber).padStart(5, "0")}`;

        const { data, error } = await supabase
            .from("tasks")
            .insert([
                {
                    task_id: taskId,
                    type: taskData.type,
                    location: taskData.location,
                    zone: taskData.zone,
                    beat: taskData.beat,
                    description: taskData.description,
                    assigned_to: taskData.assigned_to || null,
                    status: "pending",
                    priority: taskData.priority || "medium",
                    issue_id: taskData.issue_id || null,
                    created_by: adminId,
                    created_at: new Date().toISOString(),
                    due_date: taskData.due_date || null,
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
                assigned_to: workerId,
                status: "assigned",
                assigned_at: new Date().toISOString(),
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
 * @param {string} cancelReason - Reason for cancellation
 * @returns {Promise<Object>} Updated task
 */
export const cancelTask = async (taskId, cancelReason) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .update({
                status: "cancelled",
                cancelled_at: new Date().toISOString(),
                cancellation_reason: cancelReason,
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
 * @param {string} status - New status (pending, assigned, in_progress, completed, cancelled)
 * @returns {Promise<Object>} Updated task
 */
export const updateTaskStatus = async (taskId, status) => {
    try {
        const updateData = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (status === "completed") {
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
                `*,
         workers(id, employee_id, name, email, phone),
         issues(id, title, description, status)`
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
