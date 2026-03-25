import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Pin, Loader } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';

function Announcements() {
    const dispatch = useDispatch();
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [announcements, setAnnouncements] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        village: 'all',
    });

    const [villages] = useState([
        { id: 'all', name: 'All Villages' },
        { id: 1, name: 'Gokul Nagar' },
        { id: 2, name: 'Ram Vihar' },
        { id: 3, name: 'Shyam Nagar' },
    ]);

    useEffect(() => {
        fetchAnnouncements();
    }, [adminId]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data
            setAnnouncements([
                {
                    id: 1,
                    title: 'Scheduled Maintenance',
                    content: 'All bins will be serviced on Friday. Workers should prioritize bin collection.',
                    village: 'All Villages',
                    isPinned: true,
                    postedAt: '2026-03-20',
                },
                {
                    id: 2,
                    title: 'New Collection Schedule',
                    content: 'Collection schedule has been updated for Gokul Nagar. Please refer to the app for details.',
                    village: 'Gokul Nagar',
                    isPinned: false,
                    postedAt: '2026-03-19',
                },
            ]);

            showToast('Announcements loaded', 'success');
        } catch (err) {
            setError('Failed to fetch announcements');
            showToast('Failed to load announcements', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAnnouncement = (e) => {
        e.preventDefault();

        if (!formData.title || !formData.content) {
            showToast('Please fill in title and content', 'error');
            return;
        }

        try {
            const newAnnouncement = {
                id: announcements.length + 1,
                title: formData.title,
                content: formData.content,
                village: villages.find((v) => v.id == formData.village)?.name || 'All Villages',
                isPinned: false,
                postedAt: new Date().toISOString().split('T')[0],
            };

            setAnnouncements([newAnnouncement, ...announcements]);
            showToast('Announcement posted', 'success');
            setFormData({ title: '', content: '', village: 'all' });
            setShowModal(false);
        } catch (err) {
            showToast('Failed to create announcement', 'error');
        }
    };

    const handleDeleteAnnouncement = (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;

        try {
            setAnnouncements(announcements.filter((a) => a.id !== id));
            showToast('Announcement deleted', 'success');
        } catch (err) {
            showToast('Failed to delete announcement', 'error');
        }
    };

    const handleTogglePin = (id) => {
        try {
            setAnnouncements(
                announcements.map((a) =>
                    a.id === id ? { ...a, isPinned: !a.isPinned } : a
                )
            );
            showToast('Pin status updated', 'success');
        } catch (err) {
            showToast('Failed to update pin status', 'error');
        }
    };

    // Sort so pinned items come first
    const sortedAnnouncements = [
        ...announcements
            .filter((a) => a.isPinned)
            .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
        ...announcements
            .filter((a) => !a.isPinned)
            .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
    ];

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading announcements...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />

            <div className="admin-flex-between" style={{ marginBottom: '24px' }}>
                <h1 className="admin-page-title" style={{ margin: 0 }}>Announcements</h1>
                <button
                    className="admin-btn-primary"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={18} /> Post New
                </button>
            </div>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Announcements List */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                }}
            >
                {sortedAnnouncements.map((announcement) => (
                    <div
                        key={announcement.id}
                        className="admin-panel"
                        style={{
                            borderLeft: announcement.isPinned
                                ? '4px solid var(--admin-primary)'
                                : '4px solid transparent',
                            position: 'relative',
                        }}
                    >
                        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
                            {announcement.title}
                        </h3>

                        <p
                            style={{
                                fontSize: '13px',
                                color: 'var(--admin-text)',
                                marginBottom: '12px',
                                lineHeight: '1.4',
                                maxHeight: '60px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                            }}
                        >
                            {announcement.content}
                        </p>

                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap',
                                marginBottom: '12px',
                            }}
                        >
                            <span
                                style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    backgroundColor: '#F0F0F0',
                                    color: 'var(--admin-muted)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                }}
                            >
                                📍 {announcement.village}
                            </span>
                            {announcement.isPinned && (
                                <span
                                    style={{
                                        display: 'inline-block',
                                        fontSize: '11px',
                                        backgroundColor: 'var(--admin-active)',
                                        color: 'var(--admin-primary)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                    }}
                                >
                                    📌 Pinned
                                </span>
                            )}
                        </div>

                        <div
                            style={{
                                fontSize: '11px',
                                color: 'var(--admin-muted)',
                                marginBottom: '12px',
                            }}
                        >
                            {new Date(announcement.postedAt).toLocaleDateString('en-IN')}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="admin-btn-outline admin-btn-sm"
                                style={{ fontSize: '11px', flex: 1 }}
                                onClick={() => handleTogglePin(announcement.id)}
                            >
                                <Pin size={14} /> {announcement.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                                className="admin-btn-outline admin-btn-sm danger"
                                style={{ fontSize: '11px', flex: 1 }}
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Post Announcement Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">Post New Announcement</h2>
                            <button
                                className="admin-modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            <form onSubmit={handleCreateAnnouncement}>
                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Title</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        placeholder="Announcement title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Content</label>
                                    <textarea
                                        className="admin-form-textarea"
                                        placeholder="Announcement content"
                                        value={formData.content}
                                        onChange={(e) =>
                                            setFormData({ ...formData, content: e.target.value })
                                        }
                                        required
                                    ></textarea>
                                    <div className="admin-form-help">
                                        Minimum 3 lines of content
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label required">Target Village</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.village}
                                        onChange={(e) =>
                                            setFormData({ ...formData, village: e.target.value })
                                        }
                                    >
                                        {villages.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '16px',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        id="pin-toggle"
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label
                                        htmlFor="pin-toggle"
                                        style={{ fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        Pin to top
                                    </label>
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
                                        Post Announcement
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

export default Announcements;
