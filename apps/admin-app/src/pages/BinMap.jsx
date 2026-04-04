import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON, useMap } from 'react-leaflet';
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

// Auto-fit the map to given bounds whenever they change
function BoundsFitter({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
        }
    }, [bounds, map]);
    return null;
}

// Compute a Leaflet LatLngBounds from an array of GeoJSON features
function computeBounds(features) {
    const pts = [];
    for (const f of features) {
        if (!f?.geometry) continue;
        const pushRing = (ring) => ring.forEach(([lng, lat]) => pts.push([lat, lng]));
        const g = f.geometry;
        if (g.type === 'Polygon') g.coordinates.forEach(pushRing);
        else if (g.type === 'MultiPolygon') g.coordinates.forEach(poly => poly.forEach(pushRing));
    }
    if (!pts.length) return null;
    return L.latLngBounds(pts);
}

function BinMap() {
    const role = useSelector(selectRole);
    const adminId = useSelector(selectAdminId);
    const { toast, showToast } = useToast();

    const [binFilter, setBinFilter] = useState('all');
    const [bins, setBins] = useState([]);
    const [villages, setVillages] = useState([]);
    const [jurisdictionBoundary, setJurisdictionBoundary] = useState(null);
    const [subBoundaries, setSubBoundaries] = useState(null);
    const [showBlocks, setShowBlocks] = useState(true);
    const [showPanchayats, setShowPanchayats] = useState(false);
    const [selectedBlockCode, setSelectedBlockCode] = useState('');
    const [boundsFit, setBoundsFit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [boundaryLoading, setBoundaryLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pendingPoint, setPendingPoint] = useState(null);
    const [newBin, setNewBin] = useState({ label: '', village_id: '', location_address: '' });

    useEffect(() => {
        loadBins();
        loadVillages();
        loadBoundary();
    }, [role, adminId]);

    const loadBoundary = async () => {
        setBoundaryLoading(true);
        let boundaryFeature = null;
        try {
            const { data: boundaryData } = await api.get('/admin/jurisdiction-boundary');
            boundaryFeature = boundaryData?.boundary || null;
            setJurisdictionBoundary(boundaryFeature);
        } catch (_e) {
            setJurisdictionBoundary(null);
        }

        let subFeatureCollection = null;
        if (role === 'zilla_parishad' || role === 'block_samiti') {
            try {
                const { data: subData } = await api.get('/admin/sub-boundaries');
                subFeatureCollection = subData?.features?.length > 0 ? subData : null;
                setSubBoundaries(subFeatureCollection);
            } catch (_e) {
                setSubBoundaries(null);
            }
        } else {
            setSubBoundaries(null);
        }

        const allFeatures = [boundaryFeature, ...((subFeatureCollection && subFeatureCollection.features) || [])].filter(Boolean);
        const bounds = computeBounds(allFeatures);
        if (bounds) setBoundsFit(bounds);
        setBoundaryLoading(false);
    };

    const loadBins = async () => {
        try {
            setLoading(true);
            setError(null);
            const filters = role === 'ward_member' ? { assigned_panchayat_id: adminId } : {};
            const data = await fetchBins(filters);
            const normalized = (data || []).map((bin) => ({
                ...bin,
                fillLevel: Number(bin.fill_level ?? 0),
                location: bin.location_address || 'N/A',
            }));
            setBins(normalized);
        } catch (err) {
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

    // Fallback map center if no boundaries computed yet
    const defaultCenter = (() => {
        if (filteredBins[0]?.location_lat && filteredBins[0]?.location_lng) {
            return [filteredBins[0].location_lat, filteredBins[0].location_lng];
        }
        return [18.51, 74.05]; // Pune area
    })();

    const mapZoom = role === 'ward_member' ? 14
        : role === 'gram_panchayat' ? 13
        : role === 'block_samiti' ? 11
        : role === 'zilla_parishad' ? 9
        : 12;

    const subFeatures = subBoundaries?.features || [];
    const blockFeatures = subFeatures.filter((f) => f?.properties?.level === 'block');
    const panchayatFeatures = subFeatures.filter((f) => f?.properties?.level === 'gp');
    const visiblePanchayats =
        role === 'zilla_parishad' && selectedBlockCode
            ? panchayatFeatures.filter((f) => String(f?.properties?.block_code || '') === String(selectedBlockCode))
            : panchayatFeatures;

    const visibleSubFeatures = [];
    if (showBlocks) visibleSubFeatures.push(...blockFeatures);
    if (showPanchayats || role === 'block_samiti') visibleSubFeatures.push(...visiblePanchayats);

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
                        {filteredBins.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: '24px 0', fontSize: '13px' }}>
                                No bins found
                            </div>
                        )}
                    </div>
                </div>

                {/* Map Area */}
                <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                            Map View
                        </h2>
                        {boundaryLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--admin-muted)' }}>
                                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                Loading boundaries…
                            </div>
                        )}
                        {!boundaryLoading && jurisdictionBoundary && (
                            <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                Boundary loaded
                            </div>
                        )}
                    </div>

                    {jurisdictionBoundary && (
                        <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '12px' }}>
                            {jurisdictionBoundary.properties?.name || 'Jurisdiction'}
                        </div>
                    )}

                    {(role === 'zilla_parishad' || role === 'block_samiti') && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                            {role === 'zilla_parishad' && (
                                <>
                                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input type="checkbox" checked={showBlocks} onChange={(e) => setShowBlocks(e.target.checked)} />
                                        Show blocks
                                    </label>
                                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input type="checkbox" checked={showPanchayats} onChange={(e) => setShowPanchayats(e.target.checked)} />
                                        Show panchayats
                                    </label>
                                    <select
                                        className="admin-form-select"
                                        style={{ width: '260px', padding: '6px 10px', fontSize: '12px' }}
                                        value={selectedBlockCode}
                                        onChange={(e) => {
                                            setSelectedBlockCode(e.target.value);
                                            if (e.target.value) setShowPanchayats(true);
                                        }}
                                    >
                                        <option value="">All blocks</option>
                                        {blockFeatures.map((b) => (
                                            <option key={b.properties?.lgd_code} value={b.properties?.lgd_code}>
                                                {b.properties?.name}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {role === 'block_samiti' && (
                                <div style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                    Panchayat boundaries are shown for your block.
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ border: '1px solid var(--admin-border)', borderRadius: '8px', height: '500px', overflow: 'hidden' }}>
                        <MapContainer center={defaultCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

                            {/* Auto-fit bounds whenever boundaries load */}
                            {boundsFit && <BoundsFitter bounds={boundsFit} />}

                            {/* Own jurisdiction boundary — thick dashed outline */}
                            {jurisdictionBoundary && (
                                <GeoJSON
                                    key={`own-${jurisdictionBoundary.properties?.lgd_code || 'boundary'}`}
                                    data={jurisdictionBoundary}
                                    style={{
                                        color: '#1565C0',
                                        weight: 3,
                                        fillColor: '#1565C0',
                                        fillOpacity: 0.04,
                                        dashArray: '8 5',
                                    }}
                                />
                            )}

                            {visibleSubFeatures.map((feat, idx) => (
                                <GeoJSON
                                    key={`sub-${feat.properties?.lgd_code || idx}`}
                                    data={feat}
                                    style={{
                                        color: feat.properties?.level === 'block' ? '#E65100' : '#2E7D32',
                                        weight: feat.properties?.level === 'block' ? 1.4 : 0.8,
                                        fillColor: feat.properties?.level === 'block' ? '#E65100' : '#2E7D32',
                                        fillOpacity: feat.properties?.level === 'block' ? 0.04 : 0.02,
                                        dashArray: feat.properties?.level === 'block' ? '3 3' : '2 4',
                                    }}
                                />
                            ))}

                            <MapClickHandler enabled={role === 'ward_member'} onPick={setPendingPoint} />

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

                    {role === 'ward_member' && pendingPoint && (
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
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--admin-border)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Bin Status</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                {[
                                    { status: 'empty', label: 'Empty' },
                                    { status: 'low', label: 'Low' },
                                    { status: 'medium', label: 'Medium' },
                                    { status: 'high', label: 'High' },
                                    { status: 'overflow', label: 'Overflow' },
                                ].map((item) => (
                                    <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
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
                        {jurisdictionBoundary && (
                            <div style={{
                                marginTop: '12px',
                                paddingTop: '8px',
                                borderTop: '1px solid var(--admin-border)',
                                fontSize: '11px',
                            }}>
                                <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                                    Boundaries (Source: lgdirectory.nic.in)
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <div style={{ width: '20px', height: '2px', background: '#1565C0',
                                        borderTop: '2px dashed #1565C0' }} />
                                    <span>Your jurisdiction</span>
                                </div>
                                {visibleSubFeatures.length > 0 && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <div style={{ width: '20px', height: '2px', background: '#E65100', borderTop: '1px dashed #E65100' }} />
                                            <span>Blocks</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '20px', height: '2px', background: '#2E7D32', borderTop: '1px dashed #2E7D32' }} />
                                            <span>Panchayats</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
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
