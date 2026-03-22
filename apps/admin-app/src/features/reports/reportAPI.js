import supabase from "../../services/supabaseClient";

/**
 * Fetch reports with date range filtering
 * @param {string} adminId - Admin ID
 * @param {string} scope - Admin's jurisdiction scope
 * @param {Object} filters - Filters including startDate, endDate, reportType, status
 * @returns {Promise<Array>} List of reports
 */
export const fetchReports = async (adminId, scope, filters = {}) => {
    try {
        let query = supabase.from("reports").select(
            `id,
       report_id,
       type,
       title,
       description,
       generated_by,
       data_type,
       status,
       file_url,
       created_at,
       start_date,
       end_date,
       record_count,
       admin:admins(id, name, email, role)`
        );

        // Apply scope filtering
        if (scope && scope !== "national") {
            query = query.eq("jurisdiction_scope", scope);
        }

        // Date range filtering
        if (filters.startDate) {
            query = query.gte("start_date", filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte("end_date", filters.endDate);
        }

        // Report type filtering
        if (filters.reportType) {
            query = query.eq("type", filters.reportType);
        }

        // Status filtering
        if (filters.status) {
            query = query.eq("status", filters.status);
        }

        // Data type filtering (tasks, workers, issues, etc.)
        if (filters.dataType) {
            query = query.eq("data_type", filters.dataType);
        }

        const { data, error } = await query.order("created_at", {
            ascending: false,
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error fetching reports:", error);
        throw new Error(`Failed to fetch reports: ${error.message}`);
    }
};

/**
 * Generate task completion report
 * @param {Object} params - Report parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Generated report
 */
export const generateTaskReport = async (
    { startDate, endDate, zone, beat },
    adminId
) => {
    try {
        // Generate report ID
        const { data: lastReport } = await supabase
            .from("reports")
            .select("report_id")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (lastReport && lastReport.length > 0) {
            const match = lastReport[0].report_id.match(/RPT-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const reportId = `RPT-${String(nextNumber).padStart(5, "0")}`;

        // Fetch task data
        let taskQuery = supabase.from("tasks").select("id, status, completed_at");

        if (startDate) {
            taskQuery = taskQuery.gte("created_at", startDate);
        }
        if (endDate) {
            taskQuery = taskQuery.lte("created_at", endDate);
        }
        if (zone) {
            taskQuery = taskQuery.eq("zone", zone);
        }
        if (beat) {
            taskQuery = taskQuery.eq("beat", beat);
        }

        const { data: tasks, error: tasksError } = await taskQuery;

        if (tasksError) throw tasksError;

        // Calculate metrics
        const completedTasks = tasks.filter((t) => t.status === "completed").length;
        const completionRate = tasks.length > 0 ?
            Math.round((completedTasks / tasks.length) * 100) : 0;

        const { data, error } = await supabase
            .from("reports")
            .insert([
                {
                    report_id: reportId,
                    type: "task_completion",
                    title: `Task Completion Report - ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
                    description: `Task completion metrics for ${zone ? `zone ${zone}` : "all zones"} ${beat ? `beat ${beat}` : ""}`,
                    data_type: "tasks",
                    generated_by: adminId,
                    start_date: startDate,
                    end_date: endDate,
                    record_count: tasks.length,
                    status: "generated",
                    metrics: {
                        total_tasks: tasks.length,
                        completed_tasks: completedTasks,
                        completion_rate: completionRate,
                        zone: zone || "all",
                        beat: beat || "all",
                    },
                    created_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error generating task report:", error);
        throw new Error(`Failed to generate task report: ${error.message}`);
    }
};

/**
 * Generate worker performance report
 * @param {Object} params - Report parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Generated report
 */
export const generateWorkerReport = async (
    { startDate, endDate, workerId },
    adminId
) => {
    try {
        const { data: lastReport } = await supabase
            .from("reports")
            .select("report_id")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (lastReport && lastReport.length > 0) {
            const match = lastReport[0].report_id.match(/RPT-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const reportId = `RPT-${String(nextNumber).padStart(5, "0")}`;

        // Fetch worker task data
        let taskQuery = supabase
            .from("tasks")
            .select("id, status, completed_at");

        if (startDate) {
            taskQuery = taskQuery.gte("created_at", startDate);
        }
        if (endDate) {
            taskQuery = taskQuery.lte("created_at", endDate);
        }
        if (workerId) {
            taskQuery = taskQuery.eq("assigned_to", workerId);
        }

        const { data: tasks, error: tasksError } = await taskQuery;

        if (tasksError) throw tasksError;

        // Get worker info if specific worker
        let workerName = "All Workers";
        if (workerId) {
            const { data: worker } = await supabase
                .from("workers")
                .select("name, employee_id")
                .eq("id", workerId)
                .single();

            if (worker) {
                workerName = `${worker.name} (${worker.employee_id})`;
            }
        }

        const completedTasks = tasks.filter((t) => t.status === "completed").length;
        const completionRate = tasks.length > 0 ?
            Math.round((completedTasks / tasks.length) * 100) : 0;

        const { data, error } = await supabase
            .from("reports")
            .insert([
                {
                    report_id: reportId,
                    type: "worker_performance",
                    title: `Worker Performance Report - ${workerName}`,
                    description: `Performance metrics for ${workerName} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
                    data_type: "workers",
                    generated_by: adminId,
                    start_date: startDate,
                    end_date: endDate,
                    record_count: tasks.length,
                    status: "generated",
                    metrics: {
                        worker_id: workerId || "all",
                        total_tasks: tasks.length,
                        completed_tasks: completedTasks,
                        completion_rate: completionRate,
                    },
                    created_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error generating worker report:", error);
        throw new Error(`Failed to generate worker report: ${error.message}`);
    }
};

/**
 * Generate issue resolution report
 * @param {Object} params - Report parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @param {string} adminId - Creating admin ID
 * @returns {Promise<Object>} Generated report
 */
export const generateIssueReport = async (
    { startDate, endDate, category },
    adminId
) => {
    try {
        const { data: lastReport } = await supabase
            .from("reports")
            .select("report_id")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (lastReport && lastReport.length > 0) {
            const match = lastReport[0].report_id.match(/RPT-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        const reportId = `RPT-${String(nextNumber).padStart(5, "0")}`;

        let issueQuery = supabase.from("issues").select("id, status, category");

        if (startDate) {
            issueQuery = issueQuery.gte("created_at", startDate);
        }
        if (endDate) {
            issueQuery = issueQuery.lte("created_at", endDate);
        }
        if (category) {
            issueQuery = issueQuery.eq("category", category);
        }

        const { data: issues, error: issuesError } = await issueQuery;

        if (issuesError) throw issuesError;

        const convertedCount = issues.filter(
            (i) => i.status === "converted_to_task"
        ).length;
        const rejectedCount = issues.filter((i) => i.status === "rejected").length;

        const { data, error } = await supabase
            .from("reports")
            .insert([
                {
                    report_id: reportId,
                    type: "issue_resolution",
                    title: `Issue Resolution Report - ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
                    description: `Issue resolution metrics for ${category || "all categories"}`,
                    data_type: "issues",
                    generated_by: adminId,
                    start_date: startDate,
                    end_date: endDate,
                    record_count: issues.length,
                    status: "generated",
                    metrics: {
                        total_issues: issues.length,
                        converted_to_tasks: convertedCount,
                        rejected: rejectedCount,
                        category: category || "all",
                    },
                    created_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error generating issue report:", error);
        throw new Error(`Failed to generate issue report: ${error.message}`);
    }
};

/**
 * Get report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Report details
 */
export const getReportById = async (reportId) => {
    try {
        const { data, error } = await supabase
            .from("reports")
            .select(
                `*,
         admin:admins(id, name, email, role)`
            )
            .eq("id", reportId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching report:", error);
        throw new Error(`Failed to fetch report: ${error.message}`);
    }
};

/**
 * Download report (generate file URL)
 * @param {string} reportId - Report ID
 * @returns {Promise<string>} File download URL
 */
export const downloadReport = async (reportId) => {
    try {
        const report = await getReportById(reportId);

        if (!report.file_url) {
            throw new Error("Report file not available for download");
        }

        return report.file_url;
    } catch (error) {
        console.error("Error downloading report:", error);
        throw new Error(`Failed to download report: ${error.message}`);
    }
};
