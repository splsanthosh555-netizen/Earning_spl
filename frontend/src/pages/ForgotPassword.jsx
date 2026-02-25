import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ userId: '', email: '', phone: '' });
    const [emailOtp, setEmailOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const sendEmailOtp = async () => {
        if (!form.email) return toast.error('Enter email first');
        try {
            await API.post('/auth/send-otp', { target: form.email, type: 'email', purpose: 'forget-password' });
            setEmailOtpSent(true);
            toast.success('OTP sent to email');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        }
    };

    const verifyEmailOtp = async () => {
        if (!emailOtp) return toast.error('Enter the OTP first');
        try {
            await API.post('/auth/verify-otp', { target: form.email, type: 'email', otp: emailOtp });
            setEmailVerified(true);
            toast.success('Email verified!');
        } catch (err) { toast.error('Invalid or expired OTP'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.userId) return toast.error('Enter your User ID');
        if (!emailVerified) return toast.error('Please verify your email first');
        if (!form.phone) return toast.error('Enter your phone number');

        setLoading(true);
        try {
            const res = await API.post('/auth/verify-forget', {
                userId: form.userId,
                email: form.email,
                phone: form.phone,
                emailOtp
            });
            localStorage.setItem('spl_reset_token', res.data.resetToken);
            toast.success('Verified! Redirecting...');
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
                        {/* Step 1: User ID */}
                        <div className="form-group">
                            <label className="form-label">User ID</label>
                            <input className="form-input" name="userId" placeholder="Enter your User ID"
                                value={form.userId} onChange={handleChange} required />
                        </div>

                        {/* Step 2: Email + OTP */}
                        <div className="form-group">
                            <label className="form-label">Registered Email</label>
                            <div className="otp-row">
                                <input className="form-input" name="email" type="email"
                                    placeholder="your@email.com" value={form.email}
                                    onChange={handleChange} disabled={emailVerified} required />
                                {!emailVerified && (
                                    <button type="button" className="btn btn-secondary btn-sm"
                                        onClick={sendEmailOtp}>Send OTP</button>
                                )}
                                {emailVerified && <span style={{ color: 'var(--green-400)', fontSize: 20 }}>✓</span>}
                            </div>
                        </div>

                        {emailOtpSent && !emailVerified && (
                            <div className="form-group">
                                <div className="otp-row">
                                    <input className="form-input" placeholder="Email OTP"
                                        value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} maxLength={6} />
                                    <button type="button" className="btn btn-success btn-sm"
                                        onClick={verifyEmailOtp}>Verify</button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Phone */}
                        <div className="form-group">
                            <label className="form-label">Registered Phone Number</label>
                            <input className="form-input" name="phone"
                                placeholder="Phone number registered with account"
                                value={form.phone} onChange={handleChange} required />
                        </div>

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
