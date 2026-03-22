import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Copy, Loader } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';

function WorkerManagement() {
    const dispatch = useDispatch();
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [successCredentials, setSuccessCredentials] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        assignedArea: '',
        village: '',
    });

    const [villages, setVillages] = useState([]);

    useEffect(() => {
        fetchWorkers();
        fetchVillages();
    }, [adminId]);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data
            setWorkers([
                {
                    id: 1,
                    name: 'Rajesh Kumar',
                    employeeId: 'GWC-WRK-0001',
                    phone: '9876543210',
                    assignedArea: 'Ward 3',
                    status: 'active',
                    lastLogin: '2 hours ago',
                    tasksDone: 28,
                },
                {
                    id: 2,
                    name: 'Priya Singh',
                    employeeId: 'GWC-WRK-0002',
                    phone: '9876543211',
                    assignedArea: 'Ward 5',
                    status: 'active',
                    lastLogin: '30 min ago',
                    tasksDone: 35,
                },
            ]);

            showToast('Workers loaded successfully', 'success');
        } catch (err) {
            setError('Failed to fetch workers');
            showToast('Failed to load workers', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchVillages = async () => {
        // Mock villages
        setVillages([
            { id: 1, name: 'Gokul Nagar' },
            { id: 2, name: 'Ram Vihar' },
            { id: 3, name: 'Shyam Nagar' },
        ]);
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.phone || !formData.assignedArea) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            // Mock API call
            const newWorker = {
                id: workers.length + 1,
                name: formData.name,
                employeeId: `GWC-WRK-${String(workers.length + 1).padStart(4, '0')}`,
                phone: formData.phone,
                assignedArea: formData.assignedArea,
                status: 'active',
                lastLogin: 'N/A',
                tasksDone: 0,
            };

            setSuccessCredentials({
                name: formData.name,
                employeeId: newWorker.employeeId,
                tempPassword: 'TempPass123!',
            });

            setFormData({ name: '', phone: '', assignedArea: '', village: '' });
            showToast('Worker created successfully', 'success');
        } catch (err) {
            setError('Failed to create worker');
            showToast('Failed to create worker', 'error');
        }
    };

    const handleDeactivate = async (workerId) => {
        if (!window.confirm('Are you sure you want to deactivate this worker?')) return;

        try {
            // Mock deactivation
            setWorkers(workers.filter(w => w.id !== workerId));
            showToast('Worker deactivated', 'success');
        } catch (err) {
            showToast('Failed to deactivate worker', 'error');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading workers...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />

            <div className="admin-flex-between" style={{ marginBottom: '24px' }}>
                <h1 className="admin-page-title" style={{ margin: 0 }}>Safai Mitra Workers</h1>
                <button
                    className="admin-btn-primary"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={18} /> Add New Worker
                </button>
            </div>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Workers Table */}
            <div className="admin-table-wrap">
                {workers.length === 0 ? (
                    <div className="admin-table-empty">No workers found</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Employee ID</th>
                                <th>Assigned Area</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Tasks Done</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((worker) => (
                                <tr key={worker.id}>
                                    <td><strong>{worker.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {worker.employeeId}
                                    </td>
                                    <td>{worker.assignedArea}</td>
                                    <td>{worker.phone}</td>
                                    <td>
                                        <div className={`admin-badge ${worker.status === 'active' ? 'active' : 'inactive'}`}>
                                            {worker.status}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {worker.lastLogin}
                                    </td>
                                    <td><strong>{worker.tasksDone}</strong></td>
                                    <td>
                                        <button
                                            className="admin-btn-outline admin-btn-sm danger"
                                            onClick={() => handleDeactivate(worker.id)}
                                        >
                                            <Trash2 size={14} /> Deactivate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Worker Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => {
                    setShowModal(false);
                    setSuccessCredentials(null);
                }}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                {successCredentials ? 'Worker Created Successfully' : 'Add New Worker'}
                            </h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => {
                                    setShowModal(false);
                                    setSuccessCredentials(null);
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            {successCredentials ? (
                                <div>
                                    <div
                                        style={{
                                            backgroundColor: '#EAF3DE',
                                            border: '1px solid #3B6D11',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <div style={{ fontSize: '12px', color: '#3B6D11', marginBottom: '12px', fontWeight: '600' }}>
                                            ⚠ Note these credentials — they will not be shown again.
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Name</div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                <strong>{successCredentials.name}</strong>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successCredentials.name)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        color: 'var(--admin-primary)',
                                                        textDecoration: 'underline',
                                                    }}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Employee ID</div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                <strong>{successCredentials.employeeId}</strong>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successCredentials.employeeId)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        color: 'var(--admin-primary)',
                                                        textDecoration: 'underline',
                                                    }}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Temporary Password</div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                <strong>{successCredentials.tempPassword}</strong>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successCredentials.tempPassword)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        color: 'var(--admin-primary)',
                                                        textDecoration: 'underline',
                                                    }}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleAddWorker}>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label required">Name</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            placeholder="Worker name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Phone</label>
                                        <input
                                            type="tel"
                                            className="admin-form-input"
                                            placeholder="Phone number"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Assigned Area</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            placeholder="e.g. Ward 3, Gokul Nagar"
                                            value={formData.assignedArea}
                                            onChange={(e) => setFormData({ ...formData, assignedArea: e.target.value })}
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label className="admin-form-label required">Village</label>
                                        <select
                                            className="admin-form-select"
                                            value={formData.village}
                                            onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a village</option>
                                            {villages.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name}
                                                </option>
                                            ))}
                                        </select>
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
                                            Create Worker
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {successCredentials && (
                            <div className="admin-modal-footer">
                                <button
                                    className="admin-btn-primary"
                                    onClick={() => {
                                        setShowModal(false);
                                        setSuccessCredentials(null);
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkerManagement;
