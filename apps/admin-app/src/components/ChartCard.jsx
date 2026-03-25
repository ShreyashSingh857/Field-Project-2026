import React from 'react';

function ChartCard({ title, children }) {
    return (
        <div className="admin-panel">
            <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                {title}
            </h2>
            {children}
        </div>
    );
}

export default ChartCard;
