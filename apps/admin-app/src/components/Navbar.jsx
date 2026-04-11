import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogOut, ChevronDown } from 'lucide-react';
import { selectAdmin, selectRole, logout } from '../features/auth/authSlice';
import { ROLE_LABELS } from '../utils/constants';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
    const admin = useSelector(selectAdmin);
    const role = useSelector(selectRole);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <header className="admin-header">
            <a href="/" className="admin-header-logo">
                <Leaf className="admin-header-logo-icon" />
                <span className="admin-header-logo-text">GramWaste Connect</span>
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <NotificationCenter />

                {/* Role Badge */}
                <div
                    style={{
                        display: 'inline-block',
                        backgroundColor: 'var(--admin-active)',
                        color: 'var(--admin-primary)',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}
                >
                    {ROLE_LABELS[role] || role}
                </div>

                {/* Admin Info Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: 'var(--admin-text)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-active)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <span style={{ fontWeight: '600' }}>{admin?.name}</span>
                        <ChevronDown size={16} />
                    </button>

                    {showDropdown && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                background: '#fff',
                                border: '1px solid var(--admin-border)',
                                borderRadius: '8px',
                                minWidth: '200px',
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                        >
                            <div style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--admin-muted)' }}>
                                {admin?.jurisdiction_name}
                            </div>
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    color: '#A32D2D',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderTop: '1px solid var(--admin-border)',
                                    textAlign: 'left',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
