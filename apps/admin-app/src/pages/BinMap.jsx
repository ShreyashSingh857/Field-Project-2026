import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { selectRole, selectAdminId } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { fetchBins, createBin } from '../features/bins/binAPI';
import api from '../services/axiosInstance';

const colorByFill = (fill) => {
    if (fill <= 40) return '#2E7D32';
    if (fill <= 75) return '#EF9F27';
    return '#E24B4A';
};

const statusByFill = (fill) => {
    if (fill <= 20) return 'empty';
    if (fill <= 40) return 'low';
    if (fill <= 75) return 'medium';
    if (fill <= 90) return 'high';
    return 'overflow';
};

const makeImgIcon = (src, size = [34, 34]) =>
    L.icon({
        iconUrl: src,
        iconSize: size,
        iconAnchor: [size[0] / 2, size[1]],
        popupAnchor: [0, -(size[1] + 4)],
    });

const markerIcon = (fill) => {
    if (fill <= 40) return makeImgIcon('/Empty-DustBin.png');
    if (fill <= 75) return makeImgIcon('/Half-filled-Dustbin.png');
    return makeImgIcon('/Filled-Dustbin.png');
};

function MapClickHandler({ enabled, onPick }) {
    useMapEvents({
        click(e) {
            if (enabled) onPick(e.latlng);
        },
    });
    return null;
}

function BinMap() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [binFilter, setBinFilter] = useState('all');
    const [bins, setBins] = useState([]);
    const [villages, setVillages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingPoint, setPendingPoint] = useState(null);
    const [newBin, setNewBin] = useState({ label: '', village_id: '', location_address: '' });

    useEffect(() => {
        loadBins();
        loadVillages();
    }, [role, adminId]);

    const loadBins = async () => {
        try {
            setLoading(true);
            setError(null);

            // For panchayat_admin role, filter by their own admin ID as panchayat_id
            // For other roles, fetch all bins they can see
            const filters = role === 'panchayat_admin' ? { assigned_panchayat_id: adminId } : {};
            const data = await fetchBins(filters);
            const normalized = (data || []).map((bin) => ({
                ...bin,
                fillLevel: Number(bin.fill_level ?? 0),
                location: bin.location_address || 'N/A',
            }));
            setBins(normalized);
        } catch (err) {
            console.error('Error loading bins:', err);
            setError(err.message || 'Failed to fetch bins');
            showToast('Failed to load bins', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadVillages = async () => {
        try {
            const { data } = await api.get('/admin/villages');
            setVillages(data?.villages || []);
        } catch (_e) {
            setVillages([]);
        }
    };

    const handleCreateBin = async () => {
        if (!pendingPoint || !newBin.label) {
            showToast('Select a point and enter bin label', 'error');
            return;
        }
        try {
            await createBin({
                label: newBin.label,
                location_lat: pendingPoint.lat,
                location_lng: pendingPoint.lng,
                location_address: newBin.location_address || null,
                village_id: newBin.village_id || null,
                assigned_panchayat_id: adminId,
                fill_level: 0,
            });
            setPendingPoint(null);
            setNewBin({ label: '', village_id: '', location_address: '' });
            await loadBins();
            showToast('Dustbin created successfully', 'success');
        } catch (err) {
            showToast('Failed to create dustbin: ' + err.message, 'error');
        }
    };

    const getStatusLabel = (fill) => (fill <= 40 ? 'Empty / Low' : fill <= 75 ? 'Half Full' : 'Full');

    const filteredBins = binFilter === 'all' ? bins : bins.filter((bin) => statusByFill(bin.fillLevel) === binFilter);

    const mapCenter = filteredBins[0]?.location_lat && filteredBins[0]?.location_lng
        ? [filteredBins[0].location_lat, filteredBins[0].location_lng]
        : [19.075, 72.877];

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-muted)' }}>
                <Loader size={32} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <p>Loading bins...</p>
            </div>
        );
    }

    return (
        <div>
            <Toast toast={toast} />
            <h1 className="admin-page-title">Bin Map</h1>

            {error && (
                <div className="admin-alert danger" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
                {/* Sidebar - Bin List */}
                <div className="admin-panel">
                    <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                        Bins Inventory
                    </h2>

                    {/* Filter */}
                    <div style={{ marginBottom: '16px' }}>
                        <div className="admin-form-label">Filter by Status</div>
                        <select
                            value={binFilter}
                            onChange={(e) => setBinFilter(e.target.value)}
                            className="admin-form-select"
                        >
                            <option value="all">All Bins</option>
                            <option value="empty">Empty</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="overflow">Overflow</option>
                        </select>
                    </div>

                    {/* Bins List */}
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {filteredBins.map((bin) => (
                            <div
                                key={bin.id}
                                style={{
                                    padding: '12px',
                                    marginBottom: '8px',
                                    border: `1px solid ${colorByFill(bin.fillLevel)}30`,
                                    borderRadius: '8px',
                                    backgroundColor: `${colorByFill(bin.fillLevel)}10`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${colorByFill(bin.fillLevel)}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = `${colorByFill(bin.fillLevel)}10`;
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px',
                                    }}
                                >
                                    <strong style={{ fontSize: '13px' }}>{bin.label}</strong>
                                    <span
                                        className="admin-badge"
                                        style={{
                                            backgroundColor: colorByFill(bin.fillLevel),
                                            color: '#fff',
                                            fontSize: '10px',
                                        }}
                                    >
                                        {getStatusLabel(bin.fillLevel)}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '6px' }}>
                                    {bin.location}
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: '#E0E0E0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${bin.fillLevel}%`,
                                            backgroundColor: colorByFill(bin.fillLevel),
                                            transition: 'width 0.3s ease',
                                        }}
                                    ></div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--admin-muted)', marginTop: '4px' }}>
                                    Fill Level: {bin.fillLevel}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                <div className="admin-panel">
                    <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                        Map View
                    </h2>
                    <div style={{ border: '1px solid var(--admin-border)', borderRadius: '8px', height: '500px', overflow: 'hidden' }}>
                        <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                            <MapClickHandler enabled={role === 'panchayat_admin'} onPick={setPendingPoint} />
                            {filteredBins.map((bin) => (
                                <Marker key={bin.id} position={[bin.location_lat, bin.location_lng]} icon={markerIcon(bin.fillLevel)}>
                                    <Popup>
                                        <div><strong>{bin.label}</strong><br />{getStatusLabel(bin.fillLevel)} ({bin.fillLevel}%)</div>
                                    </Popup>
                                </Marker>
                            ))}
                            {pendingPoint && <Marker position={[pendingPoint.lat, pendingPoint.lng]} icon={makeImgIcon('/Half-filled-Dustbin.png')} />}
                        </MapContainer>
                    </div>

                    {role === 'panchayat_admin' && pendingPoint && (
                        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                            <input className="admin-form-input" placeholder="Bin label" value={newBin.label} onChange={(e) => setNewBin({ ...newBin, label: e.target.value })} />
                            <input className="admin-form-input" placeholder="Address" value={newBin.location_address} onChange={(e) => setNewBin({ ...newBin, location_address: e.target.value })} />
                            <select className="admin-form-select" value={newBin.village_id} onChange={(e) => setNewBin({ ...newBin, village_id: e.target.value })}>
                                <option value="">Select village (optional)</option>
                                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <button className="admin-btn-primary" onClick={handleCreateBin}>Create Dustbin Here</button>
                        </div>
                    )}

                    {/* Legend */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--admin-border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                            Legend
                        </div>
                        <div display="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                                { status: 'empty', label: 'Empty' },
                                { status: 'low', label: 'Low' },
                                { status: 'medium', label: 'Medium' },
                                { status: 'high', label: 'High' },
                                { status: 'overflow', label: 'Overflow' },
                            ].map((item) => (
                                <div
                                    key={item.status}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
                                >
                                    <img
                                        src={item.status === 'empty' || item.status === 'low' ? '/Empty-DustBin.png' : item.status === 'medium' ? '/Half-filled-Dustbin.png' : '/Filled-Dustbin.png'}
                                        alt={item.label}
                                        style={{ width: '14px', height: '14px' }}
                                    />
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bins by Area Table */}
            <div className="admin-panel">
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                    Bins by Area
                </h2>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Bin ID</th>
                                <th>Location</th>
                                <th>Fill Level</th>
                                <th>Status</th>
                                <th>Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bins.map((bin) => (
                                <tr key={bin.id}>
                                    <td><strong>{bin.label}</strong></td>
                                    <td>
                                        {bin.location_lat && bin.location_lng
                                            ? `${bin.location_lat.toFixed(4)}, ${bin.location_lng.toFixed(4)}`
                                            : 'Location TBD'}
                                    </td>
                                    <td>
                                        <div style={{ width: '60px', height: '6px', backgroundColor: '#E0E0E0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${bin.fillLevel}%`,
                                                    backgroundColor: colorByFill(bin.fillLevel),
                                                }}
                                            ></div>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-muted)', marginTop: '2px' }}>
                                            {bin.fillLevel}%
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className="admin-badge"
                                            style={{
                                                backgroundColor: colorByFill(bin.fillLevel),
                                                color: '#fff',
                                            }}
                                        >
                                            {getStatusLabel(bin.fillLevel)}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        {bin.updated_at
                                            ? new Date(bin.updated_at).toLocaleString('en-IN')
                                            : 'Unknown'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default BinMap;
