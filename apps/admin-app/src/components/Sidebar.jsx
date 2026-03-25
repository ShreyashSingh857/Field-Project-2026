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
        roles: ['panchayat_admin'],
    },
    {
        path: '/workers',
        label: 'Workers',
        icon: Users,
        roles: ['panchayat_admin'],
    },
    {
        path: '/issues',
        label: 'Issues',
        icon: AlertCircle,
        roles: ['panchayat_admin'],
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
