// apps/user-app/src/pages/MyListings.jsx
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
  Edit2,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';

export default function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchMyListings();
  }, []);

  async function fetchMyListings() {
    try {
      setError('');
      const res = await api.get('/marketplace?mine=true');
      setListings(res.data.listings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status, aiStatus) => {
    if (aiStatus === 'pending') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    if (aiStatus === 'failed') return 'bg-red-100 text-red-800 border border-red-300';
    if (status === 'pending') return 'bg-blue-100 text-blue-800 border border-blue-300';
    if (status === 'approved') return 'bg-green-100 text-green-800 border border-green-300';
    if (status === 'rejected') return 'bg-red-100 text-red-800 border border-red-300';
    if (status === 'flagged') return 'bg-orange-100 text-orange-800 border border-orange-300';
    return 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  const getStatusIcon = (status, aiStatus) => {
    if (aiStatus === 'pending') return <Clock className="w-4 h-4 text-yellow-600" />;
    if (aiStatus === 'failed') return <XCircle className="w-4 h-4 text-red-600" />;
    if (status === 'pending') return <Clock className="w-4 h-4 text-blue-600" />;
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-600" />;
    if (status === 'flagged') return <AlertCircle className="w-4 h-4 text-orange-600" />;
    return null;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      setDeleting(id);
      await api.delete(`/marketplace/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
      setSelectedListing(null);
      alert('Listing deleted');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const filteredListings = listings
    .filter(l => filterStatus === 'all' || l.status === filterStatus)
    .filter(
      l =>
        l.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="clay-card h-24 animate-pulse" />
          <div className="mt-3 clay-card h-28 animate-pulse" />
          <div className="mt-3 clay-card h-28 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
      <div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>
        <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={() => navigate('/marketplace')} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}>
              <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-black sm:text-base">My Listings</p>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>Track moderation and AI validation</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 pb-24 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8">
          <section className="clay-card p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-black">Your Listings</p>
              <button
                onClick={() => navigate('/marketplace/create')}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}
              >
                + Create New
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'rejected', 'flagged'].map((status) => (
                <button key={status} type="button" onClick={() => setFilterStatus(status)} className="clay-nav-item rounded-xl px-3 py-1.5 text-xs font-medium capitalize text-black" style={filterStatus === status ? { backgroundColor: 'var(--clay-card-alt)' } : undefined}>
                  {status}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--clay-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search listings"
                className="w-full rounded-xl py-2 pl-9 pr-3 text-sm text-black outline-none"
                style={{ backgroundColor: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: 'var(--clay-shadow)' }}
              />
            </div>
          </section>

          {error ? (
            <div className="clay-card p-4" style={{ borderColor: '#FFCDD2' }}>
              <p className="text-sm font-semibold" style={{ color: '#B71C1C' }}>{error}</p>
              <button type="button" onClick={fetchMyListings} className="mt-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--clay-primary)' }}>Retry</button>
            </div>
          ) : null}

          {filteredListings.length === 0 ? (
            <div className="clay-card p-6 text-center">
              <Eye className="mx-auto h-10 w-10" style={{ color: 'var(--clay-muted)' }} />
              <p className="mt-2 text-sm font-semibold text-black">No listings found</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--clay-muted)' }}>Create a listing or adjust filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Listings List */}
            <div className="space-y-3 lg:col-span-2">
              {filteredListings.map(listing => (
                <button
                  type="button"
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  className={`clay-card w-full overflow-hidden text-left ${
                    selectedListing?.id === listing.id
                      ? 'ring-2 ring-green-700/40'
                      : ''
                  }`}
                >
                  <div className="flex gap-3 p-3">
                    {listing.photo_url && (
                      <img
                        src={listing.photo_url}
                        alt={listing.title}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="line-clamp-2 text-sm font-semibold text-black sm:text-base">{listing.title}</h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusColor(
                            listing.status,
                            listing.ai_validation_status
                          )}`}
                        >
                          {getStatusIcon(listing.status, listing.ai_validation_status)}
                          {listing.ai_validation_status === 'failed'
                            ? 'AI Rejected'
                            : listing.ai_validation_status === 'pending'
                            ? 'AI Validating'
                            : listing.status}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs" style={{ color: 'var(--clay-muted)' }}>
                        {listing.description || 'No description'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--clay-muted)' }}>
                        <span className="font-semibold text-black">₹{listing.price}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(listing.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail Panel */}
            {selectedListing && (
              <div className="clay-card sticky top-24 h-fit p-4">
                {selectedListing.photo_url && (
                  <img
                    src={selectedListing.photo_url}
                    alt={selectedListing.title}
                    className="mb-3 h-44 w-full rounded-xl object-cover"
                  />
                )}
                <h2 className="text-base font-bold text-black sm:text-lg">{selectedListing.title}</h2>
                <span
                  className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                    selectedListing.status,
                    selectedListing.ai_validation_status
                  )}`}
                >
                  {getStatusIcon(selectedListing.status, selectedListing.ai_validation_status)}
                  {selectedListing.ai_validation_status === 'failed'
                    ? 'AI Rejected'
                    : selectedListing.ai_validation_status === 'pending'
                    ? 'AI Validating'
                    : selectedListing.status}
                </span>

                <div className="mt-3 space-y-2 border-t pt-3 text-xs" style={{ color: 'var(--clay-muted)' }}>
                  <div>
                    <p className="font-medium text-black">{selectedListing.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-black">₹{selectedListing.price}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(selectedListing.created_at).toLocaleString()}</span>
                  </div>

                  {selectedListing.ai_validation_notes && (
                    <div className="rounded-xl border p-2" style={{ borderColor: '#FBC02D', backgroundColor: '#FFFDE7' }}>
                      <p className="text-[11px] font-semibold" style={{ color: '#8D6E00' }}>
                        AI Validation Notes:
                      </p>
                      <p className="text-[11px]" style={{ color: '#8D6E00' }}>
                        {selectedListing.ai_validation_notes}
                      </p>
                    </div>
                  )}

                  {selectedListing.moderation_notes && (
                    <div className="rounded-xl border p-2" style={{ borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }}>
                      <p className="text-[11px] font-semibold" style={{ color: '#B71C1C' }}>
                        Moderation Notes:
                      </p>
                      <p className="text-[11px]" style={{ color: '#B71C1C' }}>{selectedListing.moderation_notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 space-y-2 border-t pt-3">
                  {selectedListing.status === 'pending' && (
                    <button
                      onClick={() => navigate(`/marketplace/create?edit=${selectedListing.id}`)}
                      className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedListing.id)}
                    disabled={deleting === selectedListing.id}
                    className="w-full rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    style={{ color: '#B71C1C', backgroundColor: '#FFEBEE', border: '1px solid #FFCDD2' }}
                  >
                    <span className="inline-flex items-center gap-1"><Trash2 className="h-4 w-4" /> Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
