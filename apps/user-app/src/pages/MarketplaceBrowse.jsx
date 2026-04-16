import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, List, MapPin, Phone, Plus, Search } from 'lucide-react';
import api from '../services/axiosInstance';

export default function MarketplaceBrowse() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      const { data } = await api.get(`/marketplace?${params.toString()}`);
      setListings(data.listings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
      <div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>
        <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={() => navigate('/dashboard')} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}>
              <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-black sm:text-base">Marketplace</p>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>Buy and sell waste materials</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 pb-24 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8">
          <section className="clay-card p-3 sm:p-4">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => navigate('/my-listings')} className="clay-nav-item flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-black">
                <List className="h-4 w-4" /> My Listings
              </button>
              <button type="button" onClick={() => navigate('/marketplace/create')} className="clay-nav-item flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-black" style={{ backgroundColor: 'var(--clay-card-alt)' }}>
                <Plus className="h-4 w-4" /> Sell Item
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchListings();
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--clay-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search listings"
                className="w-full rounded-xl py-2 pl-9 pr-3 text-sm text-black outline-none"
                style={{ backgroundColor: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: 'var(--clay-shadow)' }}
              />
            </form>
          </section>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="clay-card h-44 animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="clay-card p-4" style={{ borderColor: '#FFCDD2' }}>
              <p className="text-sm font-semibold" style={{ color: '#B71C1C' }}>{error}</p>
              <button type="button" onClick={fetchListings} className="mt-3 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: 'var(--clay-primary)' }}>Retry</button>
            </div>
          ) : listings.length === 0 ? (
            <div className="clay-card p-6 text-center">
              <p className="text-sm font-semibold text-black">No listings found</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--clay-muted)' }}>Try another search or create a listing.</p>
            </div>
          ) : (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <button key={listing.id} type="button" onClick={() => setSelectedListing(listing)} className="clay-card overflow-hidden text-left">
                  {listing.photo_url ? <img src={listing.photo_url} alt={listing.title} className="h-32 w-full object-cover" /> : null}
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-black sm:text-base">{listing.title}</h3>
                    <p className="mt-1 text-base font-bold text-black">₹{listing.price}</p>
                    <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--clay-muted)' }}>{listing.description || 'No description'}</p>
                    <div className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: 'var(--clay-muted)' }}>
                      <Clock className="h-3.5 w-3.5" /> {new Date(listing.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </section>
          )}
        </main>

        {selectedListing ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
            <div className="clay-card w-full max-w-xl overflow-hidden">
              {selectedListing.photo_url ? <img src={selectedListing.photo_url} alt={selectedListing.title} className="max-h-72 w-full object-cover" /> : null}
              <div className="p-4">
                <h2 className="text-lg font-bold text-black">{selectedListing.title}</h2>
                <p className="mt-1 text-sm font-semibold text-black">₹{selectedListing.price}</p>
                <p className="mt-2 text-xs leading-5" style={{ color: 'var(--clay-muted)' }}>{selectedListing.description || 'No description'}</p>
                <div className="mt-3 space-y-1 text-xs" style={{ color: 'var(--clay-muted)' }}>
                  <p className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedListing.villages?.name || 'Unknown village'}</p>
                  <p className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(selectedListing.created_at).toLocaleString()}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setSelectedListing(null)} className="clay-nav-item flex-1 rounded-xl px-3 py-2 text-sm font-medium text-black">Close</button>
                  <a href={`tel:${selectedListing.contact_number}`} className="flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}>
                    <Phone className="h-4 w-4" /> Call
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
