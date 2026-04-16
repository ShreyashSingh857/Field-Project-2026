import React from 'react';
import AppRoutes from './routes/AppRoutes';
import NotificationCenter from './components/NotificationCenter';
import './App.css';

function App() {
  return (
    <div className="worker-app">
      <NotificationCenter />
      <AppRoutes />
    </div>
  );
}

export default App;
