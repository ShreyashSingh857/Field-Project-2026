import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole } from '../features/auth/authSlice';

// Components
import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/AppShell';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import BinMap from '../pages/BinMap';
import TaskManagement from '../pages/TaskManagement';
import WorkerManagement from '../pages/WorkerManagement';
import IssueManagement from '../pages/IssueManagement';
import EscalationPanel from '../pages/EscalationPanel';
import HierarchyManagement from '../pages/HierarchyManagement';
import Reports from '../pages/Reports';
import Announcements from '../pages/Announcements';

// RoleGate component - restricts access based on role
function RoleGate({ allowedRoles, children }) {
    const role = useSelector(selectRole);

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AppShell />
                    </ProtectedRoute>
                }
            >
                {/* Accessible to all roles */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                    path="/bins"
                    element={
                        <RoleGate allowedRoles={['ward_member', 'gram_panchayat']}>
                            <BinMap />
                        </RoleGate>
                    }
                />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/reports" element={<Reports />} />

                {/* ward_member only */}
                <Route
                    path="/tasks"
                    element={
                        <RoleGate allowedRoles={['ward_member']}>
                            <TaskManagement />
                        </RoleGate>
                    }
                />
                <Route
                    path="/workers"
                    element={
                        <RoleGate allowedRoles={['ward_member']}>
                            <WorkerManagement />
                        </RoleGate>
                    }
                />
                <Route
                    path="/issues"
                    element={
                        <RoleGate allowedRoles={['ward_member']}>
                            <IssueManagement />
                        </RoleGate>
                    }
                />

                {/* gram_panchayat, block_samiti, zilla_parishad */}
                <Route
                    path="/escalations"
                    element={
                        <RoleGate allowedRoles={['gram_panchayat', 'block_samiti', 'zilla_parishad']}>
                            <EscalationPanel />
                        </RoleGate>
                    }
                />
                <Route
                    path="/hierarchy"
                    element={
                        <RoleGate allowedRoles={['gram_panchayat', 'block_samiti', 'zilla_parishad']}>
                            <HierarchyManagement />
                        </RoleGate>
                    }
                />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default AppRoutes;
