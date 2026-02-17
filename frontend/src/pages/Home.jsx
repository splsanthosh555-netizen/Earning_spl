import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiUser, FiLock, FiDollarSign, FiFileText, FiLogOut, FiCopy, FiShare2, FiUsers, FiLink, FiAward, FiTrendingUp, FiActivity, FiUserCheck, FiUserX, FiCalendar, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Home() {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [referralData, setReferralData] = useState(null);
    const [directLines, setDirectLines] = useState([]);
    const [indirectLines, setIndirectLines] = useState([]);
    const [showDirect, setShowDirect] = useState(false);
    const [showIndirect, setShowIndirect] = useState(false);
    const [dashData, setDashData] = useState(null);

    useEffect(() => {
        refreshUser();
        fetchReferral();
        fetchDashboard();
    }, []);

    const fetchReferral = async () => {
        try {
            const res = await API.get('/referral/link');
            setReferralData(res.data);
        } catch (err) { }
    };

    const fetchDashboard = async () => {
        try {
            if (user?.isAdmin) {
                const res = await API.get('/admin/dashboard');
                setDashData(res.data);
            }
        } catch (err) { }
    };

    const openDirectLines = async () => {
        try {
            const res = await API.get('/referral/direct');
            setDirectLines(res.data);
            setShowDirect(true);
        } catch (err) { toast.error('Failed to load'); }
    };

    const openIndirectLines = async () => {
        try {
            const res = await API.get('/referral/indirect');
            setIndirectLines(res.data);
            setShowIndirect(true);
        } catch (err) { toast.error('Failed to load'); }
    };

    const copyLink = () => {
        if (referralData?.referralLink) {
            navigator.clipboard.writeText(referralData.referralLink);
            toast.success('Referral link copied!');
        }
    };

    const shareLink = () => {
        if (navigator.share && referralData?.referralLink) {
            navigator.share({ title: 'SPL-Earnings Referral', text: 'Join SPL-Earnings using my referral!', url: referralData.referralLink });
        } else {
            copyLink();
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        toast.success('Logged out');
    };

    const getMembershipLabel = (m) => {
        if (m === 'none') return 'None';
        if (m === 'vip') return 'VIP';
        return m?.charAt(0).toUpperCase() + m?.slice(1);
    };

    return (
        <div className="page-wrapper">
            {/* HEADER */}
            <header className="app-header">
                <div className="header-left">
                    <div className="header-brand">SPL-EARNINGS</div>
                    <div className="header-welcome">Welcome, <strong>{user?.firstName} {user?.lastName}</strong></div>
                    <div className="header-userid">User ID: {user?.userId}</div>
                </div>
                <div className="header-right">
                    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? <FiX /> : <FiMenu />} Menu
                    </button>
                    {menuOpen && (
                        <div className="menu-dropdown">
                            <button className="menu-item" onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                                <FiUser /> Profile
                            </button>
                            <button className="menu-item" onClick={() => { navigate('/change-password'); setMenuOpen(false); }}>
                                <FiLock /> Change Password
                            </button>
                            <button className="menu-item" onClick={() => { navigate('/bank-details'); setMenuOpen(false); }}>
                                <FiCreditCard /> Bank Details
                            </button>
                            <button className="menu-item" onClick={() => { navigate('/terms'); setMenuOpen(false); }}>
                                <FiFileText /> Terms & Conditions
                            </button>
                            {user?.isAdmin && (
                                <button className="menu-item" onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
                                    <FiActivity /> Admin Panel
                                </button>
                            )}
                            <div className="menu-divider" />
                            <button className="menu-item" onClick={handleLogout} style={{ color: 'var(--red-400)' }}>
                                <FiLogOut /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* MIDDLE SECTION */}
            <div className="home-content">
                <div className="home-grid">
                    {/* Total Earnings */}
                    <div className="stat-card" onClick={() => navigate('/earnings')} style={{ cursor: 'pointer' }}>
                        <div className="stat-card-label">Total Earnings</div>
                        <div className="stat-card-value purple">₹{(user?.totalEarnings || 0).toFixed(2)}</div>
                    </div>

                    {/* Membership */}
                    <div className="stat-card" onClick={() => navigate('/membership')} style={{ cursor: 'pointer' }}>
                        <div className="stat-card-label">Membership</div>
                        <div className="stat-card-value gold">{getMembershipLabel(user?.membership)}</div>
                    </div>

                    {/* Direct Lines */}
                    <div className="stat-card" onClick={openDirectLines}>
                        <div className="stat-card-label">Direct Lines</div>
                        <div className="stat-card-value cyan">{user?.directReferralCount || 0}</div>
                    </div>

                    {/* Indirect Lines */}
                    <div className="stat-card" onClick={openIndirectLines}>
                        <div className="stat-card-label">Indirect Lines</div>
                        <div className="stat-card-value green">{user?.indirectReferralCount || 0}</div>
                    </div>
                </div>

                {/* Referral Code Section */}
                <div className="referral-card">
                    <div className="referral-header">
                        <div className="referral-title"><FiLink /> Referral Code</div>
                    </div>
                    <div className="referral-userid">
                        Your User ID: <span>{user?.userId}</span>
                    </div>
                    <div className="referral-link-box">
                        <input className="referral-link-input" value={referralData?.referralLink || ''} readOnly />
                        <button className="btn btn-secondary btn-sm" onClick={copyLink}><FiCopy /> Copy</button>
                        <button className="btn btn-primary btn-sm" onClick={shareLink}><FiShare2 /> Share</button>
                    </div>
                </div>

                {/* BOTTOM DASHBOARD */}
                <div className="dashboard-section">
                    <div className="dashboard-title"><FiTrendingUp /> Dashboard</div>
                    <div className="dashboard-grid">
                        <div className="dash-card">
                            <div className="dash-card-icon">💰</div>
                            <div className="dash-card-value" style={{ color: 'var(--green-400)' }}>
                                ₹{(dashData?.totalRevenue || user?.totalEarnings || 0).toFixed(2)}
                            </div>
                            <div className="dash-card-label">Total Revenue</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">👥</div>
                            <div className="dash-card-value" style={{ color: 'var(--cyan-400)' }}>
                                {dashData?.activeUsers || user?.directReferralCount || 0}
                            </div>
                            <div className="dash-card-label">Total Active Users</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">🚫</div>
                            <div className="dash-card-value" style={{ color: 'var(--red-400)' }}>
                                {dashData?.inactiveUsers || 0}
                            </div>
                            <div className="dash-card-label">Total Inactive Users</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">📅</div>
                            <div className="dash-card-value" style={{ color: 'var(--purple-400)' }}>
                                ₹{(dashData?.monthlyEarnings || 0).toFixed(2)}
                            </div>
                            <div className="dash-card-label">Monthly Earnings</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">📊</div>
                            <div className="dash-card-value" style={{ color: 'var(--gold)' }}>
                                ₹{(dashData?.weeklyEarnings || 0).toFixed(2)}
                            </div>
                            <div className="dash-card-label">Weekly Earnings</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DIRECT LINES MODAL */}
            {showDirect && (
                <div className="modal-overlay" onClick={() => setShowDirect(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Direct Lines</div>
                            <button className="modal-close" onClick={() => setShowDirect(false)}>✕</button>
                        </div>
                        {directLines.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No direct referrals yet</p>
                        ) : (
                            <ul className="lines-list">
                                {directLines.map((u) => (
                                    <li key={u.userId} className="lines-item">
                                        <div>
                                            <div className="lines-name">{u.firstName} {u.lastName}</div>
                                        </div>
                                        <div className="lines-id">{u.userId}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* INDIRECT LINES MODAL */}
            {showIndirect && (
                <div className="modal-overlay" onClick={() => setShowIndirect(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Indirect Lines</div>
                            <button className="modal-close" onClick={() => setShowIndirect(false)}>✕</button>
                        </div>
                        {indirectLines.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No indirect referrals yet</p>
                        ) : (
                            <ul className="lines-list">
                                {indirectLines.map((u, i) => (
                                    <li key={i} className="lines-item">
                                        <div>
                                            <div className="lines-name">{u.firstName} {u.lastName}</div>
                                            <div className="lines-upline">Upline: {u.uplineName} ({u.uplineId})</div>
                                        </div>
                                        <div className="lines-id">{u.userId}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
