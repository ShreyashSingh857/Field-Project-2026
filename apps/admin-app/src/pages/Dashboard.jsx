import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, AlertTriangle, ClipboardList, MessageSquareWarning, Users, Loader, Globe, ChevronRight } from 'lucide-react';
import StatCard from '../components/StatCard';
import { selectRole, selectAdminId, selectAdmin } from '../features/auth/authSlice';
import { fetchDashboardStats } from '../features/dashboard/dashboardAPI';
import { useToast, Toast } from '../utils/useToast';
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_BADGE_CLASS } from '../utils/constants';
import api from '../services/axiosInstance';


function Dashboard() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const admin = useSelector(selectAdmin);
    const { toast, showToast } = useToast();

    const [stats, setStats] = useState({
        totalBins: 0,
        binsNeedingAttention: 0,
        tasksToday: 0,
        openIssues: 0,
        activeWorkers: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [overdueItems, setOverdueItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subJurisdictions, setSubJurisdictions] = useState([]);
    const [subJurLoading, setSubJurLoading] = useState(false);

        const dashboardTitle = {
            ward_member: 'Ward Dashboard',
            gram_panchayat: 'Gram Panchayat Dashboard',
            block_samiti: 'Block Samiti Dashboard',
            zilla_parishad: 'District Dashboard',
        }[role] || 'Dashboard';

    useEffect(() => {
        fetchDashboardData();
        if (role !== 'ward_member' && role !== 'gram_panchayat') {
            fetchSubJurisdictions();
        }
    }, [role]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const liveStats = await fetchDashboardStats(adminId, role);
            setStats({
                totalBins: liveStats.totalBins,
                binsNeedingAttention: liveStats.binsNeedingAttention,
                tasksToday: liveStats.activeTasks,
                openIssues: liveStats.openIssues,
                activeWorkers: liveStats.totalWorkers,
            });
            setRecentActivity(liveStats.recentActivity || []);
            setOverdueItems(liveStats.overdueItems || []);

            showToast('Dashboard data loaded', 'success');
        } catch (err) {
            setError(err.message || 'Failed to fetch dashboard data');
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubJurisdictions = async () => {
        try {
            setSubJurLoading(true);
            const { data } = await api.get('/admin/sub-jurisdictions');
            setSubJurisdictions(data?.subJurisdictions || []);
        } catch (_e) {
            setSubJurisdictions([]);
        } finally {
            setSubJurLoading(false);
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

    const formatActivityTime = (isoTime) => {
        if (!isoTime) return 'N/A';
        const date = new Date(isoTime);
        if (Number.isNaN(date.getTime())) return String(isoTime);
        return date.toLocaleString('en-IN');
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
            <h1 className="admin-page-title">{dashboardTitle}</h1>
            <p style={{ fontSize: '13px', color: 'var(--admin-muted)', marginBottom: '20px', marginTop: '-8px' }}>
                {{
                    ward_member:    `Ward: ${admin?.jurisdiction_name || '—'}`,
                    gram_panchayat: `Gram Panchayat: ${admin?.jurisdiction_name || '—'}`,
                    block_samiti:   `Block: ${admin?.jurisdiction_name || '—'}`,
                    zilla_parishad: `District: ${admin?.jurisdiction_name || '—'}`,
                }[role] || ''}
                {admin?.lgd_jurisdiction_code && (
                    <span style={{
                        marginLeft: '10px',
                        fontSize: '11px',
                        backgroundColor: '#E3F2FD',
                        color: '#1565C0',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '600',
                    }}>
                        LGD: {admin.lgd_jurisdiction_code}
                    </span>
                )}
            </p>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Stat Cards */}
            <div className="admin-stat-grid">
                <StatCard
                    icon={Trash2}
                    label={role === 'ward_member' ? 'Total Bins' : 'Bins in Jurisdiction'}
                    value={stats.totalBins}
                    sub="Total in jurisdiction"
                />
                <StatCard
                    icon={AlertTriangle}
                    label={role === 'ward_member' ? 'Bin Fill Alerts' : 'GPs with Overdue Tasks'}
                    value={stats.binsNeedingAttention}
                    sub={stats.totalBins ? `${((stats.binsNeedingAttention / stats.totalBins) * 100).toFixed(1)}% of total` : '0.0% of total'}
                    variant="warning"
                />
                <StatCard
                    icon={ClipboardList}
                    label={role === 'ward_member' ? 'Tasks Today' : 'Tasks Across Jurisdiction'}
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
                {role === 'ward_member' && (
                    <StatCard
                        icon={Users}
                        label="Active Workers"
                        value={stats.activeWorkers}
                        sub="Logged in today"
                    />
                )}
            </div>

            {/* Sub-Jurisdictions Panel */}
            {(subJurisdictions.length > 0 || subJurLoading) && (
                <div className="admin-panel" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={18} style={{ color: 'var(--admin-primary)' }} />
                            {{
                                zilla_parishad: 'Blocks / Talukas under this District',
                                block_samiti:   'Gram Panchayats under this Block',
                            }[role] || 'Sub-Jurisdictions'}
                        </h2>
                        <span style={{
                            fontSize: '11px',
                            backgroundColor: '#E8F5E9',
                            color: '#2E7D32',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                        }}>
                            Source: OpenStreetMap
                        </span>
                    </div>

                    {subJurLoading ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Fetching live boundary data from OSM…
                        </div>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>OSM ID</th>
                                        <th>LGD Code</th>
                                        <th>Admin Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subJurisdictions.map((sub, idx) => (
                                        <tr key={sub.osm_id || idx}>
                                            <td style={{ color: 'var(--admin-muted)', fontSize: '12px' }}>{idx + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <ChevronRight size={12} style={{ color: 'var(--admin-primary)', flexShrink: 0 }} />
                                                    <strong>{sub.name}</strong>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--admin-muted)', fontFamily: 'monospace' }}>
                                                {sub.osm_id ? `R${sub.osm_id}` : '—'}
                                            </td>
                                            <td>
                                                {sub.lgd_code ? (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        backgroundColor: '#E3F2FD',
                                                        color: '#1565C0',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: '600',
                                                    }}>
                                                        {sub.lgd_code}
                                                    </span>
                                                ) : <span style={{ color: 'var(--admin-muted)', fontSize: '12px' }}>—</span>}
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                                Level {sub.admin_level || '?'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

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
                                            {formatActivityTime(item.time)}
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
