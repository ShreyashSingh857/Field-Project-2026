import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { changeWorkerPassword } from '../features/auth/authAPI';
import { markPasswordChanged } from '../features/auth/authSlice';

const ChangePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await changeWorkerPassword(currentPassword, newPassword);
      dispatch(markPasswordChanged());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--sm-bg) flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-sm rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-(--sm-primary) mb-1">Change Password</h1>
        <p className="text-xs text-gray-500 mb-4">You must change your password before continuing.</p>

        <label className="block text-sm font-medium mb-1">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
        />

        <label className="block text-sm font-medium mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
        />

        <label className="block text-sm font-medium mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
        />

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <button type="submit" className="sm-btn-primary" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
