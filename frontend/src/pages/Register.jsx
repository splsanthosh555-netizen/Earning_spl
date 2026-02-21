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

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // 🔥 SEND EMAIL OTP
    const sendEmailOtp = async () => {
        if (!form.email) return toast.error('Enter email first');

        setSendingEmailOtp(true);
        try {
            await API.post('/auth/send-otp', {
                target: form.email,
                type: 'email'
            });

            setEmailOtpSent(true);
            toast.success('OTP sent to your email');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        }
        setSendingEmailOtp(false);
    };

    // 🔥 VERIFY EMAIL OTP
    const verifyEmailOtp = async () => {
        try {
            await API.post('/auth/verify-otp', {
                target: form.email,
                type: 'email',
                otp: emailOtp
            });

            setEmailVerified(true);
            toast.success('Email verified successfully');
        } catch (err) {
            toast.error('Invalid OTP');
        }
    };

    // 🔥 REGISTER
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

    // 🎉 SUCCESS SCREEN
    if (generatedUserId) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-card" style={{ textAlign: 'center' }}>
                        <h2>Registration Successful!</h2>
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

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <h1>SPL-EARNINGS</h1>
                    <p>Create your account</p>

                    <form onSubmit={handleSubmit}>
                        <input
                            name="firstName"
                            placeholder="First Name"
                            value={form.firstName}
                            onChange={handleChange}
                            required
                        />

                        <input
                            name="lastName"
                            placeholder="Last Name"
                            value={form.lastName}
                            onChange={handleChange}
                            required
                        />

                        {/* EMAIL */}
                        <div>
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={handleChange}
                                disabled={emailVerified}
                                required
                            />

                            {!emailVerified && (
                                <button type="button" onClick={sendEmailOtp}>
                                    {emailOtpSent ? 'Resend OTP' : 'Send OTP'}
                                </button>
                            )}

                            {emailVerified && <FiCheck color="green" />}
                        </div>

                        {emailOtpSent && !emailVerified && (
                            <div>
                                <input
                                    placeholder="Enter Email OTP"
                                    value={emailOtp}
                                    onChange={(e) => setEmailOtp(e.target.value)}
                                />
                                <button type="button" onClick={verifyEmailOtp}>
                                    Verify
                                </button>
                            </div>
                        )}

                        {/* PHONE (NO OTP) */}
                        <input
                            name="phone"
                            placeholder="Phone Number"
                            value={form.phone}
                            onChange={handleChange}
                            required
                        />

                        {/* PASSWORD */}
                        <div style={{ position: 'relative' }}>
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: 10,
                                    background: 'none',
                                    border: 'none'
                                }}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>

                        <input
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm Password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />

                        <select
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

                        <input
                            name="referralCode"
                            placeholder="Referral Code (Optional)"
                            value={form.referralCode}
                            onChange={handleChange}
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Register'}
                        </button>
                    </form>

                    <p>
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}