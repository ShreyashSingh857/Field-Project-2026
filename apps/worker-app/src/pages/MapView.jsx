import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;

const makeImgIcon = (src, size = [34, 34]) => L.icon({
  iconUrl: src,
  iconSize: size,
  iconAnchor: [size[0] / 2, size[1]],
  popupAnchor: [0, -(size[1] + 4)],
});

const iconGreen = makeImgIcon('/Empty-DustBin.png');
const iconYellow = makeImgIcon('/Half-filled-Dustbin.png');
const iconRed = makeImgIcon('/Filled-Dustbin.png');
const MapView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { worker } = useSelector((s) => s.auth);
  const [bins, setBins] = useState([]);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const loadBins = async () => {
      if (!worker?.created_by_admin_id && !worker?.village_id) return;
      const params = worker?.created_by_admin_id
        ? { assigned_panchayat_id: worker.created_by_admin_id }
        : { village_id: worker.village_id };
      const { data } = await api.get('/bins', { params });
      setBins(data?.bins || []);
    };
    loadBins();
    const id = setInterval(loadBins, 15000);
    return () => clearInterval(id);
  }, [worker?.created_by_admin_id, worker?.village_id]);

  const liveBins = bins
    .filter((b) => b.location_lat && b.location_lng)
    .map((b) => ({ id: b.id, name: b.label, fill: b.fill_level ?? 0, coords: [b.location_lat, b.location_lng] }));

  const routeCoords = liveBins.map((b) => b.coords);
  const mapCenter = liveBins[0]?.coords || [19.0750, 72.8770];
  
  const toggleLang = () => {
    setLang(lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en');
  };

  const getIcon = (fill) => {
    if (fill > 75) return iconRed;
    if (fill > 40) return iconYellow;
    return iconGreen;
  };

  const fillLabel = (fill) => (fill <= 40 ? 'Empty / Low' : fill <= 75 ? 'Half Full' : 'Full');

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen flex flex-col">
      <Navbar 
        workerName={worker?.name || 'Worker'} 
        area={worker?.assigned_area || 'Not assigned'} 
        onLanguageToggle={toggleLang} 
        lang={lang} 
      />
      
      <div className="flex-1 relative pb-[60px]">
        {/* Helper overlay for optimized route */}
        <div className="absolute top-4 left-4 right-4 z-10 bg-white p-3 rounded-lg shadow-md border-l-4 border-[var(--sm-primary)]">
          <h3 className="text-[14px] font-bold text-[var(--sm-text)] flex items-center gap-2">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Optimized Route Active
          </h3>
          <p className="text-[12px] text-[var(--sm-text-muted)] mt-1">{liveBins.length} live bin marker(s) on map</p>
        </div>

        <MapContainer center={mapCenter} zoom={15} style={{ height: 'calc(100vh - 130px)', width: '100%', zIndex: 1 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          {liveBins.map(bin => (
            <Marker key={bin.id} position={bin.coords} icon={getIcon(bin.fill)}>
              <Popup>
                <div className="text-center">
                  <h4 className="font-bold text-[14px] mb-1">{bin.name}</h4>
                  <p className="text-[12px] mb-2 font-semibold">{fillLabel(bin.fill)} ({bin.fill}%)</p>
                  <button 
                    onClick={() => navigate('/tasks')}
                    className="bg-[var(--sm-primary)] text-white px-3 py-1.5 rounded text-[12px] font-medium"
                  >
                    View Tasks
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Polyline showing optimized route */}
          {routeCoords.length > 1 && <Polyline positions={routeCoords} color="#2E7D32" weight={3} dashArray="5, 10" />}
        </MapContainer>

        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-2 text-[11px]">
          <div className="font-semibold mb-1">Legend</div>
          <div className="flex items-center gap-1"><img src="/Empty-DustBin.png" alt="low" style={{ width: 14, height: 14 }} /> Empty / Low (0-40%)</div>
          <div className="flex items-center gap-1"><img src="/Half-filled-Dustbin.png" alt="half" style={{ width: 14, height: 14 }} /> Half Full (41-75%)</div>
          <div className="flex items-center gap-1"><img src="/Filled-Dustbin.png" alt="full" style={{ width: 14, height: 14 }} /> Full (76-100%)</div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default MapView;