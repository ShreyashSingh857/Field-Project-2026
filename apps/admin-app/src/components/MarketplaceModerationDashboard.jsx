// apps/admin-app/src/components/MarketplaceModerationDashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  Phone,
  Flag,
  Eye,
} from 'lucide-react';
import api from '../services/axiosInstance';

export default function MarketplaceModerationDashboard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [tabFilter, setTabFilter] = useState('pending'); // pending, flagged, approved
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [tabFilter]);

  async function fetchListings() {
    try {
      setLoading(true);
      const res = await api.get('/marketplace/moderation/queue');
      // Filter based on tab
      let filtered = res.data.listings || [];
      if (tabFilter === 'pending') {
        filtered = filtered.filter(l => l.status === 'pending');
      } else if (tabFilter === 'flagged') {
        filtered = filtered.filter(l => l.status === 'flagged');
      } else if (tabFilter === 'approved') {
        filtered = filtered.filter(l => l.status === 'approved');
      }
      setListings(filtered);
    } catch (err) {
      console.error('Fetch queue error:', err);
      alert('Failed to fetch moderation queue');
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (listingId) => {
    if (!confirm('Approve this listing?')) return;
    try {
      setSubmitting(true);
      await api.post(`/marketplace/${listingId}/approve`, {
        notes: moderationNotes || 'Approved',
      });
      alert('Listing approved and user notified!');
      setListings(prev => prev.filter(l => l.id !== listingId));
      setSelectedListing(null);
      setModerationNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (listingId) => {
    if (!moderationNotes.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    if (!confirm('Reject this listing?')) return;
    try {
      setSubmitting(true);
      await api.post(`/marketplace/${listingId}/reject`, {
        reason: moderationNotes,
      });
      alert('Listing rejected and user notified!');
      setListings(prev => prev.filter(l => l.id !== listingId));
      setSelectedListing(null);
      setModerationNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredListings = listings.filter(l =>
    l.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && listings.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse text-gray-400">Loading moderation queue...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Flag className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Marketplace Moderation</h1>
            </div>
            <div className="text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {filteredListings.length} items
              </span>
            </div>
          </div>

          {/* Tabs and Search */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex gap-2">
              {['pending', 'flagged', 'approved'].map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setTabFilter(tab);
                    setModerationNotes('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                    tabFilter === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tab === 'pending' && `📋 Pending (${listings.filter(l => l.status === 'pending').length})`}
                  {tab === 'flagged' && `🚩 Flagged (${listings.filter(l => l.status === 'flagged').length})`}
                  {tab === 'approved' && `✅ Approved (${listings.filter(l => l.status === 'approved').length})`}
                </button>
              ))}
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search listings..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">All caught up!</p>
            <p className="text-gray-500">No listings to moderate in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listings List */}
            <div className="lg:col-span-2 space-y-4">
              {filteredListings.map(listing => (
                <div
                  key={listing.id}
                  onClick={() => {
                    setSelectedListing(listing);
                    setModerationNotes('');
                  }}
                  className={`bg-white rounded-lg shadow hover:shadow-lg overflow-hidden cursor-pointer transition border-l-4 ${
                    selectedListing?.id === listing.id
                      ? 'border-l-blue-600 ring-2 ring-blue-400'
                      : 'border-l-gray-300'
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    {listing.photo_url && (
                      <img
                        src={listing.photo_url}
                        alt={listing.title}
                        className="w-24 h-24 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg line-clamp-2">{listing.title}</h3>
                        {listing.status === 'pending' && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                            📋 Pending
                          </span>
                        )}
                        {listing.status === 'flagged' && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                            🚩 Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                        {listing.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        <span className="font-bold text-green-600">₹{listing.price}</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" /> {listing.contact_number}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Panel */}
            {selectedListing && (
              <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-24">
                <div className="mb-6">
                  <img
                    src={selectedListing.photo_url}
                    alt={selectedListing.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h2 className="text-2xl font-bold mb-2">{selectedListing.title}</h2>
                  <div className="space-y-3 text-sm text-gray-600 border-t pt-4">
                    <div>
                      <p className="font-semibold text-gray-800">{selectedListing.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-green-600">₹{selectedListing.price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{selectedListing.contact_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(selectedListing.created_at).toLocaleString()}</span>
                    </div>
                    {selectedListing.ai_validation_status && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>
                          AI Validation:{' '}
                          <strong
                            className={
                              selectedListing.ai_validation_status === 'passed'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {selectedListing.ai_validation_status}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Moderation Controls */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Moderation Notes
                  </label>
                  <textarea
                    value={moderationNotes}
                    onChange={e => setModerationNotes(e.target.value)}
                    placeholder={
                      tabFilter === 'pending'
                        ? 'Add notes (required for rejection)...'
                        : 'View only'
                    }
                    readOnly={tabFilter !== 'pending'}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />

                  {tabFilter === 'pending' && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleApprove(selectedListing.id)}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(selectedListing.id)}
                        disabled={submitting || !moderationNotes.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
