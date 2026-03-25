import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, MapPin, Clock, Trash2, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { TASK_TYPES, PRIORITIES, formatDate, PRIORITY_LABELS, PRIORITY_COLORS } from '../utils/constants';

const getPriorityIcon = (priority) => {
    const icon = priority === 1 ? <AlertCircle size={16} color="#A32D2D" /> : null;
    const label = PRIORITY_LABELS[priority] || 'Normal';
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: PRIORITY_COLORS[priority] }}>
            {icon} {label}
        </span>
    );
};

function TaskManagement() {
    const dispatch = useDispatch();
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [tasks, setTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [showProofModal, setShowProofModal] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'bin_clean',
        description: '',
        location: '',
        priority: 2,
        assignedWorker: '',
        dueDate: '',
    });

    useEffect(() => {
        fetchTasks();
        fetchWorkers();
    }, [adminId]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data
            setTasks([
                {
                    id: 1,
                    title: 'Bin Cleanup - Market Road',
                    type: 'bin_clean',
                    location: 'Market Road',
                    worker: 'Rajesh Kumar',
                    status: 'in_progress',
                    priority: 1,
                    dueDate: '2026-03-22',
                },
                {
                    id: 2,
                    title: 'Litter Pickup - Park Area',
                    type: 'litter_pickup',
                    location: 'Central Park',
                    worker: 'Priya Singh',
                    status: 'pending',
                    priority: 2,
                    dueDate: '2026-03-25',
                },
                {
                    id: 3,
                    title: 'Drain Clearance - Main Street',
                    type: 'drain_clearance',
                    location: 'Main Street',
                    worker: 'Amit Sharma',
                    status: 'done',
                    priority: 1,
                    dueDate: '2026-03-20',
                },
            ]);

            showToast('Tasks loaded successfully', 'success');
        } catch (err) {
            setError(err.message || 'Failed to fetch tasks');
            showToast('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkers = () => {
        // Mock workers
        setWorkers([
            { id: 1, name: 'Rajesh Kumar' },
            { id: 2, name: 'Priya Singh' },
            { id: 3, name: 'Amit Sharma' },
        ]);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.location || !formData.dueDate) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            // Mock creation
            const newTask = {
                id: tasks.length + 1,
                title: formData.title,
                type: formData.type,
                location: formData.location,
                worker: workers.find(w => w.id == formData.assignedWorker)?.name || 'Unassigned',
                status: 'pending',
                priority: parseInt(formData.priority),
                dueDate: formData.dueDate,
            };

            setTasks([...tasks, newTask]);
            showToast('Task created successfully', 'success');
            setShowModal(false);
            setFormData({
                title: '',
                type: 'bin_clean',
                description: '',
                location: '',
                priority: 2,
                assignedWorker: '',
                dueDate: '',
            });
        } catch (err) {
            showToast('Failed to create task', 'error');
        }
    };

    const handleDeleteTask = (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        setTasks(tasks.filter(t => t.id !== taskId));
        showToast('Task deleted', 'success');
    };

    const filteredTasks = tasks.filter((task) => {
        if (filter === 'all') return true;
        return task.status === filter;
    });

    const getTaskTypeName = (type) => {
        const found = TASK_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading tasks...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />

            <div className="admin-flex-between" style={{ marginBottom: '24px' }}>
                <h1 className="admin-page-title" style={{ margin: 0 }}>Tasks</h1>
                <button
                    className="admin-btn-primary"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={18} /> Create Task
                </button>
            </div>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                {['all', 'pending', 'assigned', 'in_progress', 'done', 'cancelled'].map((status) => (
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

            {/* Tasks Table */}
            <div className="admin-table-wrap">
                {filteredTasks.length === 0 ? (
                    <div className="admin-table-empty">No tasks found</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Location</th>
                                <th>Assigned Worker</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Due Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map((task) => (
                                <tr key={task.id}>
                                    <td><strong>{task.title}</strong></td>
                                    <td>{getTaskTypeName(task.type)}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {task.location}
                                    </td>
                                    <td>{task.worker}</td>
                                    <td>
                                        <div className={`admin-badge ${task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'active' : task.status === 'pending' ? 'pending' : ''}`}>
                                            {task.status.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td>{getPriorityIcon(task.priority)}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {new Date(task.dueDate).toLocaleDateString('en-IN')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="admin-btn-outline admin-btn-sm"
                                                style={{ fontSize: '11px' }}
                                            >
                                                Assign
                                            </button>
                                            {task.status === 'done' && task.proofUrl && (
                                                <button
                                                    className="admin-btn-outline admin-btn-sm"
                                                    onClick={() => setShowProofModal(task)}
                                                    style={{ fontSize: '11px' }}
                                                >
                                                    View Proof
                                                </button>
                                            )}
                                            <button
                                                className="admin-btn-outline admin-btn-sm danger"
                                                style={{ fontSize: '11px' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Proof Modal */}
            {showProofModal && (
                <div className="admin-modal-overlay" onClick={() => setShowProofModal(null)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">Task Proof: {showProofModal.title}</h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => setShowProofModal(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            {showProofModal.proofUrl && (
                                <img
                                    src={showProofModal.proofUrl}
                                    alt="Task proof"
                                    style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }}
                                />
                            )}
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                <div><strong>Completed:</strong> 2026-03-20 10:30 AM</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Task Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">Create New Task</h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <form onSubmit={handleCreateTask}>
                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Title</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        placeholder="Task title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Type</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="bin_clean">Bin Cleanup</option>
                                        <option value="litter_pickup">Litter Pickup</option>
                                        <option value="drain_clearance">Drain Clearance</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Description</label>
                                    <textarea
                                        className="admin-form-textarea"
                                        placeholder="Task details"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Latitude</label>
                                        <input
                                            type="number"
                                            className="admin-form-input"
                                            placeholder="Latitude"
                                            step="0.0001"
                                            value={formData.latitude}
                                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Longitude</label>
                                        <input
                                            type="number"
                                            className="admin-form-input"
                                            placeholder="Longitude"
                                            step="0.0001"
                                            value={formData.longitude}
                                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Priority</label>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        {[
                                            { value: 1, label: 'Urgent' },
                                            { value: 2, label: 'Normal' },
                                            { value: 3, label: 'Low' },
                                        ].map((p) => (
                                            <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="priority"
                                                    value={p.value}
                                                    checked={formData.priority == p.value}
                                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                                />
                                                {p.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Assign Worker</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.assignedWorker}
                                        onChange={(e) => setFormData({ ...formData, assignedWorker: e.target.value })}
                                    >
                                        <option value="">Select a worker</option>
                                        {workers.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Due Date</label>
                                    <input
                                        type="datetime-local"
                                        className="admin-form-input"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>

                                <div className="admin-modal-footer">
                                    <button
                                        type="button"
                                        className="admin-btn-outline"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="admin-btn-primary">
                                        Create Task
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskManagement;
