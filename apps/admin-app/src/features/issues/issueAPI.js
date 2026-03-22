import supabase from "../../services/supabaseClient";

/**
 * Fetch all issues with optional filtering
 * @param {string} adminId - Admin ID
 * @param {string} scope - Admin's jurisdiction scope
 * @param {Object} filters - Optional filters (status, priority, zone)
 * @returns {Promise<Array>} List of issues
 */
export const fetchIssues = async (adminId, scope, filters = {}) => {
    try {
        let query = supabase.from("issues").select(
            `id,
       issue_id,
       title,
       description,
       location,
       zone,
       beat,
       category,
       priority,
       status,
       reported_by,
       created_at,
       updated_at,
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
        if (filters.zone) {
            query = query.eq("zone", filters.zone);
        }
        if (filters.category) {
            query = query.eq("category", filters.category);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching issues:", error);
        throw new Error(`Failed to fetch issues: ${error.message}`);
    }
};

/**
 * Convert an issue to a task
 * @param {string} issueId - Issue ID
 * @param {Object} taskData - Task creation data
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Created task object
 */
export const convertIssueToTask = async (issueId, taskData, adminId) => {
    try {
        // Get issue details
        const { data: issue, error: issueError } = await supabase
            .from("issues")
            .select(
                "id, issue_id, title, description, location, zone, beat, priority, category"
            )
            .eq("id", issueId)
            .single();

        if (issueError || !issue) {
            throw new Error("Issue not found");
        }

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

        // Create task from issue
        const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert([
                {
                    task_id: taskId,
                    type: "from_issue",
                    title: issue.title,
                    description: taskData.description || issue.description,
                    location: issue.location,
                    zone: issue.zone,
                    beat: issue.beat,
                    priority: taskData.priority || issue.priority,
                    category: issue.category,
                    issue_id: issueId,
                    assigned_to: taskData.assigned_to || null,
                    status: "pending",
                    created_by: adminId,
                    created_at: new Date().toISOString(),
                    due_date: taskData.due_date || null,
                },
            ])
            .select()
            .single();

        if (taskError) throw taskError;

        // Update issue status
        await supabase
            .from("issues")
            .update({
                status: "converted_to_task",
                task_id: task.id,
                updated_at: new Date().toISOString(),
            })
            .eq("id", issueId);

        return {
            ...task,
            source_issue: issue,
        };
    } catch (error) {
        console.error("Error converting issue to task:", error);
        throw new Error(`Failed to convert issue to task: ${error.message}`);
    }
};

/**
 * Reject an issue
 * @param {string} issueId - Issue ID
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} Updated issue
 */
export const rejectIssue = async (issueId, rejectionReason) => {
    try {
        const { data, error } = await supabase
            .from("issues")
            .update({
                status: "rejected",
                rejection_reason: rejectionReason,
                rejected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", issueId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error rejecting issue:", error);
        throw new Error(`Failed to reject issue: ${error.message}`);
    }
};

/**
 * Update issue status
 * @param {string} issueId - Issue ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated issue
 */
export const updateIssueStatus = async (issueId, status) => {
    try {
        const { data, error } = await supabase
            .from("issues")
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", issueId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error updating issue status:", error);
        throw new Error(`Failed to update issue status: ${error.message}`);
    }
};

/**
 * Get issue by ID
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object>} Issue details
 */
export const getIssueById = async (issueId) => {
    try {
        const { data, error } = await supabase
            .from("issues")
            .select(
                `*,
         tasks(id, task_id, status, assigned_to),
         workers(id, employee_id, name, email, phone)`
            )
            .eq("id", issueId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching issue:", error);
        throw new Error(`Failed to fetch issue: ${error.message}`);
    }
};
