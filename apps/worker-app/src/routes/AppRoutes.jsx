import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from '../components/ProtectedRoute';
import ChangePassword from '../pages/ChangePassword';
import Login from '../pages/Login';
import MapView from '../pages/MapView';
import Profile from '../pages/Profile';
import TaskDashboard from '../pages/TaskDashboard';
import TaskDetails from '../pages/TaskDetails';

const AppRoutes = () => {
  const location = useLocation();
  const worker = useSelector((state) => state.auth.worker);

  if (worker && !worker.password_changed && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><TaskDashboard /></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppRoutesWithRouter = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default AppRoutesWithRouter;