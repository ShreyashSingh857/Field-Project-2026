// apps/admin-app/src/components/MarketplaceModerationDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, XCircle, Flag, Ban, MessageSquare } from 'lucide-react';
import api from '../services/axiosInstance';

export default function MarketplaceModerationDashboard() {
  const [pendingListings, setpendingListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [actingOnListing, setActingOnListing] = useState(null);

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  async function fetchPendingQueue() {
    try {
      setLoading(true);
      const res = await api.get('/marketplace/moderation/queue');
      setpendingListings(res.data.listings || []);
    } catch (err) {
      console.error('Fetch queue error:', err);
      alert('Failed to fetch moderation queue');
    } finally {
      setLoading(false);
    }
  }

  async function handleModeration(listingId, actionType, reason) {
    try {
      setActingOnListing(listingId);
      if (actionType === 'approve') {
        await api.post(`/marketplace/${listingId}/approve`, { notes: reason });
      } else if (actionType === 'reject') {
        await api.post(`/marketplace/${listingId}/reject`, { reason });
      }
      setpendingListings(prev => prev.filter(l => l.id !== listingId));
      setSelectedListing(null);
      setNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setActingOnListing(null);
    }
  }

  if (loading) return <div className="p-6 text-center">Loading moderation queue...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-blue-600" />
        <h1 className="text-3xl font-bold">Marketplace Moderation</h1>
        <span className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded-full">
          {pendingListings.length} Pending
        </span>
      </div>

      {pendingListings.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
          <p className="text-green-800">All caught up! No pending listings.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingListings.map(listing => (
            <div
              key={listing.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md cursor-pointer"
              onClick={() => setSelectedListing(listing)}
            >
              <div className="flex gap-4">
                {listing.photo_url && (
                  <img
                    src={listing.photo_url}
                    alt={listing.title}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{listing.title}</h3>
                  <p className="text-gray-600 text-sm">{listing.description}</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="font-semibold">₹{listing.price}</span>
                    <span className="text-gray-500">
                      👤 {listing.users?.name || 'Unknown'}
                    </span>
                    <span className="text-gray-500">
                      📍 {listing.villages?.name || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">{selectedListing.title}</h2>
              <p className="text-gray-600 mt-1">{selectedListing.description}</p>
            </div>

            {selectedListing.photo_url && (
              <img
                src={selectedListing.photo_url}
                alt={selectedListing.title}
                className="w-full max-h-72 object-cover"
              />
            )}

            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Price</label>
                <p className="text-xl font-bold">₹{selectedListing.price}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Seller</label>
                <p className="text-lg">{selectedListing.users?.name}</p>
                <p className="text-sm text-gray-500">{selectedListing.users?.phone}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Village</label>
                <p>{selectedListing.villages?.name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Posted</label>
                <p>{new Date(selectedListing.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-6 border-t">
              <label className="text-sm font-semibold text-gray-600">Moderation Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Approve: brief reason optional. Reject: reason required (e.g., published photos, poor quality)"
                className="w-full border rounded p-3 mt-2 text-sm"
                rows={3}
              />
            </div>

            <div className="p-6 bg-gray-50 flex gap-3 border-t">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleModeration(selectedListing.id, 'reject', notes)}
                disabled={actingOnListing === selectedListing.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={() => handleModeration(selectedListing.id, 'approve', notes)}
                disabled={actingOnListing === selectedListing.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
