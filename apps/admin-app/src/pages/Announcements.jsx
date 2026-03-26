import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Pin, Loader } from 'lucide-react';
import { selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import {
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    togglePin,
} from '../features/announcements/announcementAPI';
import supabase from '../services/supabaseClient';

function Announcements() {
    const dispatch = useDispatch();
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [announcements, setAnnouncements] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [villages, setVillages] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_village_id: null,
        is_pinned: false,
    });

    useEffect(() => {
        loadInitialData();
    }, [adminId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load villages
            const { data: villagesData } = await supabase
                .from('villages')
                .select('id, name')
                .order('name');
            setVillages(villagesData || []);

            // Load announcements
            await loadAnnouncements();
        } catch (err) {
            console.error('Error loading initial data:', err);
            setError('Failed to load data');
            showToast('Failed to load announcements', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadAnnouncements = async () => {
        try {
            const data = await fetchAnnouncements();
            setAnnouncements(data);
        } catch (err) {
            console.error('Error fetching announcements:', err);
            setError('Failed to load announcements');
        }
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.content) {
            showToast('Please fill in title and content', 'error');
            return;
        }

        if (formData.content.trim().split('\n').length < 3) {
            showToast('Please provide at least 3 lines of content', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            await createAnnouncement(formData, adminId);
            showToast('Announcement posted successfully', 'success');
            setFormData({ title: '', content: '', target_village_id: null, is_pinned: false });
            setShowModal(false);
            await loadAnnouncements();
        } catch (err) {
            console.error('Error creating announcement:', err);
            showToast('Failed to post announcement', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;

        try {
            await deleteAnnouncement(id);
            showToast('Announcement deleted', 'success');
            await loadAnnouncements();
        } catch (err) {
            console.error('Error deleting announcement:', err);
            showToast('Failed to delete announcement', 'error');
        }
    };

    const handleTogglePin = async (id, currentPinStatus) => {
        try {
            await togglePin(id, !currentPinStatus);
            showToast(`Announcement ${!currentPinStatus ? 'pinned' : 'unpinned'}`, 'success');
            await loadAnnouncements();
        } catch (err) {
            console.error('Error updating pin status:', err);
            showToast('Failed to update pin status', 'error');
        }
    };

    // Sort so pinned items come first
    const sortedAnnouncements = [
        ...announcements
            .filter((a) => a.is_pinned)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        ...announcements
            .filter((a) => !a.is_pinned)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
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
            {announcements.length === 0 ? (
                <div className="admin-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-muted)' }}>
                    <p>No announcements yet. Start by posting one!</p>
                </div>
            ) : (
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
                                borderLeft: announcement.is_pinned
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
                                    📍 {announcement.target_village_id
                                        ? villages.find((v) => v.id === announcement.target_village_id)?.name || 'Unknown Village'
                                        : 'Broadcast to All'
                                    }
                                </span>
                                {announcement.is_pinned && (
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
                                {new Date(announcement.created_at).toLocaleDateString('en-IN')}
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="admin-btn-outline admin-btn-sm"
                                    style={{ fontSize: '11px', flex: 1 }}
                                    onClick={() => handleTogglePin(announcement.id, announcement.is_pinned)}
                                >
                                    <Pin size={14} /> {announcement.is_pinned ? 'Unpin' : 'Pin'}
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
            )}

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
                                    <label className="admin-form-label">Target Village (Leave empty for broadcast)</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.target_village_id || ''}
                                        onChange={(e) =>
                                            setFormData({ ...formData, target_village_id: e.target.value ? parseInt(e.target.value) : null })
                                        }
                                    >
                                        <option value="">All Villages (Broadcast)</option>
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
                                        checked={formData.is_pinned}
                                        onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
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
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="admin-btn-primary"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Posting...' : 'Post Announcement'}
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
