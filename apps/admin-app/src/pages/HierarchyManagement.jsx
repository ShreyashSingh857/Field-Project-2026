import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Loader } from 'lucide-react';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { createSubAdminThunk, deactivateSubAdminThunk, fetchSubAdminsThunk, selectHierarchyAdmins } from '../features/hierarchy/hierarchySlice';
import { ROLE_LABELS, CHILD_ROLE } from '../utils/constants';

function HierarchyManagement() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const hierarchyAdmins = useSelector(selectHierarchyAdmins);
    const { toast, showToast } = useToast();

    const [admins, setAdmins] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successCredentials, setSuccessCredentials] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        jurisdiction_name: '',
    });

    useEffect(() => {
        loadAdmins();
    }, [adminId]);

    const loadAdmins = async () => {
        try {
            setLoading(true);
            setError(null);
                        const result = await dispatch(fetchSubAdminsThunk({ adminId, adminRole: role }));
                        if (result.type.endsWith('fulfilled')) {
                            setAdmins(result.payload || []);
                        }
            showToast('Admin list loaded', 'success');
        } catch (err) {
            setError('Failed to fetch admins');
            showToast('Failed to load admin list: ' + err.message, 'error');
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

        if (!formData.name || !formData.email || !formData.password || !formData.jurisdiction_name) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            const newRoleForCreation = getNewRoleForCreation();
            if (!newRoleForCreation) {
                showToast('Your role cannot create sub-admins', 'error');
                return;
            }

                        const result = await dispatch(createSubAdminThunk({
                            adminData: {
                                name: formData.name,
                                email: formData.email,
                                password: formData.password,
                                role: newRoleForCreation,
                                jurisdiction_name: formData.jurisdiction_name,
                            },
                            adminId,
                            adminRole: role,
                        }));
                        if (!result.type.endsWith('fulfilled')) throw new Error(result.payload || 'Failed');

            setSuccessCredentials({
                name: result.payload.name,
                email: result.payload.email,
                temp_password: formData.password,
            });

            setFormData({
                name: '',
                email: '',
                password: '',
                jurisdiction_name: '',
            });

            await loadAdmins();
            showToast('Admin created successfully', 'success');
        } catch (err) {
            showToast('Failed to create admin: ' + err.message, 'error');
        }
    };

    const handleDeactivate = async (adminId) => {
        if (!window.confirm('Are you sure you want to deactivate this admin?')) return;

        try {
            await dispatch(deactivateSubAdminThunk({ subAdminId: adminId }));
            await loadAdmins();
            showToast('Admin deactivated successfully', 'success');
        } catch (err) {
            showToast('Failed to deactivate admin: ' + err.message, 'error');
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
                                    <td>{admin.jurisdiction_name}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {new Date(admin.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                    <td>
                                        <div
                                            className={`admin-badge ${admin.is_active ? 'active' : 'inactive'}`}
                                        >
                                            {admin.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </td>
                                    <td>
                                        {admin.is_active && (
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
                <div className="admin-modal-overlay" onClick={() => {
                    setShowModal(false);
                    setSuccessCredentials(null);
                }}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                {successCredentials ? 'Admin Created Successfully' : 'Create New Admin'}
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
                                            backgroundColor: '#C8E6C9',
                                            border: '1px solid #2E7D32',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <div style={{ fontSize: '12px', color: '#2E7D32', marginBottom: '12px', fontWeight: '600' }}>
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
                                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>Email</div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                <strong>{successCredentials.email}</strong>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(successCredentials.email)}
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
                                <form onSubmit={handleCreateAdmin}>
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
                                            placeholder="Set login password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="admin-form-group">
                                        <label className="admin-form-label required">Jurisdiction Name</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            placeholder="e.g. North Block, Gokul Nagar"
                                            value={formData.jurisdiction_name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, jurisdiction_name: e.target.value })
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
                            )}

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
                </div>
            )}
        </div>
    );
}

export default HierarchyManagement;
