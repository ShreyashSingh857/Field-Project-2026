import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Eye, Loader, CheckCircle, XCircle } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { fetchIssues, convertIssueToTask, rejectIssue } from '../features/issues/issueAPI';
import api from '../services/axiosInstance';
import { PRIORITIES, TASK_TYPES, formatDate } from '../utils/constants';

function IssueManagement() {
    const dispatch = useDispatch();
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [issues, setIssues] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [filter, setFilter] = useState('open');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [convertFormData, setConvertFormData] = useState({
        type: 'other',
        priority: 2,
        assigned_worker_id: '',
        due_at: '',
    });
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadIssues();
        loadWorkers();
    }, [adminId, filter]);

    const loadIssues = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchIssues({ status: filter });
            setIssues(data);
            showToast('Issues loaded successfully', 'success');
        } catch (err) {
            setError('Failed to fetch issues');
            showToast('Failed to load issues: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadWorkers = async () => {
        try {
            const { data } = await api.get('/workers');
            setWorkers((data?.workers || []).filter((w) => w.is_active));
        } catch (err) {
            console.error('Error loading workers:', err);
        }
    };

    const handleConvertToTask = async (e) => {
        e.preventDefault();

        if (!convertFormData.type || !convertFormData.due_at) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            if (selectedIssue) {
                await convertIssueToTask(
                    selectedIssue,
                    {
                        type: convertFormData.type,
                        priority: convertFormData.priority,
                        assigned_worker_id: convertFormData.assigned_worker_id || null,
                        due_at: convertFormData.due_at,
                    },
                    adminId
                );
                showToast('Issue converted to task successfully', 'success');
                await loadIssues();
                setSelectedIssue(null);
                setConvertFormData({
                    type: 'other',
                    priority: 2,
                    assigned_worker_id: '',
                    due_at: '',
                });
            }
        } catch (err) {
            showToast('Failed to convert issue: ' + err.message, 'error');
        }
    };

    const handleRejectIssue = async (e) => {
        e.preventDefault();

        if (!rejectReason.trim()) {
            showToast('Please provide a rejection reason', 'error');
            return;
        }

        try {
            if (selectedIssue) {
                await rejectIssue(selectedIssue.id, rejectReason, adminId);
                showToast('Issue rejected successfully', 'success');
                await loadIssues();
                setSelectedIssue(null);
                setRejectReason('');
            }
        } catch (err) {
            showToast('Failed to reject issue: ' + err.message, 'error');
        }
    };

    const getStatusBadge = (status) => {
        const classes = {
            open: 'admin-badge pending',
            assigned: 'admin-badge active',
            resolved: 'admin-badge done',
            rejected: 'admin-badge',
        };
        return classes[status] || 'admin-badge';
    };

    const filteredIssues = issues.filter((issue) => issue.status === filter);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading issues...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />
            <h1 className="admin-page-title">Issues Management</h1>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Filter Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '24px',
                    marginBottom: '24px',
                    borderBottom: '1px solid var(--admin-border)',
                    paddingBottom: '12px',
                }}
            >
                {['open', 'assigned', 'resolved', 'rejected'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '8px 0',
                            cursor: 'pointer',
                            color: filter === status ? 'var(--admin-primary)' : 'var(--admin-muted)',
                            fontWeight: filter === status ? '600' : '400',
                            fontSize: '14px',
                            borderBottom: filter === status ? '2px solid var(--admin-primary)' : 'none',
                            marginBottom: '-12px',
                            paddingBottom: '12px',
                        }}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Issues Table */}
            <div className="admin-table-wrap">
                {filteredIssues.length === 0 ? (
                    <div className="admin-table-empty">No issues found</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Location</th>
                                <th>Reported By</th>
                                <th>Photo</th>
                                <th>Status</th>
                                <th>Reported At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIssues.map((issue) => (
                                <tr key={issue.id}>
                                    <td>
                                        <span
                                            style={{
                                                display: 'block',
                                                maxWidth: '200px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {issue.description}
                                        </span>
                                    </td>
                                    <td>{issue.location_address || 'N/A'}</td>
                                    <td>{issue.reported_by?.name || 'Unknown'}</td>
                                    <td>
                                        {issue.photo_url && (
                                            <img
                                                src={issue.photo_url}
                                                alt="Issue"
                                                style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                                            />
                                        )}
                                    </td>
                                    <td>
                                        <div className={getStatusBadge(issue.status)}>
                                            {issue.status}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {new Date(issue.created_at).toLocaleString('en-IN')}
                                    </td>
                                    <td>
                                        <button
                                            className="admin-btn-outline admin-btn-sm"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => setSelectedIssue(issue)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Issue Detail Side Panel */}
            {selectedIssue && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '360px',
                        backgroundColor: 'var(--admin-panel)',
                        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.15)',
                        zIndex: 500,
                        overflowY: 'auto',
                        animation: 'slideIn 0.3s ease',
                    }}
                >
                    <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

                    <div style={{ padding: '20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Issue Details</h2>
                        <button
                            onClick={() => setSelectedIssue(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '20px',
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {selectedIssue.photo_url && (
                            <img
                                src={selectedIssue.photo_url}
                                alt="Issue"
                                style={{ width: '100%', borderRadius: '8px', marginBottom: '16px', maxHeight: '200px', objectFit: 'cover' }}
                            />
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>
                                Description
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                {selectedIssue.description}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>
                                Location Address
                            </div>
                            <div>{selectedIssue.location_address || 'N/A'}</div>
                        </div>

                        <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>
                                    Latitude
                                </div>
                                <div style={{ fontSize: '12px' }}>{selectedIssue.location_lat || 'N/A'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>
                                    Longitude
                                </div>
                                <div style={{ fontSize: '12px' }}>{selectedIssue.location_lng || 'N/A'}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>
                                Reported By
                            </div>
                            <div>{selectedIssue.reported_by?.name || 'Unknown'}</div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '4px' }}>
                                Reported Date/Time
                            </div>
                            <div>{new Date(selectedIssue.created_at).toLocaleString('en-IN')}</div>
                        </div>

                        {selectedIssue.status === 'open' && (
                            <>
                                {/* Convert to Task Form */}
                                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--admin-border)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                                        Convert to Task
                                    </h3>
                                    <form onSubmit={handleConvertToTask}>
                                        <div className="admin-form-group">
                                            <label className="admin-form-label required">Task Type</label>
                                            <select
                                                className="admin-form-select"
                                                value={convertFormData.type}
                                                onChange={(e) =>
                                                    setConvertFormData({
                                                        ...convertFormData,
                                                        type: e.target.value,
                                                    })
                                                }
                                                required
                                            >
                                                <option value="bin_clean">Bin Cleanup</option>
                                                <option value="litter_pickup">Litter Pickup</option>
                                                <option value="drain_clearance">Drain Clearance</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div className="admin-form-group">
                                            <label className="admin-form-label">Priority</label>
                                            <select
                                                className="admin-form-select"
                                                value={convertFormData.priority}
                                                onChange={(e) =>
                                                    setConvertFormData({
                                                        ...convertFormData,
                                                        priority: parseInt(e.target.value),
                                                    })
                                                }
                                            >
                                                <option value={1}>Urgent</option>
                                                <option value={2}>Normal</option>
                                                <option value={3}>Low</option>
                                            </select>
                                        </div>

                                        <div className="admin-form-group">
                                            <label className="admin-form-label">Assign Worker (Optional)</label>
                                            <select
                                                className="admin-form-select"
                                                value={convertFormData.assigned_worker_id}
                                                onChange={(e) =>
                                                    setConvertFormData({
                                                        ...convertFormData,
                                                        assigned_worker_id: e.target.value,
                                                    })
                                                }
                                            >
                                                <option value="">Select a worker</option>
                                                {workers.map((w) => (
                                                    <option key={w.id} value={w.id}>
                                                        {w.name} ({w.employee_id})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="admin-form-group">
                                            <label className="admin-form-label required">Due Date</label>
                                            <input
                                                type="datetime-local"
                                                className="admin-form-input"
                                                value={convertFormData.due_at}
                                                onChange={(e) =>
                                                    setConvertFormData({
                                                        ...convertFormData,
                                                        due_at: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                        </div>

                                        <button type="submit" className="admin-btn-primary" style={{ width: '100%' }}>
                                            Convert to Task
                                        </button>
                                    </form>
                                </div>

                                {/* Reject Form */}
                                <div>
                                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                                        Reject Issue
                                    </h3>
                                    <form onSubmit={handleRejectIssue}>
                                        <div className="admin-form-group">
                                            <label className="admin-form-label required">Reason</label>
                                            <textarea
                                                className="admin-form-textarea"
                                                placeholder="Reason for rejection"
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                required
                                            ></textarea>
                                        </div>
                                        <button
                                            type="submit"
                                            className="admin-btn-outline danger"
                                            style={{ width: '100%' }}
                                        >
                                            Reject Issue
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}

                        {selectedIssue.status === 'rejected' && selectedIssue.rejection_reason && (
                            <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#C62828', fontWeight: '600', marginBottom: '4px' }}>
                                    Rejection Reason
                                </div>
                                <div style={{ fontSize: '13px', color: '#D32F2F' }}>
                                    {selectedIssue.rejection_reason}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Overlay */}
            {selectedIssue && (
                <div
                    onClick={() => setSelectedIssue(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        zIndex: 400,
                    }}
                ></div>
            )}
        </div>
    );
}

export default IssueManagement;
