import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectAdmin } from '../features/auth/authSlice';

export default function ProtectedRoute({ children }) {
    const admin = useSelector(selectAdmin);
    const token = localStorage.getItem('admin_token');

    if (!admin && !token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
