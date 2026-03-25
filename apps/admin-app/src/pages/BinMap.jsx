import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader } from 'lucide-react';
import { selectRole } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';
import { FILL_STATUS_COLOR } from '../utils/constants';

function BinMap() {
    const dispatch = useDispatch();
    const role = useSelector(selectRole);
    const { toast, showToast } = useToast();

    const [binFilter, setBinFilter] = useState('all');
    const [bins, setBins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBins();
    }, [role]);

    const fetchBins = async () => {
        try {
            setLoading(true);
            setError(null);

            // Mock data
            setBins([
                {
                    id: 1,
                    label: 'Bin-001',
                    location: 'Market Square',
                    fillLevel: 85,
                    status: 'high',
                    lastUpdated: '5 min ago',
                },
                {
                    id: 2,
                    label: 'Bin-002',
                    location: 'Ward 3',
                    fillLevel: 100,
                    status: 'overflow',
                    lastUpdated: '2 min ago',
                },
                {
                    id: 3,
                    label: 'Bin-003',
                    location: 'Park Area',
                    fillLevel: 45,
                    status: 'medium',
                    lastUpdated: '10 min ago',
                },
                {
                    id: 4,
                    label: 'Bin-004',
                    location: 'Residential Area',
                    fillLevel: 20,
                    status: 'low',
                    lastUpdated: '15 min ago',
                },
                {
                    id: 5,
                    label: 'Bin-005',
                    location: 'Main Street',
                    fillLevel: 0,
                    status: 'empty',
                    lastUpdated: '30 min ago',
                },
            ]);

            showToast('Bins loaded successfully', 'success');
        } catch (err) {
            setError(err.message || 'Failed to fetch bins');
            showToast('Failed to load bins', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        return FILL_STATUS_COLOR[status] || '#CCCCCC';
    };

    const getStatusLabel = (status) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const filteredBins =
        binFilter === 'all'
            ? bins
            : bins.filter((bin) => bin.status === binFilter);

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
                                    border: `1px solid ${getStatusColor(bin.status)}30`,
                                    borderRadius: '8px',
                                    backgroundColor: `${getStatusColor(bin.status)}10`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${getStatusColor(
                                        bin.status
                                    )}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = `${getStatusColor(
                                        bin.status
                                    )}10`;
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
                                            backgroundColor: getStatusColor(bin.status),
                                            color: '#fff',
                                            fontSize: '10px',
                                        }}
                                    >
                                        {getStatusLabel(bin.status)}
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
                                            backgroundColor: getStatusColor(bin.status),
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
                    <div
                        style={{
                            backgroundColor: '#F0F0F0',
                            borderRadius: '8px',
                            height: '500px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <div style={{ fontSize: '48px' }}>🗺️</div>
                        <div style={{ textAlign: 'center', color: 'var(--admin-muted)' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                                Map Integration
                            </div>
                            <div style={{ fontSize: '12px' }}>
                                Leaflet map with OpenStreetMap would render here
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                {filteredBins.length} bin(s) visible
                            </div>
                        </div>
                    </div>

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
                                    <div
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '2px',
                                            backgroundColor: getStatusColor(item.status),
                                        }}
                                    ></div>
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
                                    <td>{bin.location}</td>
                                    <td>
                                        <div style={{ width: '60px', height: '6px', backgroundColor: '#E0E0E0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${bin.fillLevel}%`,
                                                    backgroundColor: getStatusColor(bin.status),
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
                                                backgroundColor: getStatusColor(bin.status),
                                                color: '#fff',
                                            }}
                                        >
                                            {getStatusLabel(bin.status)}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--admin-muted)' }}>
                                        Today 10:30 AM
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
