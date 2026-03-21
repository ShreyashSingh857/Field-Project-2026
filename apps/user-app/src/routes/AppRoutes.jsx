import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AIScannerPage from '../pages/AIScannerPage';
import BinDetails from '../pages/BinDetails';
import BinsMapPage from '../pages/BinsMapPage';
import Dashboard from '../pages/Dashboard';
import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import MarketplacePage from '../pages/MarketplacePage';

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<Login />} />
			<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
			<Route path="/bins" element={<ProtectedRoute><BinsMapPage /></ProtectedRoute>} />
			<Route path="/bins/:id" element={<ProtectedRoute><BinDetails /></ProtectedRoute>} />
			<Route path="/ai-scanner" element={<ProtectedRoute><AIScannerPage /></ProtectedRoute>} />
			<Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
