import supabase from "../../services/supabaseClient";
import { createTask } from "../tasks/taskAPI";

/**
 * Fetch all issue reports (open/assigned status)
 * @param {Object} filters - Optional filters (status, village_id)
 * @returns {Promise<Array>} List of issue reports
 */
export const fetchIssues = async (filters = {}) => {
    try {
        let query = supabase
            .from("issue_reports")
            .select(
                "id, description, photo_url, status, location_lat, location_lng, location_address, " +
                "village_id, created_task_id, reviewed_by, rejection_reason, created_at, updated_at, " +
                "reported_by:users(id, name, phone)"
            );

        // Apply filters
        if (filters.status) {
            query = query.eq("status", filters.status);
        }
        if (filters.village_id) {
            query = query.eq("village_id", filters.village_id);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching issue reports:", error);
        throw new Error(`Failed to fetch issues: ${error.message}`);
    }
};

/**
 * Convert an issue report to a task
 * @param {string} issueId - Issue report ID
 * @param {Object} taskData - Task creation data: {type, title, priority, assigned_worker_id}
 * @param {string} adminId - Admin ID creating the task
 * @returns {Promise<Object>} Created task object
 */
export const convertIssueToTask = async (issueId, taskData, adminId) => {
    try {
        // Get issue details
        const { data: issue, error: issueError } = await supabase
            .from("issue_reports")
            .select("id, description, location_lat, location_lng, location_address, village_id")
            .eq("id", issueId)
            .single();

        if (issueError || !issue) {
            throw new Error("Issue report not found");
        }

        // Create task from issue
        const taskToCreate = {
            type: taskData.type || "other",
            title: taskData.title || "Issue Reported",
            description: taskData.description || issue.description,
            location_lat: issue.location_lat,
            location_lng: issue.location_lng,
            location_address: issue.location_address,
            priority: taskData.priority || 2,
            village_id: issue.village_id,
            reported_by_user_id: null,
            source_issue_id: issueId,
        };

        const createdTask = await createTask(taskToCreate, adminId);

        // Update issue status to assigned and link to task
        await supabase
            .from("issue_reports")
            .update({
                status: "assigned",
                created_task_id: createdTask.id,
                reviewed_by: adminId,
                updated_at: new Date().toISOString(),
            })
            .eq("id", issueId);

        return createdTask;
    } catch (error) {
        console.error("Error converting issue to task:", error);
        throw new Error(`Failed to convert issue to task: ${error.message}`);
    }
};

/**
 * Reject an issue report
 * @param {string} issueId - Issue report ID
 * @param {string} rejectionReason - Reason for rejection
 * @param {string} adminId - Admin ID rejecting the issue
 * @returns {Promise<Object>} Updated issue
 */
export const rejectIssue = async (issueId, rejectionReason, adminId) => {
    try {
        const { data, error } = await supabase
            .from("issue_reports")
            .update({
                status: "rejected",
                rejection_reason: rejectionReason,
                reviewed_by: adminId,
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
 * @param {string} issueId - Issue report ID
 * @param {string} status - New status (open|assigned|resolved|rejected)
 * @returns {Promise<Object>} Updated issue
 */
export const updateIssueStatus = async (issueId, status) => {
    try {
        const { data, error } = await supabase
            .from("issue_reports")
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
 * Get issue report by ID
 * @param {string} issueId - Issue report ID
 * @returns {Promise<Object>} Issue details
 */
export const getIssueById = async (issueId) => {
    try {
        const { data, error } = await supabase
            .from("issue_reports")
            .select(
                "id, description, photo_url, status, location_lat, location_lng, location_address, " +
                "village_id, created_task_id, reviewed_by, rejection_reason, created_at, updated_at, " +
                "reported_by:users(id, name, phone), " +
                "task:tasks(id, title, status)"
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
