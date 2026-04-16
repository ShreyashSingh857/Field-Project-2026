import { Navigate, Route, Routes} from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import ProtectedLayout from '../components/ProtectedLayout';
import AIScannerPage from '../pages/AIScannerPage';
import BinDetails from '../pages/BinDetails';
import BinsMapPage from '../pages/BinsMapPage';
import Dashboard from '../pages/Dashboard';
import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import MarketplaceBrowse from '../pages/MarketplaceBrowse';
import MarketplaceCreate from '../pages/MarketplaceCreate';
import MyListings from '../pages/MyListings';
import Profile from '../pages/Profile';
import ReportIssuePage from '../pages/ReportIssuePage';
import WasteTipsPage from '../pages/WasteTipsPage';

// Helper so every protected route gets the layout
function Protected({ children }) {
  return (
    <ProtectedRoute>
      <ProtectedLayout>
        {children}
      </ProtectedLayout>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<Login />} />
			<Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
			<Route path="/bins" element={<Protected><BinsMapPage /></Protected>} />
			<Route path="/bins/:id" element={<Protected><BinDetails /></Protected>} />
			<Route path="/ai-scanner" element={<Protected><AIScannerPage /></Protected>} />
			<Route path="/marketplace" element={<Protected><MarketplaceBrowse /></Protected>} />
			<Route path="/marketplace/create" element={<Protected><MarketplaceCreate /></Protected>} />
			<Route path="/my-listings" element={<Protected><MyListings /></Protected>} />
			<Route path="/profile" element={<Protected><Profile /></Protected>} />
			<Route path="/report" element={<Protected><ReportIssuePage /></Protected>} />
			<Route path="/announcements" element={<Protected><WasteTipsPage /></Protected>} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
