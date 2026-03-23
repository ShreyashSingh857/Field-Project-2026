import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchBins } from '../features/bins/binSlice';
import Loader from '../components/Loader';

const FALLBACK = [20.5937, 78.9629];
const color = (v) => (v <= 60 ? '#2E7D32' : v <= 80 ? '#EF9F27' : '#E24B4A');
const icon = (v) => L.divIcon({ className: '', html: `<div style="width:28px;height:28px;border-radius:50%;background:${color(v)};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`, iconSize: [28, 28], iconAnchor: [14, 14] });

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function BinsMapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((s) => s.bins);
  const user = useSelector((s) => s.auth.user);
  const villageId = user?.user_metadata?.village_id || user?.village_id;
  const [center, setCenter] = useState(FALLBACK);
  const [zoom, setZoom] = useState(5);

  useEffect(() => { dispatch(fetchBins(villageId)); }, [dispatch, villageId]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => {
      setCenter([p.coords.latitude, p.coords.longitude]);
      setZoom(15);
    });
  }, []);

  const mapped = useMemo(() => items.filter((b) => b.location_lat && b.location_lng), [items]);
  if (loading) return <Loader />;

  return (
    <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
      <div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>
        <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={() => navigate(-1)} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}><img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" /></div>
            <div><p className="text-sm font-bold text-black sm:text-base">{t('binsMap.title')}</p><p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>{t('binsMap.subtitle')}</p></div>
          </div>
        </header>

        <div className="relative h-[calc(100vh-76px)] w-full">
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={center} zoom={zoom} />
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {mapped.map((b) => (
              <Marker key={b.id} position={[b.location_lat, b.location_lng]} icon={icon(b.fill_level || 0)}>
                <Popup>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-black">{b.label || 'Bin'}</p>
                    <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>{t('binsMap.fillLevel')}: {b.fill_level ?? 0}%</p>
                    <button type="button" onClick={() => navigate(`/bins/${b.id}`)} className="rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}>{t('binsMap.viewDetails')}</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {!error && mapped.length === 0 && (
            <div className="absolute inset-0 grid place-items-center p-4 pointer-events-none">
              <div className="clay-card max-w-sm p-5 text-center"><div className="mx-auto clay-icon mb-3 flex h-10 w-10 items-center justify-center" style={{ backgroundColor: 'var(--clay-bg)', color: 'var(--clay-primary)' }}><Trash2 className="h-5 w-5" /></div><p className="text-sm font-semibold text-black">{t('binsMap.empty')}</p></div>
            </div>
          )}

          {error && <div className="absolute left-4 right-4 bottom-4 clay-card p-3 text-xs text-black">{error}</div>}
        </div>
      </div>
    </div>
  );
}
