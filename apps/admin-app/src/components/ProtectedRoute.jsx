import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectAdmin } from '../features/auth/authSlice';

export default function ProtectedRoute({ children }) {
    const admin = useSelector(selectAdmin);

    if (!admin) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
