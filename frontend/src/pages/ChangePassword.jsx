import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const oldPassword = form.oldPassword.trim();
        const newPassword = form.newPassword.trim();
        const confirmPassword = form.confirmPassword.trim();

        if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
        setLoading(true);
        try {
            await API.put('/user/change-password', {
                oldPassword,
                newPassword,
                confirmPassword
            });
            toast.success('Password changed successfully!');
            setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
        setLoading(false);
    };

    return (
        <div className="settings-page animate-fade-up">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>
            <div className="settings-card">
                <div className="settings-title"><FiLock /> Change Password</div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Old Password</label>
                        <div style={{ position: 'relative' }}>
                            <input className="form-input" type={showPassword ? "text" : "password"} name="oldPassword"
                                value={form.oldPassword} onChange={handleChange} required style={{ paddingRight: 40 }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div style={{ position: 'relative' }}>
                            <input className="form-input" type={showPassword ? "text" : "password"} name="newPassword"
                                value={form.newPassword} onChange={handleChange} required style={{ paddingRight: 40 }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <input className="form-input" type={showPassword ? "text" : "password"} name="confirmPassword"
                                value={form.confirmPassword} onChange={handleChange} required style={{ paddingRight: 40 }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
