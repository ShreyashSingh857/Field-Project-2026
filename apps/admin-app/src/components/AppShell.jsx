import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

function AppShell() {
    return (
        <div className="admin-shell">
            <Navbar />
            <div className="admin-body">
                <Sidebar />
                <main className="admin-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppShell;
