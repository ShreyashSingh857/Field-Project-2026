// apps/user-app/src/pages/MyListings.jsx
import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';

export default function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyListings();
  }, []);

  async function fetchMyListings() {
    try {
      const res = await api.get('/marketplace?mine=true');
      setListings(res.data.listings || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status, aiStatus) => {
    const baseClasses = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold';
    if (aiStatus === 'pending') {
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}><Clock className="w-3 h-3" /> AI Validating</span>;
    }
    if (aiStatus === 'failed') {
      return <span className={`${baseClasses} bg-red-100 text-red-800`}><XCircle className="w-3 h-3" /> AI Rejected</span>;
    }
    if (status === 'pending') {
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}><Clock className="w-3 h-3" /> Pending Approval</span>;
    }
    if (status === 'approved') {
      return <span className={`${baseClasses} bg-green-100 text-green-800`}><CheckCircle className="w-3 h-3" /> Approved</span>;
    }
    if (status === 'rejected') {
      return <span className={`${baseClasses} bg-red-100 text-red-800`}><XCircle className="w-3 h-3" /> Rejected</span>;
    }
    return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await api.delete(`/marketplace/${id}`);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Listings</h1>
          <button
            onClick={() => navigate('/marketplace/create')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create New
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">You haven't created any listings yet.</p>
            <button
              onClick={() => navigate('/marketplace/create')}
              className="text-blue-600 hover:underline font-semibold"
            >
              Create your first listing →
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map(listing => (
              <div key={listing.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                <div className="flex gap-4">
                  {listing.photo_url && (
                    <img
                      src={listing.photo_url}
                      alt={listing.title}
                      className="w-32 h-32 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{listing.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{listing.description}</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">₹{listing.price}</p>
                      </div>
                      {getStatusBadge(listing.status, listing.ai_validation_status)}
                    </div>

                    {listing.ai_validation_status === 'failed' && listing.ai_validation_notes && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-700">
                          <strong>AI Validation Failed:</strong> {listing.ai_validation_notes}
                        </p>
                      </div>
                    )}

                    {listing.status === 'rejected' && listing.moderation_notes && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-700">
                          <strong>Rejection Reason:</strong> {listing.moderation_notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2 text-xs text-gray-500">
                      <span>Posted: {new Date(listing.created_at).toLocaleDateString()}</span>
                      {listing.expires_at && (
                        <span>
                          • Expires: {new Date(listing.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {listing.status === 'pending' && (
                      <button
                        onClick={() => navigate(`/marketplace/edit/${listing.id}`)}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
