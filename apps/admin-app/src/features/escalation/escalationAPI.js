import supabase from "../../services/supabaseClient";

/**
 * Fetch all escalations with optional filtering
 * @param {string} adminId - Admin ID
 * @param {string} scope - Admin's jurisdiction scope
 * @param {Object} filters - Optional filters (status, priority, task_id)
 * @returns {Promise<Array>} List of escalations
 */
export const fetchEscalations = async (adminId, scope, filters = {}) => {
    try {
        let query = supabase.from("escalations").select(
            `id,
       escalation_id,
       task_id,
       issue_id,
       reason,
       priority,
       status,
       escalated_by,
       assigned_to,
       created_at,
       resolved_at,
       tasks(id, task_id, description, location),
       assigned_admin:admins(id, name, email, role),
       escalated_by_admin:admins(id, name, email, role),
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
        if (filters.priority) {
            query = query.eq("priority", filters.priority);
        }
        if (filters.task_id) {
            query = query.eq("task_id", filters.task_id);
        }
        if (filters.assigned_to) {
            query = query.eq("assigned_to", filters.assigned_to);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching escalations:", error);
        throw new Error(`Failed to fetch escalations: ${error.message}`);
    }
};

/**
 * Create an escalation
 * @param {Object} escalationData - Escalation details
 * @param {string} adminId - Admin creating escalation
 * @returns {Promise<Object>} Created escalation
 */
export const createEscalation = async (escalationData, adminId) => {
    try {
        // Generate escalation ID
        const { data: lastEscalation } = await supabase
            .from("escalations")
            .select("escalation_id")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (lastEscalation && lastEscalation.length > 0) {
            const match = lastEscalation[0].escalation_id.match(/ESC-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const escalationId = `ESC-${String(nextNumber).padStart(5, "0")}`;

        const { data, error } = await supabase
            .from("escalations")
            .insert([
                {
                    escalation_id: escalationId,
                    task_id: escalationData.task_id || null,
                    issue_id: escalationData.issue_id || null,
                    reason: escalationData.reason,
                    priority: escalationData.priority || "high",
                    description: escalationData.description,
                    status: "open",
                    escalated_by: adminId,
                    assigned_to: escalationData.assigned_to || null,
                    created_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error creating escalation:", error);
        throw new Error(`Failed to create escalation: ${error.message}`);
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
