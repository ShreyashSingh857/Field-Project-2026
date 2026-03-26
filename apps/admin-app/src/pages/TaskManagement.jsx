import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, MapPin, Clock, Trash2, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { fetchTasks, createTask, cancelTask, assignWorker } from '../features/tasks/taskAPI';
import supabase from '../services/supabaseClient';
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
    const [villages, setVillages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');
    const [showProofModal, setShowProofModal] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'bin_clean',
        description: '',
        location_lat: '',
        location_lng: '',
        location_address: '',
        priority: 2,
        assigned_worker_id: '',
        village_id: '',
        due_at: '',
    });

    useEffect(() => {
        loadTasks();
        loadWorkers();
        loadVillages();
    }, [adminId]);

    const loadTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchTasks(adminId);
            setTasks(data);
            showToast('Tasks loaded successfully', 'success');
        } catch (err) {
            setError(err.message || 'Failed to fetch tasks');
            showToast('Failed to load tasks: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadWorkers = async () => {
        try {
            const { data, error: err } = await supabase
                .from('workers')
                .select('id, employee_id, name, is_active')
                .eq('created_by_admin_id', adminId)
                .eq('is_active', true);

            if (err) throw err;
            setWorkers(data || []);
        } catch (err) {
            console.error('Error loading workers:', err);
        }
    };

    const loadVillages = async () => {
        try {
            const { data, error: err } = await supabase
                .from('villages')
                .select('id, name')
                .order('name', { ascending: true });

            if (err) throw err;
            setVillages(data || []);
        } catch (err) {
            console.error('Error loading villages:', err);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.location_address || !formData.due_at || !formData.village_id) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            await createTask(
                {
                    title: formData.title,
                    type: formData.type,
                    description: formData.description,
                    location_lat: parseFloat(formData.location_lat),
                    location_lng: parseFloat(formData.location_lng),
                    location_address: formData.location_address,
                    priority: parseInt(formData.priority),
                    village_id: formData.village_id,
                    due_at: formData.due_at,
                },
                adminId
            );

            showToast('Task created successfully', 'success');
            setShowModal(false);
            setFormData({
                title: '',
                type: 'bin_clean',
                description: '',
                location_lat: '',
                location_lng: '',
                location_address: '',
                priority: 2,
                assigned_worker_id: '',
                village_id: '',
                due_at: '',
            });
            await loadTasks();
        } catch (err) {
            showToast('Failed to create task: ' + err.message, 'error');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to cancel this task?')) return;
        try {
            await cancelTask(taskId);
            await loadTasks();
            showToast('Task cancelled successfully', 'success');
        } catch (err) {
            showToast('Failed to cancel task: ' + err.message, 'error');
        }
    };

    const handleAssignWorker = async (taskId) => {
        if (workers.length === 0) {
            showToast('No active workers available for assignment', 'error');
            return;
        }
        const workerId = window.prompt('Enter Worker ID to assign this task:');
        if (!workerId) return;
        try {
            await assignWorker(taskId, workerId.trim());
            await loadTasks();
            showToast('Worker assigned successfully', 'success');
        } catch (err) {
            showToast('Failed to assign worker: ' + err.message, 'error');
        }
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
                                        {task.location_address || 'N/A'}
                                    </td>
                                    <td>{task.worker?.name || 'Unassigned'}</td>
                                    <td>
                                        <div className={`admin-badge ${task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'active' : task.status === 'pending' ? 'pending' : ''}`}>
                                            {task.status.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td>{getPriorityIcon(task.priority)}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {task.due_at ? new Date(task.due_at).toLocaleDateString('en-IN') : 'N/A'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {!task.assigned_worker_id && (
                                                <button
                                                    className="admin-btn-outline admin-btn-sm"
                                                    style={{ fontSize: '11px' }}
                                                    onClick={() => handleAssignWorker(task.id)}
                                                >
                                                    Assign
                                                </button>
                                            )}
                                            {task.status === 'done' && task.proof_photo_url && (
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
                                                onClick={() => handleDeleteTask(task.id)}
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
                            {(showProofModal.proof_photo_url || showProofModal.proofUrl) && (
                                <img
                                    src={showProofModal.proof_photo_url || showProofModal.proofUrl}
                                    alt="Task proof"
                                    style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }}
                                />
                            )}
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                <div>
                                    <strong>Completed:</strong> {showProofModal.completed_at
                                        ? new Date(showProofModal.completed_at).toLocaleString('en-IN')
                                        : 'N/A'}
                                </div>
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

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Location Address</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        placeholder="Location address"
                                        value={formData.location_address}
                                        onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Latitude</label>
                                        <input
                                            type="number"
                                            className="admin-form-input"
                                            placeholder="Latitude"
                                            step="0.0001"
                                            value={formData.location_lat}
                                            onChange={(e) => setFormData({ ...formData, location_lat: e.target.value })}
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Longitude</label>
                                        <input
                                            type="number"
                                            className="admin-form-input"
                                            placeholder="Longitude"
                                            step="0.0001"
                                            value={formData.location_lng}
                                            onChange={(e) => setFormData({ ...formData, location_lng: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Village</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.village_id}
                                        onChange={(e) => setFormData({ ...formData, village_id: e.target.value })}
                                        required
                                        disabled={villages.length === 0}
                                    >
                                        <option value="">
                                            {villages.length === 0
                                                ? 'No villages configured in Supabase'
                                                : 'Select a village'}
                                        </option>
                                        {villages.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
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
                                    <label className="admin-form-label">Assign Worker (Optional)</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.assigned_worker_id}
                                        onChange={(e) => setFormData({ ...formData, assigned_worker_id: e.target.value })}
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
                                        value={formData.due_at}
                                        onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                                        required
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
