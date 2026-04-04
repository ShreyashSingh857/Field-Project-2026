import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    LayoutDashboard,
    Map,
    ClipboardList,
    Users,
    AlertCircle,
    ArrowUpCircle,
    GitBranch,
    Megaphone,
    BarChart2,
    LogOut,
} from 'lucide-react';
import { logout, selectAdmin, selectRole } from '../features/auth/authSlice';

const NAV_ITEMS = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['all'],
    },
    {
        path: '/bins',
        label: 'Bin Map',
        icon: Map,
        roles: ['all'],
    },
    {
        path: '/tasks',
        label: 'Tasks',
        icon: ClipboardList,
        roles: ['ward_member'],
    },
    {
        path: '/workers',
        label: 'Workers',
        icon: Users,
        roles: ['ward_member'],
    },
    {
        path: '/issues',
        label: 'Issues',
        icon: AlertCircle,
        roles: ['ward_member'],
    },
    {
        path: '/escalations',
        label: 'Escalations',
        icon: ArrowUpCircle,
        roles: ['gram_panchayat', 'block_samiti', 'zilla_parishad'],
    },
    {
        path: '/hierarchy',
        label: 'Manage Admins',
        icon: GitBranch,
        roles: ['gram_panchayat', 'block_samiti', 'zilla_parishad'],
    },
    {
        path: '/announcements',
        label: 'Announcements',
        icon: Megaphone,
        roles: ['all'],
    },
    {
        path: '/reports',
        label: 'Reports',
        icon: BarChart2,
        roles: ['all'],
    },
];

function Sidebar() {
    const dispatch = useDispatch();
    const admin = useSelector(selectAdmin);
    const role = useSelector(selectRole);

    const visibleItems = NAV_ITEMS.filter(
        (item) => item.roles.includes('all') || item.roles.includes(role)
    );

        const roleBadge = {
            ward_member: { bg: '#E8F5E9', text: '#2E7D32', label: 'Ward Member' },
            gram_panchayat: { bg: '#E3F2FD', text: '#1565C0', label: 'Gram Panchayat' },
            block_samiti: { bg: '#FFF8E1', text: '#F57F17', label: 'Block Samiti' },
            zilla_parishad: { bg: '#FCE4EC', text: '#880E4F', label: 'Zilla Parishad' },
        }[role] || { bg: '#f3f4f6', text: '#374151', label: 'Admin' };

        const hierarchy = ['zilla_parishad', 'block_samiti', 'gram_panchayat', 'ward_member'];

    const handleLogout = () => {
        dispatch(logout());
        window.location.href = '/login';
    };

    return (
        <aside className="admin-sidebar">
            {/* Role Info */}
            <div className="admin-sidebar-role">
                <div className="admin-sidebar-role-label">Role</div>
                <div className="admin-sidebar-role-value">
                    {role?.replace(/_/g, ' ').toUpperCase()}
                </div>
                                <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 10px', borderRadius: '999px', background: roleBadge.bg, color: roleBadge.text, fontSize: '12px', fontWeight: 700 }}>
                                    {roleBadge.label}
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--admin-muted)' }}>
                                    {hierarchy.map((r) => (
                                        <div key={r} style={{ fontWeight: role === r ? 700 : 500, color: role === r ? 'var(--admin-primary)' : 'var(--admin-muted)' }}>
                                            {r.replace(/_/g, ' ')}
                                        </div>
                                    ))}
                                </div>
                {admin?.jurisdiction_name && (
                    <>
                        <div className="admin-sidebar-role-label" style={{ marginTop: '12px' }}>
                            Jurisdiction
                        </div>
                        <div className="admin-sidebar-role-value">{admin.jurisdiction_name}</div>
                    </>
                )}
            </div>

            {/* Navigation Items */}
            <nav style={{ flex: 1, paddingBottom: '16px' }}>
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `admin-nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <Icon />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="admin-nav-item"
                style={{
                    color: '#A32D2D',
                    margin: '8px',
                    marginTop: 'auto',
                    width: 'calc(100% - 16px)',
                    border: 'none',
                    textAlign: 'left',
                    textDecoration: 'none',
                    cursor: 'pointer'
                }}
            >
                <LogOut />
                <span>Logout</span>
            </button>
        </aside>
    );
}

export default Sidebar;
