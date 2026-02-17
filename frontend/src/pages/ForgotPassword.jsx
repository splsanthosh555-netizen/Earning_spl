import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ userId: '', email: '', phone: '' });
    const [emailOtp, setEmailOtp] = useState('');
    const [phoneOtp, setPhoneOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const sendEmailOtp = async () => {
        if (!form.email) return toast.error('Enter email first');
        try {
            const res = await API.post('/auth/send-otp', { target: form.email, type: 'email' });
            toast.success('OTP sent to email');
            if (res.data.otp) toast(`Dev OTP: ${res.data.otp}`, { icon: '🔑', duration: 10000 });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
    };

    const verifyEmailOtp = async () => {
        try {
            await API.post('/auth/verify-otp', { target: form.email, type: 'email', otp: emailOtp });
            setEmailVerified(true);
            toast.success('Email verified!');
        } catch (err) { toast.error('Invalid OTP'); }
    };

    const sendPhoneOtp = async () => {
        if (!form.phone) return toast.error('Enter phone first');
        try {
            const res = await API.post('/auth/send-otp', { target: form.phone, type: 'phone' });
            toast.success('OTP sent to phone');
            if (res.data.otp) toast(`Dev OTP: ${res.data.otp}`, { icon: '🔑', duration: 10000 });
        } catch (err) { toast.error('Failed'); }
    };

    const verifyPhoneOtp = async () => {
        try {
            await API.post('/auth/verify-otp', { target: form.phone, type: 'phone', otp: phoneOtp });
            setPhoneVerified(true);
            toast.success('Phone verified!');
        } catch (err) { toast.error('Invalid OTP'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!emailVerified || !phoneVerified) return toast.error('Please verify both email and phone');
        setLoading(true);
        try {
            const res = await API.post('/auth/forgot-password', form);
            localStorage.setItem('spl_reset_token', res.data.resetToken);
            toast.success('Verified! Redirecting to reset password...');
            navigate('/reset-password');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Verification failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card animate-fade-up">
                    <div className="auth-logo">
                        <h1>SPL-EARNINGS</h1>
                        <p>Forgot Password</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">User ID</label>
                            <input className="form-input" name="userId" placeholder="Enter your User ID"
                                value={form.userId} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div className="otp-row">
                                <input className="form-input" name="email" type="email" placeholder="your@email.com"
                                    value={form.email} onChange={handleChange} disabled={emailVerified} required />
                                {!emailVerified && (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={sendEmailOtp}>Send OTP</button>
                                )}
                                {emailVerified && <span style={{ color: 'var(--green-400)' }}>✓</span>}
                            </div>
                        </div>
                        {!emailVerified && (
                            <div className="form-group">
                                <div className="otp-row">
                                    <input className="form-input" placeholder="Email OTP" value={emailOtp}
                                        onChange={(e) => setEmailOtp(e.target.value)} maxLength={6} />
                                    <button type="button" className="btn btn-success btn-sm" onClick={verifyEmailOtp}>Verify</button>
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <div className="otp-row">
                                <input className="form-input" name="phone" placeholder="Phone number"
                                    value={form.phone} onChange={handleChange} disabled={phoneVerified} required />
                                {!phoneVerified && (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={sendPhoneOtp}>Send OTP</button>
                                )}
                                {phoneVerified && <span style={{ color: 'var(--green-400)' }}>✓</span>}
                            </div>
                        </div>
                        {!phoneVerified && (
                            <div className="form-group">
                                <div className="otp-row">
                                    <input className="form-input" placeholder="Phone OTP" value={phoneOtp}
                                        onChange={(e) => setPhoneOtp(e.target.value)} maxLength={6} />
                                    <button type="button" className="btn btn-success btn-sm" onClick={verifyPhoneOtp}>Verify</button>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Continue'}
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
