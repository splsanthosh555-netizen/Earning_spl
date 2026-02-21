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

                    {/* Wallet Balance */}
                    <div className="stat-card" style={{ cursor: 'default' }}>
                        <div className="stat-card-label">👛 Wallet Balance</div>
                        <div className="stat-card-value cyan">₹{(earnings?.walletBalance || user?.walletBalance || 0).toFixed(2)}</div>
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

                {/* ========== WALLET & WITHDRAW SECTION ========== */}
                <div className="wallet-withdraw-section" style={{
                    background: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(168,85,247,0.08))',
                    border: '1px solid rgba(34,211,238,0.2)',
                    borderRadius: 16,
                    padding: '24px',
                    marginBottom: 24
                }}>
                    <h3 style={{
                        fontSize: 18, fontWeight: 800, marginBottom: 16,
                        fontFamily: 'var(--font-display)',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <FiDollarSign /> Wallet & Withdraw
                    </h3>

                    {/* Wallet Balance Display */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '16px 20px',
                        marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Available Balance</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cyan-400)', fontFamily: 'var(--font-display)' }}>
                                ₹{(earnings?.walletBalance || user?.walletBalance || 0).toFixed(2)}
                            </div>
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate('/earnings')}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            <FiTrendingUp /> View History
                        </button>
                    </div>

                    {/* Bank/UPI Details */}
                    {bankDetails ? (
                        <div style={{
                            fontSize: 13, color: 'var(--cyan-400)', marginBottom: 16,
                            background: 'rgba(34, 211, 238, 0.08)', padding: '12px 16px',
                            borderRadius: 10, border: '1px solid rgba(34, 211, 238, 0.15)'
                        }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, marginBottom: 4 }}>
                                💳 Withdrawal Destination:
                            </span>
                            <strong>{bankDetails.upiId ? `UPI: ${bankDetails.upiId}` : `${bankDetails.bankName} - A/C: ${bankDetails.accountNumber}`}</strong>
                            <button
                                onClick={() => navigate('/bank-details')}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--purple-400)',
                                    fontSize: 11, cursor: 'pointer', marginLeft: 8, textDecoration: 'underline'
                                }}
                            >Change</button>
                        </div>
                    ) : (
                        <div style={{
                            marginBottom: 16, padding: '14px 16px',
                            background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10,
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <p style={{ color: 'var(--red-400)', fontSize: 13, marginBottom: 6 }}>
                                ⚠️ No payment details found
                            </p>
                            <Link to="/bank-details" style={{
                                color: 'var(--cyan-400)', fontSize: 13, fontWeight: 600,
                                textDecoration: 'underline'
                            }}>
                                Add Bank Account or UPI ID to enable withdrawal →
                            </Link>
                        </div>
                    )}

                    {/* Withdraw Input */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            className="form-input"
                            type="number"
                            placeholder="Enter amount (min ₹100)"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            style={{ flex: 1 }}
                            id="home-withdraw-amount"
                        />
                        <button
                            className="btn btn-success"
                            onClick={handleWithdraw}
                            disabled={withdrawLoading || !bankDetails || !(earnings?.canWithdraw)}
                            style={{ whiteSpace: 'nowrap', padding: '10px 20px' }}
                            id="home-withdraw-btn"
                        >
                            {withdrawLoading ? '⏳ Processing...' : '💸 Withdraw'}
                        </button>
                    </div>

                    {!(earnings?.canWithdraw) && (
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                            Minimum balance of ₹100 required to withdraw
                        </p>
                    )}

                    {/* Recent Withdrawal Status */}
                    {recentWithdrawals.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                                Recent Withdrawals:
                            </div>
                            {recentWithdrawals.map((t) => (
                                <div key={t._id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderRadius: 8,
                                    background: 'rgba(0,0,0,0.2)', marginBottom: 6,
                                    border: '1px solid rgba(255,255,255,0.04)'
                                }}>
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>₹{t.amount.toFixed(2)}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                                            {new Date(t.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                        padding: '2px 8px', borderRadius: 4,
                                        color: t.status === 'approved' || t.status === 'completed' ? 'var(--green-400)' :
                                            t.status === 'pending' ? 'var(--yellow-400)' : 'var(--red-400)',
                                        background: t.status === 'approved' || t.status === 'completed' ? 'rgba(74,222,128,0.1)' :
                                            t.status === 'pending' ? 'rgba(250,204,21,0.1)' : 'rgba(248,113,113,0.1)'
                                    }}>
                                        {t.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
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
