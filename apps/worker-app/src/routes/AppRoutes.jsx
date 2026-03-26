import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MapView from '../pages/MapView';
import Profile from '../pages/Profile';
import TaskDashboard from '../pages/TaskDashboard';
import TaskDetails from '../pages/TaskDetails';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TaskDashboard />} />
        <Route path="/tasks/:id" element={<TaskDetails />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;