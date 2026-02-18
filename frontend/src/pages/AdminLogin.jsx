import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiShield, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function AdminLogin() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/auth/login', { userId: email, password });

            if (!res.data.user.isAdmin) {
                toast.error('Access Denied: Not an admin account');
                setLoading(false);
                return;
            }

            login(res.data.token, res.data.user);
            toast.success(`Welcome to Admin Portal, ${res.data.user.firstName}!`);
            navigate('/admin');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page admin-portal">
            <div className="auth-container">
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/')}
                    style={{ marginBottom: 20, alignSelf: 'flex-start' }}
                >
                    <FiArrowLeft /> Back to Website
                </button>

                <div className="auth-card animate-fade-up" style={{ borderColor: 'var(--purple-500)' }}>
                    <div className="auth-logo">
                        <div style={{
                            width: 60, height: 60, background: 'var(--purple-500)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 16px',
                            boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                        }}>
                            <FiShield size={30} color="white" />
                        </div>
                        <h1 style={{ color: 'var(--purple-400)' }}>Admin Portal</h1>
                        <p>Secure Administrator Access</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Admin Email</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{ paddingLeft: 40 }}
                                />
                                <FiLock style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Security Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingLeft: 40, paddingRight: 40 }}
                                />
                                <FiShield style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 10, top: 12,
                                        background: 'none', border: 'none', color: 'var(--text-muted)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-full btn-lg"
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                                color: 'white',
                                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)'
                            }}
                        >
                            {loading ? 'Verifying...' : 'Access Control Panel'}
                        </button>
                    </form>

                    <div className="auth-footer" style={{ borderTop: '1px solid var(--border-glass)', marginTop: 24, paddingTop: 16 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Unauthorized access is strictly prohibited.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
