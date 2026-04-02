import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { loginAdmin, selectAuthLoading, selectAuthError, clearError } from '../features/auth/authSlice';
import { useToast, Toast } from '../utils/useToast';

import { DEMO_CREDENTIALS } from '../utils/constants';

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const loading = useSelector(selectAuthLoading);
    const error = useSelector(selectAuthError);
    const { toast, showToast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const ROLE_KEYS = ['zilla_parishad', 'block_samiti', 'gram_panchayat', 'ward_member'];
    const [selectedRole, setSelectedRole] = useState(null);

    const handleDemoRoleClick = (roleKey) => {
      const cred = DEMO_CREDENTIALS[roleKey];
      setSelectedRole(roleKey);
      setEmail(cred.email);
      setPassword(cred.password);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());

        if (!email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        const result = await dispatch(loginAdmin({ email, password }));
        if (result.type === 'auth/login/fulfilled') {
            showToast('Login successful!', 'success');
            setTimeout(() => navigate('/dashboard'), 500);
        } else {
            showToast('Invalid email or password', 'error');
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: 'var(--admin-bg)',
                padding: '20px',
            }}
        >
            <Toast toast={toast} />

            <div
                style={{
                    backgroundColor: 'var(--admin-panel)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '12px',
                    padding: '40px',
                    width: '100%',
                    maxWidth: '420px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                }}
            >
                {/* Logo & Heading */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <Leaf
                            size={40}
                            color="var(--admin-primary)"
                            style={{ margin: '0 auto' }}
                        />
                    </div>
                    <h1
                        style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: 'var(--admin-primary)',
                            marginBottom: '8px',
                        }}
                    >
                        GramWaste Connect
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--admin-muted)' }}>
                        Admin Portal
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="admin-alert danger" style={{ marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="admin-form-group">
                        <label className="admin-form-label">
                            Quick Demo Login — click a role to auto-fill credentials
                        </label>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {ROLE_KEYS.map((roleKey) => {
                                const cred = DEMO_CREDENTIALS[roleKey];
                                const isSelected = selectedRole === roleKey;
                                return (
                                    <button
                                        key={roleKey}
                                        type="button"
                                        onClick={() => handleDemoRoleClick(roleKey)}
                                        style={{
                                            textAlign: 'left',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: isSelected
                                                ? `2px solid ${cred.color}`
                                                : '1.5px solid var(--admin-border)',
                                            backgroundColor: isSelected ? `${cred.color}12` : 'transparent',
                                            color: isSelected ? cred.color : 'var(--admin-text)',
                                            fontWeight: isSelected ? '600' : '400',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span>{cred.label}</span>
                                        {isSelected && (
                                            <span style={{ fontSize: '11px', color: cred.color, fontWeight: '500' }}>
                                                ✓ credentials filled
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--admin-muted)', marginTop: '8px' }}>
                            Or enter your own credentials below
                        </p>
                    </div>

                    {/* Email Input */}
                    <div className="admin-form-group">
                        <label className="admin-form-label required">Email</label>
                        <input
                            type="email"
                            className="admin-form-input"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Password Input */}
                    <div className="admin-form-group">
                        <label className="admin-form-label required">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="admin-form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--admin-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        className="admin-btn-primary"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '24px' }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

            </div>
        </div>
    );
}

export default Login;
