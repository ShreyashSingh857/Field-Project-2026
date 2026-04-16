import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Loader } from 'lucide-react';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import {
    getTaskCompletionByDay,
    getBinFillHistory,
    getWorkerPerformance,
    getIssueResolutionStats,
    getBinStatusDistribution,
    getAggregatePerformanceByPanchayat,
} from '../features/reports/reportAPI';

function Reports() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [dateRange, setDateRange] = useState('week');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [taskCompletionData, setTaskCompletionData] = useState([]);
    const [binFillData, setBinFillData] = useState([]);
    const [workerPerformanceData, setWorkerPerformanceData] = useState([]);
    const [issueStatusData, setIssueStatusData] = useState([]);
    const [issueStats, setIssueStats] = useState({ resolutionRate: 0, totalIssues: 0 });
    const [panchayatPerformance, setPanchayatPerformance] = useState([]);
    const [binStatusData, setBinStatusData] = useState([]);

    useEffect(() => {
        fetchReportData();
    }, [role, adminId, dateRange]);

    const getDateRange = () => {
        const end = new Date();
        const start = new Date();

        if (dateRange === 'week') {
            start.setDate(end.getDate() - 7);
        } else if (dateRange === 'month') {
            start.setMonth(end.getMonth() - 1);
        } else if (dateRange === 'custom') {
            // For custom, would use separate date pickers
            start.setDate(end.getDate() - 30);
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        };
    };

    const fetchReportData = async () => {
        try {
            setLoading(true);
            setError(null);

            const { startDate, endDate } = getDateRange();

            if (role === 'ward_member') {
                // Fetch data for ward_member
                const [taskData, binData, workerData, issueData] = await Promise.all([
                    getTaskCompletionByDay(role, startDate, endDate, adminId),
                    getBinFillHistory(role, startDate, endDate),
                    getWorkerPerformance(role, startDate, endDate, adminId),
                    getIssueResolutionStats(role, startDate, endDate, adminId),
                ]);

                setTaskCompletionData(taskData);
                setBinFillData(binData);
                setWorkerPerformanceData(workerData);
                setIssueStatusData(issueData.data);
                setIssueStats({
                    resolutionRate: issueData.resolutionRate,
                    totalIssues: issueData.totalIssues,
                });
            } else if (['gram_panchayat', 'block_samiti', 'zilla_parishad'].includes(role)) {
                // Fetch data for higher roles
                const [aggregateData, binDistribution] = await Promise.all([
                    getAggregatePerformanceByPanchayat(role, startDate, endDate),
                    getBinStatusDistribution(role),
                ]);

                setPanchayatPerformance(aggregateData);
                setBinStatusData(binDistribution);
            }

            showToast('Report data loaded', 'success');
        } catch (err) {
            console.error('Error fetching report data:', err);
            setError('Failed to load report data');
            showToast('Failed to load report data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        try {
            const rows = [['section', 'name', 'value1', 'value2', 'value3']];
            taskCompletionData.forEach((r) => rows.push(['task_completion', r.day, r.completed, r.pending, '']));
            workerPerformanceData.forEach((r) => rows.push(['worker_performance', r.name, r.assigned, r.completed, r.rate]));
            issueStatusData.forEach((r) => rows.push(['issue_status', r.name, r.value, '', '']));
            panchayatPerformance.forEach((r) => rows.push(['panchayat_performance', r.name, r.total_tasks, r.completed, r.sla_compliance]));

            const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-report-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showToast('Report exported successfully', 'success');
        } catch (err) {
            showToast('Failed to export CSV', 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading report data...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />

            <div className="admin-flex-between" style={{ marginBottom: '24px' }}>
                <h1 className="admin-page-title" style={{ margin: 0 }}>Reports</h1>
                <button
                    className="admin-btn-outline"
                    onClick={handleExportCSV}
                >
                    <Download size={18} /> Export CSV
                </button>
            </div>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Date Range Selector */}
            <div className="admin-panel" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {['week', 'month', 'custom'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={range === dateRange ? 'admin-btn-primary admin-btn-sm' : 'admin-btn-outline admin-btn-sm'}
                            style={{ fontSize: '12px' }}
                        >
                            {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'Custom'}
                        </button>
                    ))}
                    {dateRange === 'custom' && (
                        <>
                            <input type="date" className="admin-form-input" style={{ width: '140px', padding: '6px 12px' }} />
                            <span>to</span>
                            <input type="date" className="admin-form-input" style={{ width: '140px', padding: '6px 12px' }} />
                        </>
                    )}
                </div>
            </div>

            {/* For ward_member */}
            {role === 'ward_member' && (
                <>
                    {/* Task Completion Chart */}
                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            Task Completion Rate
                        </h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={taskCompletionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completed" stackId="a" fill="var(--admin-primary)" />
                                <Bar dataKey="pending" stackId="a" fill="#FFA500" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bin Fill Level Chart */}
                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            Bin Fill Level History
                        </h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={binFillData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="averageFill" stroke="var(--admin-primary)" name="Average Fill %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Worker Performance Table */}
                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            Worker Performance
                        </h2>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Worker Name</th>
                                        <th>Tasks Assigned</th>
                                        <th>Tasks Completed</th>
                                        <th>Completion Rate %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workerPerformanceData.map((worker, index) => (
                                        <tr key={index}>
                                            <td>{worker.name}</td>
                                            <td>{worker.assigned}</td>
                                            <td>{worker.completed}</td>
                                            <td>
                                                <strong style={{ color: 'var(--admin-primary)' }}>
                                                    {worker.rate}%
                                                </strong>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Issue Resolution Rate */}
                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            Issue Resolution Rate
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={issueStatusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {issueStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        Overall Resolution Rate
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--admin-primary)' }}>
                                        {issueStats.resolutionRate}%
                                    </div>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        Total Issues
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                                        {issueStats.totalIssues}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* For higher roles - District-wide reports */}
            {['gram_panchayat', 'block_samiti', 'zilla_parishad'].includes(role) && (
                <>
                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            Aggregate Performance by Gram Panchayat
                        </h2>
                        {panchayatPerformance.length === 0 ? (
                            <p style={{ color: 'var(--admin-muted)', marginBottom: '16px' }}>
                                No performance data available for the selected date range.
                            </p>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Gram Panchayat</th>
                                            <th>Total Tasks</th>
                                            <th>Completed</th>
                                            <th>SLA Compliance %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {panchayatPerformance.map((panchayat, idx) => (
                                            <tr key={idx}>
                                                <td>{panchayat.name}</td>
                                                <td>{panchayat.total_tasks}</td>
                                                <td>{panchayat.completed}</td>
                                                <td>
                                                    <strong style={{ color: 'var(--admin-primary)' }}>
                                                        {panchayat.sla_compliance}%
                                                    </strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            District-wide Bin Status
                        </h2>
                        {binStatusData.length === 0 ? (
                            <p style={{ color: 'var(--admin-muted)' }}>
                                No bins available in the system.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={binStatusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={80}
                                        dataKey="value"
                                    >
                                        {binStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default Reports;
