import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/auth/login', { userId, password });
            login(res.data.token, res.data.user);
            toast.success(`Welcome back, ${res.data.user.firstName}!`);
            navigate('/home');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card animate-fade-up">
                    <div className="auth-logo">
                        <h1>SPL-EARNINGS</h1>
                        <p>Welcome back</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">User ID</label>
                            <input className="form-input" placeholder="Enter your User ID" id="login-userid"
                                value={userId} onChange={(e) => setUserId(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" placeholder="Enter your password" id="login-password"
                                value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="login-submit">
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    <div className="auth-footer">
                        <div style={{ marginBottom: 8 }}>
                            <Link to="/forgot-password">Forgot Password?</Link>
                        </div>
                        Don't have an account? <Link to="/register">Register here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
