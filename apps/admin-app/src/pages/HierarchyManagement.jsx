import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Loader } from 'lucide-react';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { ROLE_LABELS, CHILD_ROLE } from '../utils/constants';

function HierarchyManagement() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [admins, setAdmins] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        jurisdiction: '',
    });

    useEffect(() => {
        fetchAdmins();
    }, [adminId]);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data
            setAdmins([
                {
                    id: 1,
                    name: 'Rajesh Sharma',
                    email: 'rajesh@gramwaste.local',
                    role: 'block_samiti',
                    jurisdiction: 'North Block',
                    createdAt: '2026-01-15',
                    status: 'active',
                },
                {
                    id: 2,
                    name: 'Priya Gupta',
                    email: 'priya@gramwaste.local',
                    role: 'gram_panchayat',
                    jurisdiction: 'Gokul Nagar Panchayat',
                    createdAt: '2026-02-01',
                    status: 'active',
                },
            ]);

            showToast('Admin list loaded', 'success');
        } catch (err) {
            setError('Failed to fetch admins');
            showToast('Failed to load admin list', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getNewRoleForCreation = () => {
        if (role === 'zilla_parishad') return 'block_samiti';
        if (role === 'block_samiti') return 'gram_panchayat';
        if (role === 'gram_panchayat') return 'panchayat_admin';
        return null;
    };

    const getNewRoleLabel = () => {
        const newRole = getNewRoleForCreation();
        if (!newRole) return '';
        return ROLE_LABELS[newRole] || newRole;
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (!formData.name || !formData.email || !formData.jurisdiction) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            const newAdmin = {
                id: admins.length + 1,
                name: formData.name,
                email: formData.email,
                role: getNewRoleForCreation(),
                jurisdiction: formData.jurisdiction,
                createdAt: new Date().toISOString().split('T')[0],
                status: 'active',
            };

            setAdmins([...admins, newAdmin]);
            showToast('Admin created successfully', 'success');
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                jurisdiction: '',
            });
            setShowModal(false);
        } catch (err) {
            showToast('Failed to create admin', 'error');
        }
    };

    const handleDeactivate = (adminId) => {
        if (!window.confirm('Are you sure you want to deactivate this admin?')) return;

        try {
            setAdmins(
                admins.map((admin) =>
                    admin.id === adminId ? { ...admin, status: 'inactive' } : admin
                )
            );
            showToast('Admin deactivated', 'success');
        } catch (err) {
            showToast('Failed to deactivate admin', 'error');
        }
    };

    const formatRoleLabel = (roleStr) => {
        return ROLE_LABELS[roleStr] || roleStr.replace(/_/g, ' ').toUpperCase();
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading admins...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />

            <div className="admin-flex-between" style={{ marginBottom: '24px' }}>
                <h1 className="admin-page-title" style={{ margin: 0 }}>Manage Admins</h1>
                <button
                    className="admin-btn-primary"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={18} /> Create Admin
                </button>
            </div>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Sub-Admins Table */}
            <div className="admin-table-wrap">
                {admins.length === 0 ? (
                    <div className="admin-table-empty">No admins found</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Jurisdiction</th>
                                <th>Created At</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map((admin) => (
                                <tr key={admin.id}>
                                    <td><strong>{admin.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {admin.email}
                                    </td>
                                    <td>{formatRoleLabel(admin.role)}</td>
                                    <td>{admin.jurisdiction}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {new Date(admin.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                    <td>
                                        <div
                                            className={`admin-badge ${admin.status === 'active' ? 'active' : 'inactive'
                                                }`}
                                        >
                                            {admin.status}
                                        </div>
                                    </td>
                                    <td>
                                        {admin.status === 'active' && (
                                            <button
                                                className="admin-btn-outline admin-btn-sm danger"
                                                onClick={() => handleDeactivate(admin.id)}
                                            >
                                                Deactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Admin Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">Create New Admin</h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            <div
                                style={{
                                    backgroundColor: '#E3F2FD',
                                    border: '1px solid #1976D2',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    fontSize: '12px',
                                    color: '#1976D2',
                                }}
                            >
                                This account will be created as: <strong>{getNewRoleLabel()}</strong>
                            </div>

                            <form onSubmit={handleCreateAdmin}>
                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Name</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        placeholder="Full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Email</label>
                                    <input
                                        type="email"
                                        className="admin-form-input"
                                        placeholder="Email address"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Password</label>
                                    <input
                                        type="password"
                                        className="admin-form-input"
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="admin-form-input"
                                        placeholder="Confirm password"
                                        value={formData.confirmPassword}
                                        onChange={(e) =>
                                            setFormData({ ...formData, confirmPassword: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Jurisdiction Name</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        placeholder="e.g. North Block, Gokul Nagar"
                                        value={formData.jurisdiction}
                                        onChange={(e) =>
                                            setFormData({ ...formData, jurisdiction: e.target.value })
                                        }
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
                                        Create Admin
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

export default HierarchyManagement;
