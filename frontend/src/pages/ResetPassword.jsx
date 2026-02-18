import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedNewPassword = newPassword.trim();
        const trimmedConfirmPassword = confirmPassword.trim();

        if (trimmedNewPassword !== trimmedConfirmPassword) return toast.error('Passwords do not match');
        const resetToken = localStorage.getItem('spl_reset_token');
        if (!resetToken) return toast.error('No reset token. Please verify again.');

        setLoading(true);
        try {
            await API.post('/auth/reset-password', {
                resetToken,
                newPassword: trimmedNewPassword,
                confirmPassword: trimmedConfirmPassword
            });
            localStorage.removeItem('spl_reset_token');
            toast.success('Password reset successful!');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reset failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card animate-fade-up">
                    <div className="auth-logo">
                        <h1>SPL-EARNINGS</h1>
                        <p>Reset Password</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input className="form-input" type={showPassword ? "text" : "password"} placeholder="Enter new password"
                                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ paddingRight: 40 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input className="form-input" type={showPassword ? "text" : "password"} placeholder="Confirm new password"
                                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ paddingRight: 40 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                    <div className="auth-footer">
                        <Link to="/login">← Back to Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
