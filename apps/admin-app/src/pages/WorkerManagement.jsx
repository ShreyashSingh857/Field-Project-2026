import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Copy, Loader } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { fetchWorkers, createWorker, deactivateWorker } from '../features/workers/workerAPI';
import supabase from '../services/supabaseClient';

function WorkerManagement() {
    const dispatch = useDispatch();
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [successCredentials, setSuccessCredentials] = useState(null);
    const [villages, setVillages] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        assigned_area: '',
        village_id: '',
        language: 'en',
    });

    useEffect(() => {
        loadWorkers();
        loadVillages();
    }, [adminId]);

    const loadWorkers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWorkers(adminId);
            setWorkers(data);
            showToast('Workers loaded successfully', 'success');
        } catch (err) {
            setError('Failed to fetch workers');
            showToast('Failed to load workers', 'error');
        } finally {
            setLoading(false);
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

    const handleAddWorker = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.village_id || !formData.assigned_area) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const result = await createWorker(
                {
                    name: formData.name,
                    phone: formData.phone,
                    assigned_area: formData.assigned_area,
                    village_id: formData.village_id,
                    language: formData.language,
                },
                adminId
            );

            setSuccessCredentials({
                name: result.name,
                employee_id: result.employee_id,
                temp_password: result.temp_password,
            });

            setFormData({ name: '', phone: '', assigned_area: '', village_id: '', language: 'en' });
            await loadWorkers();
            showToast('Worker created successfully', 'success');
        } catch (err) {
            setError('Failed to create worker');
            showToast('Failed to create worker: ' + err.message, 'error');
        }
    };

    const handleDeactivate = async (workerId) => {
        if (!window.confirm('Are you sure you want to deactivate this worker?')) return;

        try {
            await deactivateWorker(workerId);
            await loadWorkers();
            showToast('Worker deactivated successfully', 'success');
        } catch (err) {
            showToast('Failed to deactivate worker: ' + err.message, 'error');
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
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.map((worker) => (
                                <tr key={worker.id}>
                                    <td><strong>{worker.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {worker.employee_id}
                                    </td>
                                    <td>{worker.assigned_area || 'N/A'}</td>
                                    <td>{worker.phone || 'N/A'}</td>
                                    <td>
                                        <div className={`admin-badge ${worker.is_active ? 'active' : 'inactive'}`}>
                                            {worker.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {worker.last_login_at
                                            ? new Date(worker.last_login_at).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td>
                                        {worker.is_active && (
                                            <button
                                                className="admin-btn-outline admin-btn-sm danger"
                                                onClick={() => handleDeactivate(worker.id)}
                                            >
                                                <Trash2 size={14} /> Deactivate
                                            </button>
                                        )}
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
                                        <div>
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
                                                <strong>{successCredentials.employee_id}</strong>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successCredentials.employee_id)}
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
                                                <strong>{successCredentials.temp_password}</strong>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successCredentials.temp_password)}
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
                                        <label className="admin-form-label required">Assigned Area</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            placeholder="e.g. Ward 3, Gokul Nagar"
                                            value={formData.assigned_area}
                                            onChange={(e) => setFormData({ ...formData, assigned_area: e.target.value })}
                                            required
                                        />
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
                                        <label className="admin-form-label">Language</label>
                                        <select
                                            className="admin-form-select"
                                            value={formData.language}
                                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                        >
                                            <option value="en">English</option>
                                            <option value="hi">Hindi</option>
                                            <option value="mr">Marathi</option>
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
