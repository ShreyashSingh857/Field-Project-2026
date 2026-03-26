import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchBins, fetchRecyclingCenters } from '../features/bins/binSlice';
import Loader from '../components/Loader';

/* ─── Leaflet StrictMode Patch ──────────────────────────────── */
// Bypasses React 18's Double-Invoke and reappearLayoutEffects bugs
if (!L.Map.prototype._patchedInitContainer) {
  const _originalInit = L.Map.prototype._initContainer;
  L.Map.prototype._initContainer = function (id) {
    const container = L.DomUtil.get(id);
    if (container && container._leaflet_id) {
      container._leaflet_id = null;
    }
    _originalInit.call(this, id);
  };
  L.Map.prototype._patchedInitContainer = true;
}

/* ─── Custom PNG icons ─────────────────────────────────────── */
const makeImgIcon = (src, size = [40, 40]) =>
  L.icon({ iconUrl: src, iconSize: size, iconAnchor: [size[0] / 2, size[1]], popupAnchor: [0, -(size[1] + 4)] });

const ICONS = {
  empty:     makeImgIcon('/Empty-DustBin.png',    [40, 40]),
  half:      makeImgIcon('/Half-filled-Dustbin.png', [40, 40]),
  full:      makeImgIcon('/Filled-Dustbin.png',   [40, 40]),
  recycling: makeImgIcon('/Recucling-center.png', [40, 40]),
};

const binIcon = (fillLevel) => {
  const v = fillLevel ?? 0;
  if (v <= 40) return ICONS.empty;
  if (v <= 75) return ICONS.half;
  return ICONS.full;
};

/** Pulsing blue dot — exactly like Google Maps "My Location" */
const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:22px;height:22px">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.25);animation:pulse-ring 2s ease-out infinite;"></div>
    <div style="position:absolute;inset:3px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/* ─── ChangeView — zooms to user once geolocation arrives ──── */
function ChangeView({ center, zoom, triggered }) {
  const map = useMap();
  useEffect(() => {
    if (triggered) map.flyTo(center, zoom, { animate: true, duration: 1.2 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggered]);
  return null;
}

/* ─── Fill-level colour helper ─────────────────────────────── */
const fillColor = (v) => (v <= 40 ? '#2E7D32' : v <= 75 ? '#EF9F27' : '#E24B4A');
const fillLabel = (v) => (v <= 40 ? 'Empty / Low' : v <= 75 ? 'Half Full' : 'Full');

/* ─── Main Page ─────────────────────────────────────────────── */
export default function BinsMapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, recyclingCenters, loading } = useSelector((s) => s.bins);
  const user = useSelector((s) => s.auth.user);
  const villageId = user?.user_metadata?.village_id || user?.village_id;

  const [userPos, setUserPos] = useState(null);
  const [center, setCenter] = useState([20.5937, 78.9629]);
  const [zoom, setZoom] = useState(5);
  const [geoTriggered, setGeoTriggered] = useState(false);
  const [layer, setLayer] = useState('all'); // 'all' | 'bins' | 'recycling'

  useEffect(() => {
    dispatch(fetchBins(villageId));
    dispatch(fetchRecyclingCenters(villageId));
  }, [dispatch, villageId]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => {
      const pos = [p.coords.latitude, p.coords.longitude];
      setUserPos(pos);
      setCenter(pos);
      setZoom(15);
      setGeoTriggered(true);
    });
  }, []);

  const mappedBins    = useMemo(() => items.filter((b) => b.location_lat && b.location_lng), [items]);
  const mappedCenters = useMemo(() => recyclingCenters.filter((c) => c.location_lat && c.location_lng), [recyclingCenters]);

  if (loading) return <Loader />;

  const showBins    = layer === 'all' || layer === 'bins';
  const showCenters = layer === 'all' || layer === 'recycling';

  return (
    <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
      <div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>

        {/* ── Header ── */}
        <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={() => navigate(-1)} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}>
              <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-black sm:text-base">{t('binsMap.title')}</p>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>{t('binsMap.subtitle')}</p>
            </div>
          </div>

          {/* Layer toggle chips */}
          <div className="ml-auto flex gap-1.5">
            {[
              { key: 'all',      label: 'All' },
              { key: 'bins',     label: '🗑️ Bins' },
              { key: 'recycling', label: '♻️ Centers' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setLayer(key)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition"
                style={{
                  backgroundColor: layer === key ? 'var(--clay-primary)' : 'var(--clay-card)',
                  color: layer === key ? '#fff' : '#000',
                  boxShadow: 'var(--clay-shadow)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Map ── */}
        <div className="relative h-[calc(100vh-76px)] w-full">
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl>
            <ChangeView center={center} zoom={zoom} triggered={geoTriggered} />
            <TileLayer
              attribution="&copy; <a href='https://openstreetmap.org'>OpenStreetMap</a>"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location pin */}
            {userPos && (
              <Marker position={userPos} icon={userIcon}>
                <Popup><p className="text-sm font-semibold">📍 Your Location</p></Popup>
              </Marker>
            )}

            {/* Smart bins */}
            {showBins && mappedBins.map((b) => (
              <Marker key={b.id} position={[b.location_lat, b.location_lng]} icon={binIcon(b.fill_level)}>
                <Popup>
                  <div className="space-y-2 min-w-[160px]">
                    <p className="text-sm font-bold text-black">{b.label || 'Smart Bin'}</p>
                    <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>
                      Type: <strong>{b.bin_type || 'general'}</strong>
                    </p>
                    <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#E8F5E9' }}>
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width: `${b.fill_level ?? 0}%`, backgroundColor: fillColor(b.fill_level ?? 0) }}
                      />
                    </div>
                    <p className="text-xs font-medium" style={{ color: fillColor(b.fill_level ?? 0) }}>
                      {fillLabel(b.fill_level ?? 0)} — {b.fill_level ?? 0}%
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/bins/${b.id}`)}
                      className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}
                    >
                      {t('binsMap.viewDetails')}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Recycling centers */}
            {showCenters && mappedCenters.map((c) => (
              <Marker key={c.id} position={[c.location_lat, c.location_lng]} icon={ICONS.recycling}>
                <Popup>
                  <div className="space-y-1 min-w-[160px]">
                    <p className="text-sm font-bold text-black">♻️ {c.name}</p>
                    {c.address && <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>{c.address}</p>}
                    {Array.isArray(c.accepts) && c.accepts.length > 0 && (
                      <p className="text-xs"><strong>Accepts:</strong> {c.accepts.join(', ')}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* ── Legend ── */}
          <div
            className="absolute bottom-6 left-4 z-[1000] rounded-2xl p-3 text-xs space-y-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 170 }}
          >
            <p className="font-bold text-black text-sm mb-2">Legend</p>
            {/* User dot */}
            <LegendRow dotColor="#4285F4" label="Your location" isDot />
            {/* Bin icons */}
            <LegendRow icon="/Empty-DustBin.png"    label="Bin — Empty / Low" />
            <LegendRow icon="/Half-filled-Dustbin.png" label="Bin — Half Full" />
            <LegendRow icon="/Filled-Dustbin.png"   label="Bin — Full" />
            <LegendRow icon="/Recucling-center.png" label="Recycling Center" />
          </div>

          {/* Empty state */}
          {mappedBins.length === 0 && mappedCenters.length === 0 && (
            <div className="absolute inset-0 grid place-items-center p-4 pointer-events-none">
              <div className="clay-card max-w-sm p-5 text-center">
                <div className="mx-auto clay-icon mb-3 flex h-10 w-10 items-center justify-center" style={{ backgroundColor: 'var(--clay-bg)', color: 'var(--clay-primary)' }}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-black">{t('binsMap.empty')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--clay-muted)' }}>
                  No bins or recycling centers added yet in your area.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation for user dot */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function LegendRow({ icon, label, dotColor, isDot }) {
  return (
    <div className="flex items-center gap-2">
      {isDot ? (
        <div className="relative flex-shrink-0 w-5 h-5 flex items-center justify-center">
          <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: dotColor, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
        </div>
      ) : (
        <img src={icon} alt={label} className="flex-shrink-0 object-contain" style={{ width: 20, height: 20 }} />
      )}
      <span className="text-black text-[11px]">{label}</span>
    </div>
  );
}
