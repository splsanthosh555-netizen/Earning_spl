import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const refCode = searchParams.get('ref') || '';

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        gender: '',
        referralCode: refCode
    });

    const [emailOtp, setEmailOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedUserId, setGeneratedUserId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const sendEmailOtp = async () => {
        if (!form.email) return toast.error('Enter your email first');
        setSendingEmailOtp(true);
        try {
            await API.post('/auth/send-otp', { target: form.email, type: 'email', purpose: 'register' });
            setEmailOtpSent(true);
            toast.success('OTP sent to your email');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        }
        setSendingEmailOtp(false);
    };

    const verifyEmailOtp = async () => {
        if (!emailOtp) return toast.error('Enter the OTP first');
        try {
            await API.post('/auth/verify-otp', { target: form.email, type: 'email', otp: emailOtp });
            setEmailVerified(true);
            toast.success('Email verified successfully!');
        } catch (err) {
            toast.error('Invalid or expired OTP');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!emailVerified) return toast.error('Please verify your email first');
        if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (!form.phone || form.phone.length < 10) return toast.error('Enter a valid phone number');

        setLoading(true);
        try {
            const res = await API.post('/auth/register', form);
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
                    <div className="auth-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
                            Registration Successful!
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Your unique User ID is:</p>
                        <div style={{
                            fontSize: 48, fontWeight: 900, fontFamily: 'var(--font-display)',
                            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                            marginBottom: 24, letterSpacing: 4
                        }}>
                            {generatedUserId}
                        </div>
                        <p style={{ color: 'var(--yellow-400)', fontSize: 13, marginBottom: 28 }}>
                            ⚠️ Please save this ID — you need it to login!
                        </p>
                        <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
                            Go to Login →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <h1>SPL-EARNINGS</h1>
                        <p>Create your account</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* First & Last Name */}
                        <div className="form-row">
                            <input className="form-input" name="firstName" placeholder="First name"
                                value={form.firstName} onChange={handleChange} required />
                            <input className="form-input" name="lastName" placeholder="Last name"
                                value={form.lastName} onChange={handleChange} required />
                        </div>

                        {/* Email + OTP */}
                        <div className="form-group">
                            <div className="otp-row">
                                <input className="form-input" name="email" type="email"
                                    placeholder="Email address" value={form.email}
                                    onChange={handleChange} disabled={emailVerified} required />
                                {!emailVerified && (
                                    <button type="button" className="btn btn-secondary btn-sm"
                                        onClick={sendEmailOtp} disabled={sendingEmailOtp}>
                                        {sendingEmailOtp ? '...' : 'Send OTP'}
                                    </button>
                                )}
                                {emailVerified && <FiCheck color="#10b981" size={20} />}
                            </div>
                        </div>

                        {emailOtpSent && !emailVerified && (
                            <div className="form-group">
                                <div className="otp-row">
                                    <input className="form-input" placeholder="Enter Email OTP (6 digits)"
                                        value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} maxLength={6} />
                                    <button type="button" className="btn btn-success btn-sm" onClick={verifyEmailOtp}>Verify</button>
                                </div>
                            </div>
                        )}

                        {/* Phone Number (plain — no OTP) */}
                        <div className="form-group">
                            <input className="form-input" name="phone" type="tel"
                                placeholder="Phone Number (e.g. 9502643906)"
                                value={form.phone} onChange={handleChange} required />
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <div style={{ position: 'relative' }}>
                                <input className="form-input" name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password (min 6 characters)"
                                    value={form.password} onChange={handleChange} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <input className="form-input" name="confirmPassword" type="password"
                                placeholder="Confirm password" value={form.confirmPassword}
                                onChange={handleChange} required />
                        </div>

                        {/* Gender */}
                        <div className="form-group">
                            <select className="form-select" name="gender" value={form.gender}
                                onChange={handleChange} required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Referral Code */}
                        <div className="form-group">
                            <input className="form-input" name="referralCode"
                                placeholder="Referral Code (optional — enter referrer's User ID)"
                                value={form.referralCode} onChange={handleChange} />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account'}
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