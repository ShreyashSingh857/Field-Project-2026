// apps/user-app/src/pages/MarketplaceBrowse.jsx
import React, { useEffect, useState } from 'react';
import { Search, MapPin, Phone, Clock } from 'lucide-react';
import api from '../services/axiosInstance';

export default function MarketplaceBrowse() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/marketplace?${params.toString()}`);
      setListings(res.data.listings || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-4">Marketplace</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No listings found</p>
            <a href="/marketplace/create" className="text-blue-600 hover:underline">
              Create first listing →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="bg-white rounded-lg shadow hover:shadow-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedListing(listing)}
              >
                {listing.photo_url && (
                  <img src={listing.photo_url} alt={listing.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg line-clamp-2">{listing.title}</h3>
                  <p className="text-2xl font-bold text-green-600 mt-2">₹{listing.price}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{listing.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {new Date(listing.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            {selectedListing.photo_url && (
              <img src={selectedListing.photo_url} alt={selectedListing.title} className="w-full max-h-96 object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-3xl font-bold">{selectedListing.title}</h2>
              <p className="text-gray-600 mt-2">{selectedListing.description}</p>
              <p className="text-3xl font-bold text-green-600 mt-4">₹{selectedListing.price}</p>

              <div className="mt-6 space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-200 rounded-full inline-flex items-center justify-center">👤</span>
                  <div>
                    <p className="font-semibold">{selectedListing.users?.name}</p>
                    <p className="text-sm text-gray-500">{selectedListing.users?.phone}</p>
                  </div>
                </div>
                {selectedListing.villages && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <span>{selectedListing.villages.name}, {selectedListing.villages.district}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span>{new Date(selectedListing.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedListing(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <a
                  href={`tel:${selectedListing.contact_number}`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Contact Seller
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
