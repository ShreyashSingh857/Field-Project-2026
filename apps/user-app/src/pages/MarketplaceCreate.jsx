// apps/user-app/src/pages/MarketplaceCreate.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/axiosInstance';

export default function MarketplaceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    contact_number: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [aiValidating, setAiValidating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // If editing, load the listing
    if (editId) {
      loadListing(editId);
    }
  }, [editId]);

  async function loadListing(id) {
    try {
      const res = await api.get(`/marketplace?mine=true`);
      const listing = res.data.listings?.find(l => l.id === id);
      if (listing) {
        setFormData({
          title: listing.title,
          description: listing.description || '',
          price: listing.price.toString(),
          contact_number: listing.contact_number,
        });
        if (listing.photo_url) {
          setPhotoPreview(listing.photo_url);
        }
      }
    } catch (err) {
      console.error('Load error:', err);
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAiValidating(false);

    if (!formData.title || !formData.price || !formData.contact_number) {
      setError('Title, price, and contact number are required');
      return;
    }

    if (!photo && !photoPreview) {
      setError('Photo is required');
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setAiValidating(true);
      
      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('price', formData.price);
      form.append('contact_number', formData.contact_number);
      if (photo) {
        form.append('photo', photo);
      }

      if (editId) {
        await api.patch(`/marketplace/${editId}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccessMessage('Listing updated successfully.');
      } else {
        await api.post('/marketplace', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccessMessage('Listing created successfully.');
      }

      setSuccess(true);
      setTimeout(() => navigate('/my-listings'), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create listing';
      setError(errorMsg);
      setAiValidating(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="clay-card p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-black">Done</h2>
          <p className="mt-2 text-sm text-black">{successMessage}</p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p>✅ Photo verification completed</p>
            <p>⏳ Awaiting moderator review</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>
            Check your notifications for updates. Redirecting to your listings...
          </p>
        </div>
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
              <p className="text-sm font-bold text-black sm:text-base">{editId ? 'Edit Listing' : 'Create Listing'}</p>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>AI verifies uploaded item images</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-24 sm:px-5 sm:py-5">
          <section className="clay-card p-4 sm:p-5">

        {error && (
          <div className="mb-4 rounded-xl border p-3" style={{ borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' }}>
            <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" style={{ color: '#B71C1C' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#B71C1C' }}>Error</p>
              <p className="text-xs" style={{ color: '#B71C1C' }}>{error}</p>
            </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Photo <span className="text-red-500">*</span>
              <span className="text-xs font-normal ml-2" style={{ color: 'var(--clay-muted)' }}>
                (AI will verify authenticity)
              </span>
            </label>
            <div
              className="rounded-xl border-2 border-dashed p-6 text-center"
              style={{ borderColor: 'rgba(255,255,255,0.55)', backgroundColor: '#fff' }}
              onClick={() => document.getElementById('photoInput')?.click()}
            >
              {photoPreview ? (
                <div>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mx-auto max-h-48 max-w-full rounded-xl"
                  />
                  <p className="mt-2 text-xs" style={{ color: 'var(--clay-muted)' }}>Click to change photo</p>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto mb-2 h-10 w-10" style={{ color: 'var(--clay-primary)' }} />
                  <p className="text-sm font-semibold text-black">Click to upload photo</p>
                  <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>Max 5MB, image only</p>
                </div>
              )}
              <input
                id="photoInput"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Aluminum Cans Bundle (10 kg)"
              className="w-full rounded-xl px-3 py-2 text-sm text-black outline-none"
              style={{ backgroundColor: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: 'var(--clay-shadow)' }}
              maxLength="100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe condition, quantity, material details..."
              rows={4}
              className="w-full rounded-xl px-3 py-2 text-sm text-black outline-none"
              style={{ backgroundColor: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: 'var(--clay-shadow)' }}
              maxLength="500"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--clay-muted)' }}>
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Price */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-black">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl py-2 pl-7 pr-3 text-sm text-black outline-none"
                style={{ backgroundColor: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: 'var(--clay-shadow)' }}
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              placeholder="10-digit mobile number"
              maxLength="10"
              className="w-full rounded-xl px-3 py-2 text-sm text-black outline-none"
              style={{ backgroundColor: '#fff', border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: 'var(--clay-shadow)' }}
            />
          </div>

          {/* Info Box */}
          <div className="rounded-xl border p-3" style={{ borderColor: '#C8E6C9', backgroundColor: '#F1F8E9' }}>
            <p className="text-xs" style={{ color: 'var(--clay-primary)' }}>
              <strong>AI Verification:</strong> Your photo will be checked by our AI 
              to ensure it shows authentic waste materials.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="clay-nav-item flex-1 rounded-xl px-3 py-2 text-sm font-medium text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {aiValidating ? 'Verifying...' : 'Creating...'}
                </>
              ) : (
                editId ? 'Update Listing' : 'Create Listing'
              )}
            </button>
          </div>
        </form>
          </section>
        </main>
      </div>
    </div>
  );
}
