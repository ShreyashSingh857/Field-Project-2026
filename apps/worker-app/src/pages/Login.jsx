import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../features/auth/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (employeeId.includes('@')) {
      setLocalError('Use Worker Employee ID here. Gram Panchayat/Admin email login works only in Admin Portal.');
      return;
    }

    const result = await dispatch(login({ employee_id: employeeId.trim(), password }));
    if (!result.error) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-(--sm-bg) flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-sm rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-(--sm-primary) mb-1">Safai Mitra Login</h1>
        <p className="text-xs text-gray-500 mb-2">Sign in with your Worker Employee ID and password</p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mb-4">
          Note: Gram Panchayat/Admin credentials are for Admin Portal, not Worker Portal.
        </p>

        <label className="block text-sm font-medium mb-1">Employee ID</label>
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
          placeholder="e.g. GWC-WRK-AB12CD34"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
        />

        {(localError || error) && <p className="text-xs text-red-600 mb-2">{localError || error}</p>}

        <button type="submit" className="sm-btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

export default Login;
