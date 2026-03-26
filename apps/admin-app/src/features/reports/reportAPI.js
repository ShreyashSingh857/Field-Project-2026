import supabase from "../../services/supabaseClient";

/**
 * Generate task completion data for a date range
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @param {string} adminId - Admin ID for filtering created tasks
 * @returns {Promise<Array>} Task completion by day
 */
export const getTaskCompletionByDay = async (startDate, endDate, adminId) => {
    try {
        const { data, error } = await supabase
            .from("tasks")
            .select("status, created_at")
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .eq("created_by", adminId);

        if (error) throw error;

        // Group by day
        const dayMap = {};
        (data || []).forEach((task) => {
            const date = new Date(task.created_at);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            if (!dayMap[dayName]) {
                dayMap[dayName] = { completed: 0, pending: 0 };
            }
            if (task.status === "completed") {
                dayMap[dayName].completed += 1;
            } else if (task.status !== "cancelled") {
                dayMap[dayName].pending += 1;
            }
        });

        // Convert to array with days in order
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return days
            .map((day) => ({
                day,
                completed: dayMap[day]?.completed || 0,
                pending: dayMap[day]?.pending || 0,
            }))
            .filter((d) => d.completed > 0 || d.pending > 0);
    } catch (error) {
        console.error("Error getting task completion data:", error);
        throw new Error(`Failed to fetch task completion data: ${error.message}`);
    }
};

/**
 * Generate bin fill level history
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @param {string} panchayatId - Panchayat ID (optional)
 * @returns {Promise<Array>} Bin fill levels by day
 */
export const getBinFillHistory = async (startDate, endDate, panchayatId = null) => {
    try {
        let query = supabase
            .from("bin_sensor_log")
            .select("fill_level, created_at, bin:bins(id, label)");

        query = query.gte("created_at", startDate).lte("created_at", endDate);

        if (panchayatId) {
            // Would need to join with bins table, for now filter after fetch
        }

        const { data: logs, error } = await query;

        if (error) throw error;

        // Get unique bins and group by day
        const dayMap = {};
        const binMap = {};

        (logs || []).forEach((log) => {
            const date = new Date(log.created_at);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
            const binLabel = log.bin?.label || `Bin-${log.bin?.id || "?"}`;

            if (!dayMap[dayName]) {
                dayMap[dayName] = {};
            }
            if (!dayMap[dayName][binLabel]) {
                dayMap[dayName][binLabel] = [];
            }

            dayMap[dayName][binLabel].push(log.fill_level);
            binMap[binLabel] = true;
        });

        // Average fill levels per bin per day
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const binLabels = Object.keys(binMap).sort();

        return days
            .map((day) => {
                const entry = { day };
                binLabels.forEach((binLabel, idx) => {
                    const key = `bin${idx + 1}`;
                    if (dayMap[day] && dayMap[day][binLabel]) {
                        const avg =
                            dayMap[day][binLabel].reduce((a, b) => a + b, 0) /
                            dayMap[day][binLabel].length;
                        entry[key] = Math.round(avg);
                    } else {
                        entry[key] = 0;
                    }
                });
                return entry;
            })
            .filter((d) => Object.keys(d).length > 1);
    } catch (error) {
        console.error("Error getting bin fill history:", error);
        throw new Error(`Failed to fetch bin fill history: ${error.message}`);
    }
};

/**
 * Generate worker performance data
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @param {string} adminId - Admin ID (for filtering workers in jurisdiction)
 * @returns {Promise<Array>} Worker performance metrics
 */
export const getWorkerPerformance = async (startDate, endDate, adminId) => {
    try {
        // Get all workers created by this admin
        const { data: workers, error: workersError } = await supabase
            .from("workers")
            .select("id, name")
            .eq("created_by_admin_id", adminId);

        if (workersError) throw workersError;

        // For each worker, count assigned and completed tasks
        const performance = await Promise.all(
            (workers || []).map(async (worker) => {
                const { data: tasks, error: tasksError } = await supabase
                    .from("tasks")
                    .select("id, status")
                    .eq("assigned_worker_id", worker.id)
                    .gte("created_at", startDate)
                    .lte("created_at", endDate);

                if (tasksError) throw tasksError;

                const assigned = tasks?.length || 0;
                const completed = tasks?.filter((t) => t.status === "completed").length || 0;
                const rate = assigned > 0 ? ((completed / assigned) * 100).toFixed(1) : 0;

                return {
                    name: worker.name,
                    assigned,
                    completed,
                    rate: parseFloat(rate),
                };
            })
        );

        return performance.filter((p) => p.assigned > 0);
    } catch (error) {
        console.error("Error getting worker performance:", error);
        throw new Error(`Failed to fetch worker performance: ${error.message}`);
    }
};

/**
 * Generate issue resolution data
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @param {string} adminId - Admin ID (for filtering issues)
 * @returns {Promise<Object>} Issue status counts and resolution rate
 */
export const getIssueResolutionStats = async (startDate, endDate, adminId) => {
    try {
        const { data: issues, error } = await supabase
            .from("issue_reports")
            .select("id, status")
            .gte("created_at", startDate)
            .lte("created_at", endDate);

        if (error) throw error;

        const resolved = issues?.filter((i) => i.status === "resolved").length || 0;
        const open = issues?.filter((i) => i.status === "open").length || 0;
        const rejected = issues?.filter((i) => i.status === "rejected").length || 0;
        const total = issues?.length || 0;

        const resolutionRate =
            total > 0
                ? Math.round(((resolved / total) * 100 * 10) / 10)
                : 0;

        return {
            data: [
                { name: "Resolved", value: resolved, fill: "#3B6D11" },
                { name: "Open", value: open, fill: "#854F0B" },
                { name: "Rejected", value: rejected, fill: "#A32D2D" },
            ],
            resolutionRate,
            totalIssues: total,
        };
    } catch (error) {
        console.error("Error getting issue resolution stats:", error);
        throw new Error(`Failed to fetch issue resolution data: ${error.message}`);
    }
};

/**
 * Generate bin status distribution for district-wide view
 * @param {string} panchayatId - Panchayat ID (optional - for higher role views)
 * @returns {Promise<Array>} Bin status counts
 */
export const getBinStatusDistribution = async (panchayatId = null) => {
    try {
        let query = supabase.from("bins").select("id, fill_status");

        if (panchayatId) {
            query = query.eq("assigned_panchayat_id", panchayatId);
        }

        const { data: bins, error } = await query;

        if (error) throw error;

        const statusCount = {
            empty: 0,
            low: 0,
            medium: 0,
            high: 0,
            full: 0,
            overflow: 0,
        };

        (bins || []).forEach((bin) => {
            if (statusCount.hasOwnProperty(bin.fill_status)) {
                statusCount[bin.fill_status] += 1;
            }
        });

        return [
            { name: "Empty", value: statusCount.empty, fill: "#3B6D11" },
            { name: "Low", value: statusCount.low, fill: "#FFA500" },
            { name: "Medium", value: statusCount.medium, fill: "#F4A460" },
            { name: "High", value: statusCount.high, fill: "#854F0B" },
            { name: "Full/Overflow", value: statusCount.full + statusCount.overflow, fill: "#A32D2D" },
        ].filter((s) => s.value > 0);
    } catch (error) {
        console.error("Error getting bin status distribution:", error);
        throw new Error(`Failed to fetch bin status data: ${error.message}`);
    }
};

/**
 * Generate aggregate performance by gram panchayat (for higher roles)
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Promise<Array>} Performance metrics per panchayat
 */
export const getAggregatePerformanceByPanchayat = async (startDate, endDate) => {
    try {
        // Get all panchayats (admins with role panchayat_admin or gram panchayat)
        const { data: panchayats, error: panchayatsError } = await supabase
            .from("admins")
            .select("id, jurisdiction_name")
            .in("role", ["panchayat_admin", "gram_panchayat"]);

        if (panchayatsError) throw panchayatsError;

        const performance = await Promise.all(
            (panchayats || []).map(async (panchayat) => {
                // Get tasks created by or assigned in this jurisdiction
                const { data: tasks, error: tasksError } = await supabase
                    .from("tasks")
                    .select("id, status")
                    .eq("created_by", panchayat.id)
                    .gte("created_at", startDate)
                    .lte("created_at", endDate);

                if (tasksError) throw tasksError;

                const total = tasks?.length || 0;
                const completed = tasks?.filter((t) => t.status === "completed").length || 0;
                const slaCompliance = total > 0 ? Math.round((completed / total) * 100) : 0;

                return {
                    name: panchayat.jurisdiction_name,
                    total_tasks: total,
                    completed,
                    sla_compliance: slaCompliance,
                };
            })
        );

        return performance.filter((p) => p.total_tasks > 0);
    } catch (error) {
        console.error("Error getting aggregate performance:", error);
        throw new Error(`Failed to fetch aggregate performance: ${error.message}`);
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
