import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import Loader from './Loader';

export default function ProtectedRoute({ children }) {
	const { user, loading } = useSelector((state) => state.auth);
	if (loading) return <Loader />;
	if (!user) return <Navigate to="/login" replace />;
	return children;
}
