import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;

const createCustomIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const iconRed = createCustomIcon('#E24B4A');
const iconYellow = createCustomIcon('#EF9F27');
const iconGreen = createCustomIcon('#639922');
const iconWorker = new L.DivIcon({
  className: 'worker-icon',
  html: `<div style="background-color: #2E7D32; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.8);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Mock mapping data
const mockBins = [
  { id: 't1', name: 'Main Square Bin', fill: 95, coords: [19.0760, 72.8777], status: 'pending' },
  { id: 't2', name: 'Market Line 2', fill: 80, coords: [19.0780, 72.8790], status: 'pending' },
  { id: 't3', name: 'School Road Bin', fill: 55, coords: [19.0740, 72.8760], status: 'in_progress' },
  { id: 't4', name: 'River Side Bin', fill: 10, coords: [19.0720, 72.8780], status: 'completed' },
];

const workerCoords = [19.0750, 72.8750];

// Basic route optimization (mocked sequentially)
const routeCoords = [workerCoords, ...mockBins.filter(b => b.status !== 'completed').map(b => b.coords)];

const MapView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');
  
  const toggleLang = () => {
    setLang(lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en');
  };

  const getIcon = (fill) => {
    if (fill >= 80) return iconRed;
    if (fill >= 50) return iconYellow;
    return iconGreen;
  };

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen flex flex-col">
      <Navbar 
        workerName="Ramesh Kumar" 
        area="South Village Sector" 
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
          <p className="text-[12px] text-[var(--sm-text-muted)] mt-1">Suggested path: Market &rarr; Square &rarr; School</p>
        </div>

        <MapContainer center={[19.0750, 72.8770]} zoom={15} style={{ height: 'calc(100vh - 130px)', width: '100%', zIndex: 1 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          {/* Heatmap mock layers for High-Density Waste Areas */}
          <Circle center={[19.0760, 72.8780]} pathOptions={{ fillColor: 'red', color: 'transparent', fillOpacity: 0.2 }} radius={250} />
          <Circle center={[19.0775, 72.8795]} pathOptions={{ fillColor: 'orange', color: 'transparent', fillOpacity: 0.2 }} radius={150} />

          <Marker position={workerCoords} icon={iconWorker}>
            <Popup>You are here</Popup>
          </Marker>

          {mockBins.map(bin => (
            <Marker key={bin.id} position={bin.coords} icon={getIcon(bin.fill)}>
              <Popup>
                <div className="text-center">
                  <h4 className="font-bold text-[14px] mb-1">{bin.name}</h4>
                  <p className="text-[12px] mb-2 font-semibold">Fill Level: {bin.fill}%</p>
                  <button 
                    onClick={() => navigate(`/tasks/${bin.id}`)}
                    className="bg-[var(--sm-primary)] text-white px-3 py-1.5 rounded text-[12px] font-medium"
                  >
                    View Task
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Polyline showing optimized route */}
          <Polyline positions={routeCoords} color="#2E7D32" weight={4} dashArray="5, 10" />
        </MapContainer>
      </div>

      <BottomNav />
    </div>
  );
};

export default MapView;