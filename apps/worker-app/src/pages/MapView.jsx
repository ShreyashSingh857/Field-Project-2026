import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';

delete L.Icon.Default.prototype._getIconUrl;
const makeImgIcon = (src, size = [34, 34]) => L.icon({ iconUrl: src, iconSize: size, iconAnchor: [size[0] / 2, size[1]], popupAnchor: [0, -(size[1] + 4)] });
const ICONS = { empty: makeImgIcon('/Empty-DustBin.png'), half: makeImgIcon('/Half-filled-Dustbin.png'), full: makeImgIcon('/Filled-Dustbin.png') };
const taskIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:50%;background:#185FA5;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35)"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
const userIcon = L.divIcon({ className: '', html: `<div style="position:relative;width:22px;height:22px"><div style="position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.25);animation:pulse-ring 2s ease-out infinite;"></div><div style="position:absolute;inset:3px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
const binIcon = (v) => (v <= 40 ? ICONS.empty : v <= 75 ? ICONS.half : ICONS.full);
const fillLabel = (v) => (v <= 40 ? 'Empty / Low' : v <= 75 ? 'Half Full' : 'Full');

function ChangeView({ center, triggered }) {
  const map = useMap();
  const centeredOnce = useRef(false);

  useEffect(() => {
    if (!triggered || !center || centeredOnce.current) return;
    map.flyTo(center, 15, { animate: true, duration: 1.2 });
    centeredOnce.current = true;
  }, [triggered, center, map]);
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const { worker } = useSelector((s) => s.auth);
  const [bins, setBins] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [lang, setLang] = useState('en');
  const [userPos, setUserPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [taskLoadError, setTaskLoadError] = useState('');

  const refreshLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeoError('');
        setUserPos([p.coords.latitude, p.coords.longitude]);
        setHasCentered(true);
      },
      () => setGeoError('Live location unavailable'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    refreshLocation();

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setGeoError('');
        setUserPos(pos);
        setHasCentered(true);
      },
      () => setGeoError('Live location unavailable'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const loadBins = async () => {
      if (!worker?.created_by_admin_id && !worker?.village_id) return;
      const params = worker?.created_by_admin_id ? { assigned_panchayat_id: worker.created_by_admin_id } : { village_id: worker.village_id };
      const { data } = await api.get('/bins', { params });
      setBins(data?.bins || []);
    };
    loadBins();
    const id = setInterval(loadBins, 15000);
    return () => clearInterval(id);
  }, [worker?.created_by_admin_id, worker?.village_id]);

  useEffect(() => {
    const loadTasks = async () => {
      if (!worker?.id) return;
      try {
        const { data } = await api.get('/tasks', { params: { worker_id: worker.id } });
        const assigned = (data?.tasks || []).filter((t) =>
          t.assigned_worker_id === worker.id && !['done', 'cancelled'].includes(t.status)
        );
        setTasks(assigned);
        setTaskLoadError('');
      } catch (_e) {
        setTasks([]);
        setTaskLoadError('Unable to load assigned tasks');
      }
    };
    loadTasks();
    const id = setInterval(loadTasks, 15000);
    return () => clearInterval(id);
  }, [worker?.id]);

  const liveBins = useMemo(() => bins.filter((b) => b.location_lat && b.location_lng).map((b) => ({ ...b, coords: [b.location_lat, b.location_lng] })), [bins]);
  const liveTasks = useMemo(
    () =>
      tasks
        .map((t) => {
          const lat = t.location_lat != null ? Number(t.location_lat) : Number(t.bin?.location_lat);
          const lng = t.location_lng != null ? Number(t.location_lng) : Number(t.bin?.location_lng);
          const coords = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
          return { ...t, coords };
        })
        .filter((t) => t.coords),
    [tasks]
  );
  const mapCenter = userPos || liveBins[0]?.coords || [19.075, 72.877];

  useEffect(() => {
    const loadRoadRoute = async () => {
      const points = [userPos, selectedTarget?.coords].filter(Boolean);
      if (points.length < 2) return setRoutePath([]);
      const coordStr = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const urls = [
        `https://router.project-osrm.org/trip/v1/driving/${coordStr}?source=first&roundtrip=false&geometries=geojson&overview=full`,
        `https://router.project-osrm.org/route/v1/driving/${coordStr}?geometries=geojson&overview=full`,
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const data = await res.json();
          const geom = data?.trips?.[0]?.geometry?.coordinates || data?.routes?.[0]?.geometry?.coordinates;
          if (geom?.length) {
            setRoutePath(geom.map(([lng, lat]) => [lat, lng]));
            return;
          }
        } catch (_e) {}
      }
      setRoutePath(points);
    };
    loadRoadRoute();
  }, [userPos, selectedTarget]);

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen flex flex-col">
      <Navbar workerName={worker?.name || 'Worker'} area={worker?.assigned_area || 'Not assigned'} onLanguageToggle={() => setLang(lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en')} lang={lang} />
      <div className="flex-1 relative">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            bottom: 'calc(var(--sm-bottom-nav-height, 64px) + env(safe-area-inset-bottom))',
          }}
        >
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
            <ChangeView center={userPos} triggered={hasCentered} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          {userPos && <Marker position={userPos} icon={userIcon}><Popup>Your Location</Popup></Marker>}
          {liveBins.map((bin) => (
            <Marker key={bin.id} position={bin.coords} icon={binIcon(bin.fill_level ?? 0)}>
              <Popup>
                <div className="text-center">
                  <h4 className="font-bold text-[14px] mb-1">{bin.label}</h4>
                  <p className="text-[12px] mb-2 font-semibold">{fillLabel(bin.fill_level ?? 0)} ({bin.fill_level ?? 0}%)</p>
                  <button onClick={() => setSelectedTarget({ type: 'bin', id: bin.id, label: bin.label, coords: bin.coords })} className="bg-[#185FA5] text-white px-3 py-1.5 rounded text-[12px] font-medium">Show Route</button>
                </div>
              </Popup>
            </Marker>
          ))}
          {liveTasks.map((task) => (
            <Marker key={task.id} position={task.coords} icon={taskIcon}>
              <Popup>
                <div className="text-center">
                  <h4 className="font-bold text-[13px] mb-1">{task.title || 'Assigned Task'}</h4>
                  <p className="text-[12px] mb-2">Status: {task.status}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setSelectedTarget({ type: 'task', id: task.id, label: task.title, coords: task.coords })} className="bg-[#185FA5] text-white px-2 py-1 rounded text-[11px]">Route</button>
                    <button onClick={() => navigate(`/tasks/${task.id}`)} className="bg-[var(--sm-primary)] text-white px-2 py-1 rounded text-[11px]">Open</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {routePath.length > 1 && <Polyline positions={routePath} color="#2E7D32" weight={4} />}
          </MapContainer>
        </div>

        <div className="absolute left-4 z-10 bg-white rounded-lg shadow-md p-2 text-[11px]" style={{ bottom: 'calc(var(--sm-bottom-nav-height, 64px) + env(safe-area-inset-bottom) + 8px)' }}>
          <div className="font-semibold mb-1">Legend</div>
          <div className="flex items-center gap-1"><span style={{ color: '#4285F4' }}>●</span> Your location</div>
          <div className="flex items-center gap-1"><span style={{ color: '#185FA5' }}>●</span> Assigned tasks</div>
          <div className="flex items-center gap-1"><img src="/Empty-DustBin.png" alt="low" style={{ width: 14, height: 14 }} /> Empty / Low (0-40%)</div>
          <div className="flex items-center gap-1"><img src="/Half-filled-Dustbin.png" alt="half" style={{ width: 14, height: 14 }} /> Half Full (41-75%)</div>
          <div className="flex items-center gap-1"><img src="/Filled-Dustbin.png" alt="full" style={{ width: 14, height: 14 }} /> Full (76-100%)</div>
        </div>

        <button
          type="button"
          onClick={refreshLocation}
          className="absolute right-4 z-10 bg-white rounded-lg shadow-md px-3 py-2 text-[11px] font-semibold"
          style={{ bottom: 'calc(var(--sm-bottom-nav-height, 64px) + env(safe-area-inset-bottom) + 8px)' }}
        >
          Recenter
        </button>

        {geoError && (
          <div className="absolute top-2 left-4 right-4 z-10 bg-amber-100 text-amber-800 rounded px-3 py-2 text-[11px]">
            {geoError}
          </div>
        )}

        {taskLoadError && (
          <div className="absolute top-12 left-4 right-4 z-10 bg-red-100 text-red-700 rounded px-3 py-2 text-[11px]">
            {taskLoadError}
          </div>
        )}

        {selectedTarget && (
          <div className="absolute top-2 left-4 z-10 bg-white rounded-lg shadow px-3 py-2 text-[11px]">
            Route to: {selectedTarget.label || selectedTarget.type}
          </div>
        )}
      </div>
      <BottomNav />
      <style>{`@keyframes pulse-ring{0%{transform:scale(.5);opacity:1}100%{transform:scale(2.5);opacity:0}}`}</style>
    </div>
  );
}
