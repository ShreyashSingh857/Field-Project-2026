import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapSession } from '../features/auth/authSlice';

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const { token, bootstrapped } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!bootstrapped) {
      dispatch(bootstrapSession());
    }
  }, [bootstrapped, dispatch]);

  if (!bootstrapped) {
    return <div className="p-4 text-sm text-gray-600">Loading session...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
