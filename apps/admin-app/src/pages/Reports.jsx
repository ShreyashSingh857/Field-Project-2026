import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Loader } from 'lucide-react';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';

function Reports() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [dateRange, setDateRange] = useState('week');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mock data for panchayat_admin
    const [taskCompletionData] = useState([
        { day: 'Mon', completed: 8, pending: 2 },
        { day: 'Tue', completed: 12, pending: 1 },
        { day: 'Wed', completed: 10, pending: 3 },
        { day: 'Thu', completed: 15, pending: 2 },
        { day: 'Fri', completed: 11, pending: 4 },
        { day: 'Sat', completed: 9, pending: 1 },
        { day: 'Sun', completed: 6, pending: 2 },
    ]);

    const [binFillData] = useState([
        { day: 'Mon', bin1: 45, bin2: 38, bin3: 52 },
        { day: 'Tue', bin1: 65, bin2: 48, bin3: 70 },
        { day: 'Wed', bin1: 55, bin2: 60, bin3: 72 },
        { day: 'Thu', bin1: 75, bin2: 70, bin3: 85 },
        { day: 'Fri', bin1: 60, bin2: 65, bin3: 80 },
        { day: 'Sat', bin1: 50, bin2: 55, bin3: 75 },
        { day: 'Sun', bin1: 40, bin2: 45, bin3: 60 },
    ]);

    const [workerPerformanceData] = useState([
        { name: 'Rajesh Kumar', assigned: 45, completed: 42, rate: 93.3 },
        { name: 'Priya Singh', assigned: 52, completed: 50, rate: 96.2 },
        { name: 'Amit Sharma', assigned: 38, completed: 35, rate: 92.1 },
        { name: 'Neha Gupta', assigned: 41, completed: 39, rate: 95.1 },
    ]);

    const [issueStatusData] = useState([
        { name: 'Resolved', value: 156, fill: '#3B6D11' },
        { name: 'Open', value: 23, fill: '#854F0B' },
        { name: 'Rejected', value: 8, fill: '#A32D2D' },
    ]);

    useEffect(() => {
        fetchReportData();
    }, [role, adminId, dateRange]);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            showToast('Report data loaded', 'success');
        } catch (err) {
            setError('Failed to fetch report data');
            showToast('Failed to load report data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        try {
            showToast('Export started - CSV file will download', 'success');
            // Mock CSV export - would use actual API in production
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

            {/* For panchayat_admin */}
            {role === 'panchayat_admin' && (
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
                                <Line type="monotone" dataKey="bin1" stroke="var(--admin-primary)" name="Bin 1" />
                                <Line type="monotone" dataKey="bin2" stroke="#FFA500" name="Bin 2" />
                                <Line type="monotone" dataKey="bin3" stroke="#A32D2D" name="Bin 3" />
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
                                        87.6%
                                    </div>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        Total Issues
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '700' }}>187</div>
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
                        <p style={{ color: 'var(--admin-muted)', marginBottom: '16px' }}>
                            District-wide aggregate data would be displayed here for {role.replace(/_/g, ' ').toUpperCase()}.
                        </p>
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
                                    <tr>
                                        <td>Gokul Nagar</td>
                                        <td>156</td>
                                        <td>142</td>
                                        <td><strong style={{ color: 'var(--admin-primary)' }}>91%</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Ram Vihar</td>
                                        <td>134</td>
                                        <td>128</td>
                                        <td><strong style={{ color: 'var(--admin-primary)' }}>95%</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="admin-panel">
                        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                            District-wide Bin Status
                        </h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Empty', value: 245, fill: '#3B6D11' },
                                        { name: 'Low', value: 156, fill: '#FFA500' },
                                        { name: 'Medium', value: 234, fill: '#F4A460' },
                                        { name: 'High', value: 145, fill: '#854F0B' },
                                        { name: 'Full/Overflow', value: 67, fill: '#A32D2D' },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    <Cell fill="#3B6D11" />
                                    <Cell fill="#FFA500" />
                                    <Cell fill="#F4A460" />
                                    <Cell fill="#854F0B" />
                                    <Cell fill="#A32D2D" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}

export default Reports;
