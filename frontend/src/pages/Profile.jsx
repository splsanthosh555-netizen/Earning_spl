import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="settings-page animate-fade-up">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>
            <div className="settings-card">
                <div className="settings-title"><FiUser /> Profile</div>
                <div className="settings-row">
                    <span className="settings-label">First Name</span>
                    <span className="settings-value">{user?.firstName}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Last Name</span>
                    <span className="settings-value">{user?.lastName}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Email</span>
                    <span className="settings-value">{user?.email}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Phone Number</span>
                    <span className="settings-value">{user?.phone}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Gender</span>
                    <span className="settings-value" style={{ textTransform: 'capitalize' }}>{user?.gender}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">User ID</span>
                    <span className="settings-value" style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{user?.userId}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-label">Membership</span>
                    <span className="settings-value" style={{ textTransform: 'capitalize', color: 'var(--purple-400)' }}>
                        {user?.membership === 'vip' ? 'VIP' : user?.membership}
                    </span>
                </div>
            </div>
        </div>
    );
}
