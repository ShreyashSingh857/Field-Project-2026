import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TaskDashboard from '../pages/TaskDashboard';
import TaskDetails from '../pages/TaskDetails';

// Placeholder mock pages for routes not yet implemented in Phase 1
const MapView = () => <div className="p-4">Map View (Phase 2)</div>;
const Profile = () => <div className="p-4">Profile View (Phase 2)</div>;
const Login = () => <div className="p-4">Login Page (Pending Auth)</div>;

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes wrapped in main App structure */}
        <Route path="/" element={<TaskDashboard />} />
        <Route path="/tasks/:id" element={<TaskDetails />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/profile" element={<Profile />} />
        
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;