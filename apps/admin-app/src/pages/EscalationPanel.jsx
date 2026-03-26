import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import {
    fetchOverdueItems,
    addResolutionNote,
    markTaskResolved,
    escalateTask,
} from '../features/escalation/escalationAPI';

function EscalationPanel() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [overdueItems, setOverdueItems] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadOverdueItems();
    }, [adminId]);

    const loadOverdueItems = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await fetchOverdueItems(adminId);
            setOverdueItems(data);
        } catch (err) {
            console.error('Error loading overdue items:', err);
            setError('Failed to load escalation data');
            showToast('Failed to load escalation data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async (taskId) => {
        if (!resolutionNotes.trim()) {
            showToast('Please enter a note', 'error');
            return;
        }

        try {
            await addResolutionNote(taskId, resolutionNotes);
            showToast('Note saved successfully', 'success');
            setResolutionNotes('');
        } catch (err) {
            console.error('Error saving note:', err);
            showToast('Failed to save note', 'error');
        }
    };

    const handleMarkResolved = async (taskId) => {
        try {
            await markTaskResolved(taskId);
            setOverdueItems(overdueItems.filter((item) => item.id !== taskId));
            showToast('Task marked as resolved', 'success');
            setSelectedTaskId(null);
        } catch (err) {
            console.error('Error marking task resolved:', err);
            showToast('Failed to mark as resolved', 'error');
        }
    };

    const handleEscalateHigher = async (taskId) => {
        if (role === 'zilla_parishad') {
            showToast('Cannot escalate further - highest level reached', 'info');
            return;
        }

        try {
            const escalationReason = `Escalated by ${role.replace(/_/g, ' ')} for resolution.`;
            await escalateTask(taskId, escalationReason);
            showToast('Task escalated to higher priority', 'success');
            await loadOverdueItems();
        } catch (err) {
            console.error('Error escalating task:', err);
            showToast('Failed to escalate task', 'error');
        }
    };

    const getDaysOverdue = (createdAt) => {
        if (!createdAt) return 0;
        const ms = Date.now() - new Date(createdAt).getTime();
        return Math.max(0, Math.floor(ms / 86400000));
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading escalation data...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />
            <h1 className="admin-page-title">Escalation Panel</h1>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <p
                style={{
                    color: 'var(--admin-muted)',
                    marginBottom: '24px',
                    fontSize: '14px',
                }}
            >
                These are unresolved issues from your jurisdiction.
            </p>

            {/* Overdue Tasks Table */}
            <div className="admin-panel">
                <h2
                    style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        color: 'var(--admin-text)',
                    }}
                >
                    Open Issues
                </h2>

                {overdueItems.length === 0 ? (
                    <div className="admin-table-empty">No open issues</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Issue</th>
                                    <th>Location</th>
                                    <th>Days Overdue</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdueItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedTaskId(item.id)}
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor:
                                                selectedTaskId === item.id ? 'var(--admin-active)' : 'transparent',
                                        }}
                                    >
                                        <td>
                                            <strong>{item.description || 'Issue report'}</strong>
                                        </td>
                                        <td>{item.location_address || 'N/A'}</td>
                                        <td>
                                            <span style={{ color: '#A32D2D', fontWeight: '600' }}>
                                                {getDaysOverdue(item.created_at)} days
                                            </span>
                                        </td>
                                        <td>
                                            <div
                                                className={`admin-badge ${item.status === 'in_progress'
                                                    ? 'active'
                                                    : item.status === 'assigned'
                                                        ? 'pending'
                                                        : 'pending'
                                                    }`}
                                            >
                                                {item.status.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    className="admin-btn-outline admin-btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkResolved(item.id);
                                                    }}
                                                    style={{ fontSize: '11px' }}
                                                >
                                                    Resolved
                                                </button>
                                                {role !== 'zilla_parishad' && (
                                                    <button
                                                        className="admin-btn-outline admin-btn-sm danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEscalateHigher(item.id);
                                                        }}
                                                        style={{ fontSize: '11px' }}
                                                    >
                                                        Escalate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Notes and Actions Section */}
            {selectedTaskId && (
                <div className="admin-panel">
                    <h3
                        style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            marginBottom: '16px',
                            color: 'var(--admin-text)',
                        }}
                    >
                        Task Actions
                    </h3>

                    {/* Resolution Notes Section */}
                    <div className="admin-form-group">
                        <label className="admin-form-label">Add Resolution Notes</label>
                        <textarea
                            className="admin-form-textarea"
                            placeholder="Enter resolution notes for the selected task..."
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                        ></textarea>
                    </div>

                    <button
                        className="admin-btn-primary"
                        onClick={() => handleSaveNote(selectedTaskId)}
                    >
                        Save Note
                    </button>
                </div>
            )}
        </div>
    );
}

export default EscalationPanel;
