import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, AlertTriangle, ClipboardList, MessageSquareWarning, Users, Loader } from 'lucide-react';
import StatCard from '../components/StatCard';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_BADGE_CLASS } from '../utils/constants';

function Dashboard() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [stats, setStats] = useState({
        totalBins: 156,
        binsNeedingAttention: 23,
        tasksToday: 12,
        openIssues: 8,
        activeWorkers: role === 'panchayat_admin' ? 18 : 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [overdueItems, setOverdueItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, [role]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data - Replace with actual Redux dispatch when APIs are ready
            setStats({
                totalBins: 156,
                binsNeedingAttention: 23,
                tasksToday: 12,
                openIssues: 8,
                activeWorkers: role === 'panchayat_admin' ? 18 : 0,
            });

            setRecentActivity([
                {
                    id: 1,
                    type: 'task',
                    description: 'Bin cleanup at Market Road',
                    location: 'Market Road, Village A',
                    status: 'in_progress',
                    time: '1 hour ago',
                },
                {
                    id: 2,
                    type: 'issue',
                    description: 'Litter accumulation reported',
                    location: 'Park Area, Village B',
                    status: 'open',
                    time: '2 hours ago',
                },
                {
                    id: 3,
                    type: 'task',
                    description: 'Drain clearance',
                    location: 'Main Street',
                    status: 'done',
                    time: '3 hours ago',
                },
            ]);

            setOverdueItems([
                {
                    id: 1,
                    title: 'Bin Cleanup - Ward 5',
                    workerName: 'Rajesh Kumar',
                    daysOverdue: 2,
                },
                {
                    id: 2,
                    title: 'Drain Clearance - Market Area',
                    workerName: 'Priya Singh',
                    daysOverdue: 1,
                },
            ]);

            showToast('Dashboard data loaded', 'success');
        } catch (err) {
            setError(err.message || 'Failed to fetch dashboard data');
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getActivityBadgeClass = (status) => {
        switch (status) {
            case 'done':
                return 'admin-badge done';
            case 'in_progress':
                return 'admin-badge active';
            case 'open':
                return 'admin-badge pending';
            default:
                return 'admin-badge';
        }
    };

    const getActivityType = (type) => {
        return type === 'task' ? 'Task' : 'Issue';
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />
            <h1 className="admin-page-title">Dashboard</h1>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Stat Cards */}
            <div className="admin-stat-grid">
                <StatCard
                    icon={Trash2}
                    label="Bins Monitored"
                    value={stats.totalBins}
                    sub="Total in jurisdiction"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Bins Needing Attention"
                    value={stats.binsNeedingAttention}
                    sub={`${((stats.binsNeedingAttention / stats.totalBins) * 100).toFixed(1)}% of total`}
                    variant="warning"
                />
                <StatCard
                    icon={ClipboardList}
                    label="Tasks Today"
                    value={stats.tasksToday}
                    sub="Created in last 24h"
                />
                <StatCard
                    icon={MessageSquareWarning}
                    label="Open Issues"
                    value={stats.openIssues}
                    sub="Pending review"
                    variant="danger"
                />
                {role === 'panchayat_admin' && (
                    <StatCard
                        icon={Users}
                        label="Workers Active Today"
                        value={stats.activeWorkers}
                        sub="Logged in today"
                    />
                )}
            </div>

            {/* Overdue Alert */}
            {overdueItems.length > 0 && (
                <div
                    className="admin-panel"
                    style={{
                        backgroundColor: '#FCEBEB',
                        border: '1px solid #A32D2D',
                        marginBottom: '24px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#A32D2D',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <span>⚠</span> Overdue Tasks
                    </div>
                    {overdueItems.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                padding: '12px 0',
                                borderTop: '1px solid rgba(163, 45, 45, 0.2)',
                            }}
                        >
                            <div style={{ fontWeight: '600', color: '#A32D2D' }}>
                                {item.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#854F0B', marginTop: '4px' }}>
                                Assigned to: {item.workerName} • {item.daysOverdue} day
                                {item.daysOverdue !== 1 ? 's' : ''} overdue
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Recent Activity Table */}
            <div className="admin-panel">
                <h2
                    style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        marginBottom: '20px',
                        color: 'var(--admin-text)',
                    }}
                >
                    Recent Activity
                </h2>

                {recentActivity.length === 0 ? (
                    <div className="admin-table-empty">No recent activity</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <span style={{ fontSize: '12px', fontWeight: '600' }}>
                                                {getActivityType(item.type)}
                                            </span>
                                        </td>
                                        <td>{item.description}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                            {item.location}
                                        </td>
                                        <td>
                                            <div className={getActivityBadgeClass(item.status)}>
                                                {item.status.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                            {item.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
