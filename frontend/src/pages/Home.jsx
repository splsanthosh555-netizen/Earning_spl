import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

    // Wallet & Withdraw state
    const [earnings, setEarnings] = useState(null);
    const [bankDetails, setBankDetails] = useState(null);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [recentWithdrawals, setRecentWithdrawals] = useState([]);

    useEffect(() => {
        refreshUser();
        fetchReferral();
        fetchDashboard();
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const [earningsRes, bankRes, historyRes] = await Promise.all([
                API.get('/earnings/total'),
                API.get('/user/bank-details').catch(() => ({ data: null })),
                API.get('/earnings/history')
            ]);
            setEarnings(earningsRes.data);
            if (bankRes.data && (bankRes.data.accountNumber || bankRes.data.upiId)) {
                setBankDetails(bankRes.data);
            }
            // Show only last 3 withdrawal transactions
            const historyData = Array.isArray(historyRes.data) ? historyRes.data : [];
            const withdrawals = historyData.filter(t => t.type === 'withdrawal').slice(0, 3);
            setRecentWithdrawals(withdrawals);
        } catch (err) { }
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < 100) return toast.error('Minimum withdrawal is ₹100');
        if (!bankDetails) return toast.error('Please add Bank/UPI details first');

        setWithdrawLoading(true);
        try {
            await API.post('/earnings/withdraw', { amount });
            toast.success('Withdrawal request submitted!');
            setWithdrawAmount('');
            fetchWalletData();
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Withdrawal failed');
        }
        setWithdrawLoading(false);
    };

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
            setDirectLines(Array.isArray(res.data) ? res.data : []);
            setShowDirect(true);
        } catch (err) { toast.error('Failed to load'); }
    };

    const openIndirectLines = async () => {
        try {
            const res = await API.get('/referral/indirect');
            setIndirectLines(Array.isArray(res.data) ? res.data : []);
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
        <div className="page-wrapper dashboard-theme">
            {/* HEADER SECTION */}
            <header className="app-header">
                <div className="header-left">
                    <div className="header-brand">SPL-EARNINGS</div>
                    <div className="header-welcome">Welcome, <strong>{user?.firstName} {user?.lastName}</strong></div>
                    <div className="header-userid">(USER ID: {user?.userId})</div>
                </div>
                <div className="header-right">
                    <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                        <FiMenu /> <span>MENU BAR</span>
                    </button>
                    {menuOpen && (
                        <div className="menu-dropdown">
                            <button className="menu-item" onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                                <FiUser /> PROFILE
                            </button>
                            <button className="menu-item" onClick={() => { navigate('/change-password'); setMenuOpen(false); }}>
                                <FiLock /> CHANGE PASSWORD
                            </button>
                            <button className="menu-item" onClick={() => { navigate('/bank-details'); setMenuOpen(false); }}>
                                <FiCreditCard /> BANK DETAILS
                            </button>
                            <button className="menu-item" onClick={() => { navigate('/terms'); setMenuOpen(false); }}>
                                <FiFileText /> TERMS & CONDITIONS
                            </button>
                            {user?.isAdmin && (
                                <button className="menu-item" onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
                                    <FiActivity /> ADMIN PANEL
                                </button>
                            )}
                            <div className="menu-divider" />
                            <button className="menu-item" onClick={handleLogout} style={{ color: 'var(--red-400)' }}>
                                <FiLogOut /> LOGOUT
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* MIDDLE SECTION */}
            <div className="home-content">
                <div className="stats-main-grid">
                    {/* Total Earnings */}
                    <div className="hero-stat-card" onClick={() => navigate('/earnings')}>
                        <div className="hero-stat-label">TOTAL EARNINGS</div>
                        <div className="hero-stat-value">₹{(user?.totalEarnings || 0).toFixed(2)}</div>
                        <div className="hero-stat-sub">Click to view history</div>
                    </div>

                    {/* Referral Link Card */}
                    <div className="referral-box-card">
                        <div className="ref-title"><FiLink /> REFERRAL CODE</div>
                        <div className="ref-id-display">Your Code: <span>{user?.userId}</span></div>
                        <div className="ref-link-actions">
                            <button className="btn btn-secondary btn-sm" onClick={copyLink}><FiCopy /> Copy Link</button>
                            <button className="btn btn-primary btn-sm" onClick={shareLink}><FiShare2 /> Share</button>
                        </div>
                    </div>
                </div>

                <div className="home-action-grid">
                    {/* Direct Lines */}
                    <div className="action-pill cyan" onClick={openDirectLines}>
                        <div className="pill-icon"><FiUsers /></div>
                        <div className="pill-content">
                            <div className="pill-label">Direct lines</div>
                            <div className="pill-value">{user?.directReferralCount || 0}</div>
                        </div>
                    </div>

                    {/* Indirect Lines */}
                    <div className="action-pill purple" onClick={openIndirectLines}>
                        <div className="pill-icon"><FiTrendingUp /></div>
                        <div className="pill-content">
                            <div className="pill-label">Indirect lines</div>
                            <div className="pill-value">{user?.indirectReferralCount || 0}</div>
                        </div>
                    </div>

                    {/* Membership */}
                    <div className="action-pill gold" onClick={() => navigate('/membership')}>
                        <div className="pill-icon"><FiAward /></div>
                        <div className="pill-content">
                            <div className="pill-label">Membership</div>
                            <div className="pill-value">{getMembershipLabel(user?.membership)}</div>
                        </div>
                    </div>
                </div>

                {/* WALLET & WITHDRAW CONTROL */}
                <div className="withdraw-control-panel">
                    <div className="panel-header">
                        <FiDollarSign /> Wallet Balance & Withdraw
                    </div>
                    <div className="panel-body">
                        <div className="wallet-vitals">
                            <div className="vital-label">Current Balance</div>
                            <div className="vital-value">₹{(user?.walletBalance || 0).toFixed(2)}</div>
                        </div>

                        <div className="withdraw-input-row">
                            <input
                                className="form-input"
                                type="number"
                                placeholder="Min ₹100"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                            />
                            <button
                                className="btn btn-success"
                                onClick={handleWithdraw}
                                disabled={withdrawLoading || user?.walletBalance < 100}
                            >
                                {withdrawLoading ? '...' : (user?.walletBalance >= 100 ? 'Withdraw' : 'Low Balance')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION (DASHBOARD) */}
                <div className="dashboard-grid-container">
                    <h3 className="section-header">PLATFORM DASHBOARD</h3>
                    <div className="dashboard-grid">
                        <div className="dash-box">
                            <div className="dash-icon"><FiDollarSign /></div>
                            <div className="dash-label">Total revenue</div>
                            <div className="dash-value">₹{(dashData?.totalRevenue || 0).toFixed(2)}</div>
                        </div>
                        <div className="dash-box">
                            <div className="dash-icon"><FiUserCheck /></div>
                            <div className="dash-label">Total active users</div>
                            <div className="dash-value">{dashData?.activeUsers || 0}</div>
                        </div>
                        <div className="dash-box">
                            <div className="dash-icon"><FiUserX /></div>
                            <div className="dash-label">Total inactive users</div>
                            <div className="dash-value">{dashData?.inactiveUsers || 0}</div>
                        </div>
                        <div className="dash-box">
                            <div className="dash-icon"><FiCalendar /></div>
                            <div className="dash-label">Total monthly earnings</div>
                            <div className="dash-value">₹{(dashData?.monthlyEarnings || 0).toFixed(2)}</div>
                        </div>
                        <div className="dash-box">
                            <div className="dash-icon"><FiActivity /></div>
                            <div className="dash-label">Total weekly earnings</div>
                            <div className="dash-value">₹{(dashData?.weeklyEarnings || 0).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MINI PAGES (MODALS) */}
            {showDirect && (
                <div className="mini-page-overlay" onClick={() => setShowDirect(false)}>
                    <div className="mini-page" onClick={(e) => e.stopPropagation()}>
                        <div className="mini-page-header">
                            <h4>Direct Referrals</h4>
                            <button onClick={() => setShowDirect(false)}>✕</button>
                        </div>
                        <div className="mini-page-body">
                            {directLines.length === 0 ? <p className="empty-msg">No entries found</p> : (
                                <table className="lines-table">
                                    <thead>
                                        <tr><th>User Name</th><th>User ID</th></tr>
                                    </thead>
                                    <tbody>
                                        {directLines.map(u => (
                                            <tr key={u.userId}>
                                                <td>{u.firstName} {u.lastName}</td>
                                                <td>{u.userId}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showIndirect && (
                <div className="mini-page-overlay" onClick={() => setShowIndirect(false)}>
                    <div className="mini-page" onClick={(e) => e.stopPropagation()}>
                        <div className="mini-page-header">
                            <h4>Indirect Referrals</h4>
                            <button onClick={() => setShowIndirect(false)}>✕</button>
                        </div>
                        <div className="mini-page-body">
                            {indirectLines.length === 0 ? <p className="empty-msg">No entries found</p> : (
                                <table className="lines-table">
                                    <thead>
                                        <tr><th>User Name</th><th>User ID</th><th>Upline ID</th></tr>
                                    </thead>
                                    <tbody>
                                        {indirectLines.map((u, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="u-name">{u.firstName} {u.lastName}</div>
                                                    <div className="u-upline">{u.uplineName}</div>
                                                </td>
                                                <td>{u.userId}</td>
                                                <td>{u.uplineId}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
