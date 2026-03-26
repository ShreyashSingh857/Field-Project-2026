import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../features/auth/authSlice';
import { DEMO_WORKER_CREDENTIALS } from '../features/auth/authAPI';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fillDemoCredentials = () => {
    setEmail(DEMO_WORKER_CREDENTIALS.email);
    setPassword(DEMO_WORKER_CREDENTIALS.password);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (!result.error) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sm-bg)] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-sm rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-[var(--sm-primary)] mb-1">Safai Mitra Login</h1>
        <p className="text-xs text-gray-500 mb-4">Sign in with your Supabase worker account</p>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <p className="font-semibold mb-1">Demo credentials</p>
          <p>Email: {DEMO_WORKER_CREDENTIALS.email}</p>
          <p>Password: {DEMO_WORKER_CREDENTIALS.password}</p>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="mt-2 text-xs font-semibold text-blue-700 underline"
          >
            Use demo credentials
          </button>
        </div>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
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

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <button type="submit" className="sm-btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

export default Login;
