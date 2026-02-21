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
    const [loading, setLoading] = useState(false);
    const [generatedUserId, setGeneratedUserId] = useState(null);
    const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // ===============================
    // SEND EMAIL OTP
    // ===============================
    const sendEmailOtp = async () => {
        if (!form.email) return toast.error('Enter email first');

        setSendingEmailOtp(true);
        try {
            await API.post('/auth/send-otp', {
                target: form.email,
                type: 'email',
                purpose: 'register'
            });

            setEmailOtpSent(true);
            toast.success('OTP sent to your email');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        }
        setSendingEmailOtp(false);
    };

    // ===============================
    // VERIFY EMAIL OTP
    // ===============================
    const verifyEmailOtp = async () => {
        try {
            await API.post('/auth/verify-otp', {
                target: form.email,
                type: 'email',
                otp: emailOtp
            });

            setEmailVerified(true);
            toast.success('Email verified successfully!');
        } catch (err) {
            toast.error('Invalid or expired OTP');
        }
    };

    // ===============================
    // REGISTER
    // ===============================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!emailVerified)
            return toast.error('Please verify your email');

        if (form.password !== form.confirmPassword)
            return toast.error('Passwords do not match');

        if (form.password.length < 6)
            return toast.error('Password must be at least 6 characters');

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

    // ===============================
    // SUCCESS SCREEN
    // ===============================
    if (generatedUserId) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card" style={{ textAlign: 'center' }}>
                        <h2>🎉 Registration Successful!</h2>
                        <p>Your User ID:</p>
                        <h1>{generatedUserId}</h1>
                        <Link to="/login" className="btn btn-primary btn-full">
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ===============================
    // MAIN FORM
    // ===============================
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
                            <input
                                className="form-input"
                                name="firstName"
                                placeholder="First name"
                                value={form.firstName}
                                onChange={handleChange}
                                required
                            />
                            <input
                                className="form-input"
                                name="lastName"
                                placeholder="Last name"
                                value={form.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Email + OTP */}
                        <div className="form-group">
                            <div className="otp-row">
                                <input
                                    className="form-input"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    disabled={emailVerified}
                                    required
                                />
                                {!emailVerified && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={sendEmailOtp}
                                        disabled={sendingEmailOtp}
                                    >
                                        {sendingEmailOtp ? '...' : 'Send OTP'}
                                    </button>
                                )}
                                {emailVerified && <FiCheck />}
                            </div>
                        </div>

                        {emailOtpSent && !emailVerified && (
                            <div className="form-group">
                                <div className="otp-row">
                                    <input
                                        className="form-input"
                                        placeholder="Enter 6-digit OTP"
                                        value={emailOtp}
                                        onChange={(e) =>
                                            setEmailOtp(e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-success btn-sm"
                                        onClick={verifyEmailOtp}
                                    >
                                        Verify
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phone (NO OTP) */}
                        <div className="form-group">
                            <input
                                className="form-input"
                                name="phone"
                                placeholder="10-digit phone number"
                                value={form.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Minimum 6 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="eye-btn"
                                >
                                    {showPassword ? (
                                        <FiEyeOff />
                                    ) : (
                                        <FiEye />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <input
                                className="form-input"
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm your password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Gender */}
                        <div className="form-group">
                            <select
                                className="form-select"
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Referral */}
                        <div className="form-group">
                            <input
                                className="form-input"
                                name="referralCode"
                                placeholder="Enter referral User ID"
                                value={form.referralCode}
                                onChange={handleChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Register'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account?{' '}
                        <Link to="/login">Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}