import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiLock, FiUserPlus, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const refCode = searchParams.get('ref') || '';

    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        password: '', confirmPassword: '', gender: '', referralCode: refCode
    });
    const [emailOtp, setEmailOtp] = useState('');
    const [phoneOtp, setPhoneOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [phoneOtpSent, setPhoneOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedUserId, setGeneratedUserId] = useState(null);
    const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
    const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const sendEmailOtp = async () => {
        if (!form.email) return toast.error('Enter email first');
        setSendingEmailOtp(true);
        try {
            const res = await API.post('/auth/send-otp', { target: form.email, type: 'email', purpose: 'register' });
            setEmailOtpSent(true);
            toast.success('OTP generated successfully');

            // In development, the OTP is returned in the response
            if (res.data.otp) {
                console.log(`Email OTP: ${res.data.otp}`);
                toast(`Dev OTP: ${res.data.otp}`, { icon: '🔑', duration: 15000 });
            }
        } catch (err) {
            console.error('Email OTP Error:', err);
            toast.error(err.response?.data?.message || 'Failed to connect to server');
        }
        setSendingEmailOtp(false);
    };

    const verifyEmailOtp = async () => {
        try {
            await API.post('/auth/verify-otp', { target: form.email, type: 'email', otp: emailOtp });
            setEmailVerified(true);
            toast.success('Email verified!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        }
    };

    const sendPhoneOtp = async () => {
        if (!form.phone) return toast.error('Enter phone number first');
        setSendingPhoneOtp(true);
        try {
            const res = await API.post('/auth/send-otp', { target: form.phone, type: 'phone', purpose: 'register' });
            setPhoneOtpSent(true);
            toast.success('OTP generated successfully');

            if (res.data.otp) {
                console.log(`Phone OTP: ${res.data.otp}`);
                toast(`Dev OTP: ${res.data.otp}`, { icon: '🔑', duration: 15000 });
            }
        } catch (err) {
            console.error('Phone OTP Error:', err);
            toast.error(err.response?.data?.message || 'Failed to connect to server');
        }
        setSendingPhoneOtp(false);
    };

    const verifyPhoneOtp = async () => {
        try {
            await API.post('/auth/verify-otp', { target: form.phone, type: 'phone', otp: phoneOtp });
            setPhoneVerified(true);
            toast.success('Phone verified!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!emailVerified) return toast.error('Please verify your email');
        if (!phoneVerified) return toast.error('Please verify your phone');
        const password = form.password.trim();
        const confirmPassword = form.confirmPassword.trim();

        if (password !== confirmPassword) return toast.error('Passwords do not match');
        if (password.length < 6) return toast.error('Password must be at least 6 characters');

        setLoading(true);
        try {
            const res = await API.post('/auth/register', {
                ...form,
                password,
                confirmPassword
            });
            setGeneratedUserId(res.data.userId);
            toast.success('Registration successful!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        }
        setLoading(false);
    };

    if (generatedUserId) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card animate-fade-up" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                        <h2 className="auth-title">Registration Successful!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Your User ID has been generated. Please save it for login.
                        </p>
                        <div style={{
                            padding: '16px', background: 'var(--bg-secondary)', borderRadius: 12,
                            border: '1px solid var(--border-glass)', marginBottom: 24
                        }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Your User ID</div>
                            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'monospace', color: 'var(--gold)' }}>
                                {generatedUserId}
                            </div>
                        </div>
                        <Link to="/login" className="btn btn-primary btn-full">
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card animate-fade-up">
                    <div className="auth-logo">
                        <h1>SPL-EARNINGS</h1>
                        <p>Create your account</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input className="form-input" name="firstName" placeholder="First name"
                                    value={form.firstName} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input className="form-input" name="lastName" placeholder="Last name"
                                    value={form.lastName} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div className="otp-row">
                                <input className="form-input" name="email" type="email" placeholder="your@email.com"
                                    value={form.email} onChange={handleChange} disabled={emailVerified} required />
                                {!emailVerified && (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={sendEmailOtp} disabled={sendingEmailOtp}>
                                        {sendingEmailOtp ? '...' : (emailOtpSent ? 'Resend' : 'Send OTP')}
                                    </button>
                                )}
                                {emailVerified && <FiCheck style={{ color: 'var(--green-400)', fontSize: 20 }} />}
                            </div>
                        </div>

                        {emailOtpSent && !emailVerified && (
                            <div className="form-group">
                                <label className="form-label">Email OTP</label>
                                <div className="otp-row">
                                    <input className="form-input" placeholder="Enter 6-digit OTP"
                                        value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} maxLength={6} />
                                    <button type="button" className="btn btn-success btn-sm" onClick={verifyEmailOtp}>
                                        Verify
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <div className="otp-row">
                                <input className="form-input" name="phone" placeholder="10-digit phone number"
                                    value={form.phone} onChange={handleChange} disabled={phoneVerified} required />
                                {!phoneVerified && (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={sendPhoneOtp} disabled={sendingPhoneOtp}>
                                        {sendingPhoneOtp ? '...' : (phoneOtpSent ? 'Resend' : 'Send OTP')}
                                    </button>
                                )}
                                {phoneVerified && <FiCheck style={{ color: 'var(--green-400)', fontSize: 20 }} />}
                            </div>
                        </div>

                        {phoneOtpSent && !phoneVerified && (
                            <div className="form-group">
                                <label className="form-label">Phone OTP</label>
                                <div className="otp-row">
                                    <input className="form-input" placeholder="Enter 6-digit OTP"
                                        value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} maxLength={6} />
                                    <button type="button" className="btn btn-success btn-sm" onClick={verifyPhoneOtp}>
                                        Verify
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input className="form-input" name="password" type={showPassword ? "text" : "password"} placeholder="Minimum 6 characters"
                                    value={form.password} onChange={handleChange} required style={{ paddingRight: 40 }} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 10, top: 10,
                                        background: 'none', border: 'none', color: 'var(--text-muted)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input className="form-input" name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Confirm your password"
                                    value={form.confirmPassword} onChange={handleChange} required style={{ paddingRight: 40 }} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 10, top: 10,
                                        background: 'none', border: 'none', color: 'var(--text-muted)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Gender</label>
                            <select className="form-select" name="gender" value={form.gender} onChange={handleChange} required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Referral Code (Optional)</label>
                            <input className="form-input" name="referralCode" placeholder="Enter referral User ID"
                                value={form.referralCode} onChange={handleChange} />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Register'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
