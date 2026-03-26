import supabase from "../../services/supabaseClient";

/**
 * Fetch overdue tasks in admin's jurisdiction
 * Overdue tasks are those where due_at < today and status is not completed/cancelled
 * @param {string} adminId - Admin ID
 * @returns {Promise<Array>} List of overdue tasks
 */
export const fetchOverdueItems = async (adminId) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("tasks")
            .select(
                "id, title, description, status, priority, due_at, created_by, " +
                "assigned_worker_id, village_id, " +
                "worker:workers(id, name, phone), " +
                "village:villages(id, name)"
            )
            .lt("due_at", today)
            .not("status", "in", "(completed,cancelled)")
            .eq("created_by", adminId)
            .order("due_at", { ascending: true });

        if (error) throw error;

        // Calculate days overdue for each task
        return (data || []).map((task) => {
            const dueDate = new Date(task.due_at);
            const todayDate = new Date(today);
            const daysOverdue = Math.floor(
                (todayDate - dueDate) / (1000 * 60 * 60 * 24)
            );

            return {
                id: task.id,
                taskId: task.id,
                taskTitle: task.title,
                description: task.description,
                village: task.village?.name || "Unknown",
                worker: task.worker?.name || "Unassigned",
                workerId: task.assigned_worker_id,
                daysOverdue,
                status: task.status,
                priority: task.priority,
                dueAt: task.due_at,
            };
        });
    } catch (error) {
        console.error("Error fetching overdue items:", error);
        throw new Error(`Failed to fetch overdue items: ${error.message}`);
    }
};

/**
 * Add a resolution note to a task
 * @param {string} taskId - Task ID
 * @param {string} note - Resolution note
 * @returns {Promise<Object>} Updated task
 */
export const addResolutionNote = async (taskId, note) => {
    try {
        // Fetch current task
        const { data: task, error: fetchError } = await supabase
            .from("tasks")
            .select("description")
            .eq("id", taskId)
            .single();

        if (fetchError) throw fetchError;

        // Append note to description
        const timestamp = new Date().toLocaleString("en-IN");
        const updatedDescription = `${task.description}\n\n[Note - ${timestamp}]: ${note}`;

        const { data, error } = await supabase
            .from("tasks")
            .update({
                description: updatedDescription,
                updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error adding resolution note:", error);
        throw new Error(`Failed to add note: ${error.message}`);
    }
};

/**
 * Mark an overdue task as resolved
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export const markTaskResolved = async (taskId) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .update({
                status: "completed",
                updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error marking task resolved:", error);
        throw new Error(`Failed to mark as resolved: ${error.message}`);
    }
};

/**
 * Reassign a task to a different worker
 * @param {string} taskId - Task ID
 * @param {string} workerId - New worker ID
 * @returns {Promise<Object>} Updated task
 */
export const reassignTask = async (taskId, workerId) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .update({
                assigned_worker_id: workerId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error reassigning task:", error);
        throw new Error(`Failed to reassign task: ${error.message}`);
    }
};

/**
 * Escalate a task to higher authority (increase priority)
 * @param {string} taskId - Task ID
 * @param {string} escalationReason - Reason for escalation
 * @returns {Promise<Object>} Updated task
 */
export const escalateTask = async (taskId, escalationReason) => {
    try {
        const { data: task, error: fetchError } = await supabase
            .from("tasks")
            .select("description, priority")
            .eq("id", taskId)
            .single();

        if (fetchError) throw fetchError;

        // Map priority escalation: low -> normal -> urgent
        const priorityMap = { low: "normal", normal: "urgent", urgent: "urgent" };
        const newPriority = priorityMap[task.priority] || "urgent";

        // Add escalation note
        const timestamp = new Date().toLocaleString("en-IN");
        const escalationNote = `\n\n[ESCALATION - ${timestamp}]: ${escalationReason}`;
        const updatedDescription = `${task.description}${escalationNote}`;

        const { data, error } = await supabase
            .from("tasks")
            .update({
                priority: newPriority,
                description: updatedDescription,
                updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error escalating task:", error);
        throw new Error(`Failed to escalate task: ${error.message}`);
    }
};

/**
 * Get available workers in an admin's jurisdiction for reassignment
 * @param {string} adminId - Admin ID
 * @returns {Promise<Array>} List of workers
 */
export const getAvailableWorkers = async (adminId) => {
    try {
        const { data, error } = await supabase
            .from("workers")
            .select("id, name, phone, is_active")
            .eq("created_by_admin_id", adminId)
            .eq("is_active", true)
            .order("name");

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching available workers:", error);
        throw new Error(`Failed to fetch workers: ${error.message}`);
    }
};

/**
 * Mark escalation as resolved
 * @param {string} escalationId - Escalation ID
 * @param {string} resolutionNotes - Notes on resolution
 * @returns {Promise<Object>} Updated escalation
 */
export const markResolved = async (escalationId, resolutionNotes) => {
    try {
        const { data, error } = await supabase
            .from("escalations")
            .update({
                status: "resolved",
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes,
            })
            .eq("id", escalationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error marking escalation resolved:", error);
        throw new Error(`Failed to mark escalation resolved: ${error.message}`);
    }
};

/**
 * Reassign escalation to a different worker/admin
 * @param {string} escalationId - Escalation ID
 * @param {string} newAssigneeId - New assignee ID (worker or admin)
 * @param {string} assigneeType - Type of assignee ('worker' or 'admin')
 * @returns {Promise<Object>} Updated escalation
 */
export const reassignWorker = async (
    escalationId,
    newAssigneeId,
    assigneeType = "worker"
) => {
    try {
        // Verify assignee exists and is active
        const table = assigneeType === "admin" ? "admins" : "workers";
        const { data: assignee, error: assigneeError } = await supabase
            .from(table)
            .select("id, is_active")
            .eq("id", newAssigneeId)
            .single();

        if (assigneeError || !assignee) {
            throw new Error(`${assigneeType} not found`);
        }

        if (
            assignee.is_active === false ||
            (assigneeType === "worker" && !assignee.is_active)
        ) {
            throw new Error(`${assigneeType} is not active`);
        }

        const updateData = {
            updated_at: new Date().toISOString(),
        };

        if (assigneeType === "worker") {
            updateData.assigned_to_worker = newAssigneeId;
        } else {
            updateData.assigned_to = newAssigneeId;
        }

        const { data, error } = await supabase
            .from("escalations")
            .update(updateData)
            .eq("id", escalationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error reassigning escalation:", error);
        throw new Error(`Failed to reassign escalation: ${error.message}`);
    }
};

/**
 * Update escalation status
 * @param {string} escalationId - Escalation ID
 * @param {string} status - New status (open, in_progress, resolved, closed)
 * @returns {Promise<Object>} Updated escalation
 */
export const updateEscalationStatus = async (escalationId, status) => {
    try {
        const { data, error } = await supabase
            .from("escalations")
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", escalationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating escalation status:", error);
        throw new Error(`Failed to update escalation status: ${error.message}`);
    }
};

/**
 * Add comment/note to escalation
 * @param {string} escalationId - Escalation ID
 * @param {string} comment - Comment text
 * @param {string} adminId - Admin adding comment
 * @returns {Promise<Object>} Created comment entry
 */
export const addEscalationComment = async (
    escalationId,
    comment,
    adminId
) => {
    try {
        const { data, error } = await supabase
            .from("escalation_comments")
            .insert([
                {
                    escalation_id: escalationId,
                    comment,
                    added_by: adminId,
                    created_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error adding escalation comment:", error);
        throw new Error(`Failed to add comment: ${error.message}`);
    }
};

/**
 * Get escalation by ID
 * @param {string} escalationId - Escalation ID
 * @returns {Promise<Object>} Escalation details
 */
export const getEscalationById = async (escalationId) => {
    try {
        const { data, error } = await supabase
            .from("escalations")
            .select(
                `*,
         tasks(id, task_id, description, location, assigned_to),
         issues(id, issue_id, title, description),
         assigned_admin:admins(id, name, email, role),
         escalation_comments(id, comment, added_by, created_at)`
            )
            .eq("id", escalationId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching escalation:", error);
        throw new Error(`Failed to fetch escalation: ${error.message}`);
    }
};
