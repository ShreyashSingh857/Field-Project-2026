import React from 'react';

function StatCard({ icon: Icon, label, value, sub, variant = 'default' }) {
    const getValueColor = () => {
        switch (variant) {
            case 'warning':
                return '#854F0B';
            case 'danger':
                return '#A32D2D';
            default:
                return 'var(--admin-primary)';
        }
    };

    return (
        <div className="admin-stat-card">
            {Icon && <Icon className="admin-stat-icon" />}
            <div className="admin-stat-label">{label}</div>
            <div className="admin-stat-value" style={{ color: getValueColor() }}>
                {value}
            </div>
            {sub && <div className="admin-stat-sub">{sub}</div>}
        </div>
    );
}

export default StatCard;
