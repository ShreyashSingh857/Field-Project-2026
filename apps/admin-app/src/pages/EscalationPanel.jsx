import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';

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
        fetchOverdueItems();
    }, [adminId]);

    const fetchOverdueItems = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data
            setOverdueItems([
                {
                    id: 1,
                    taskTitle: 'Bin Cleanup - Market Road',
                    village: 'Gokul Nagar',
                    worker: 'Rajesh Kumar',
                    daysOverdue: 3,
                    status: 'in_progress',
                },
                {
                    id: 2,
                    taskTitle: 'Drain Clearance - Main Street',
                    village: 'Ram Vihar',
                    worker: 'Priya Singh',
                    daysOverdue: 5,
                    status: 'assigned',
                },
                {
                    id: 3,
                    taskTitle: 'Litter Pickup - Park Area',
                    village: 'Shyam Nagar',
                    worker: 'Amit Sharma',
                    daysOverdue: 2,
                    status: 'pending',
                },
            ]);

            showToast('Escalation data loaded', 'success');
        } catch (err) {
            setError('Failed to fetch overdue items');
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
            // Mock API call
            showToast('Note saved successfully', 'success');
            setResolutionNotes('');
        } catch (err) {
            showToast('Failed to save note', 'error');
        }
    };

    const handleReassign = (taskId) => {
        showToast('Reassign worker dialog - To be implemented', 'info');
    };

    const handleMarkResolved = async (taskId) => {
        try {
            setOverdueItems(overdueItems.filter((item) => item.id !== taskId));
            showToast('Task marked as resolved', 'success');
            setSelectedTaskId(null);
        } catch (err) {
            showToast('Failed to mark as resolved', 'error');
        }
    };

    const handleEscalateHigher = (taskId) => {
        if (role === 'zilla_parishad') {
            showToast('Cannot escalate further - highest level', 'info');
        } else {
            showToast('Task escalated to higher authority', 'success');
        }
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
                These are overdue tasks and unresolved issues from your jurisdiction.
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
                    Overdue Tasks
                </h2>

                {overdueItems.length === 0 ? (
                    <div className="admin-table-empty">No overdue tasks</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Task Title</th>
                                    <th>Village</th>
                                    <th>Assigned Worker</th>
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
                                            <strong>{item.taskTitle}</strong>
                                        </td>
                                        <td>{item.village}</td>
                                        <td>{item.worker}</td>
                                        <td>
                                            <span style={{ color: '#A32D2D', fontWeight: '600' }}>
                                                {item.daysOverdue} days
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
                                                        handleReassign(item.id);
                                                    }}
                                                    style={{ fontSize: '11px' }}
                                                >
                                                    Reassign
                                                </button>
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

            {/* Notes Section */}
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
                        Resolution Notes
                    </h3>

                    <div className="admin-form-group">
                        <label className="admin-form-label">Add Notes</label>
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
