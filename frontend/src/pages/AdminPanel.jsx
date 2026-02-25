import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiActivity, FiUsers, FiCheckCircle, FiXCircle, FiUserCheck, FiUserX, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function AdminPanel() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('dashboard');
    const [dashData, setDashData] = useState(null);
    const [users, setUsers] = useState([]);
    const [approvals, setApprovals] = useState({ pendingMemberships: [], pendingWithdrawals: [] });
    const [lines, setLines] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [inactiveUsers, setInactiveUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadTabData(tab); }, [tab]);

    const loadTabData = async (currentTab) => {
        try {
            if (currentTab === 'dashboard') {
                const res = await API.get('/admin/dashboard');
                setDashData(res.data);
            } else if (currentTab === 'users') {
                const res = await API.get('/admin/users');
                setUsers(Array.isArray(res.data) ? res.data : []);
            } else if (currentTab === 'approvals') {
                const res = await API.get('/admin/approvals');
                const data = res.data || {};
                setApprovals({
                    pendingMemberships: Array.isArray(data.pendingMemberships) ? data.pendingMemberships : [],
                    pendingWithdrawals: Array.isArray(data.pendingWithdrawals) ? data.pendingWithdrawals : []
                });
            } else if (currentTab === 'lines') {
                const res = await API.get('/admin/lines');
                setLines(Array.isArray(res.data) ? res.data : []);
            } else if (currentTab === 'active') {
                const res = await API.get('/admin/active-users');
                setActiveUsers(Array.isArray(res.data) ? res.data : []);
            } else if (currentTab === 'inactive') {
                const res = await API.get('/admin/inactive-users');
                setInactiveUsers(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to load data';
            toast.error(msg);
            console.error('Admin Fetch Error:', err);
        }
    };

    const approveMembership = async (userId, action) => {
        setLoading(true);
        try {
            await API.post('/admin/approve-membership', { userId, action });
            toast.success(`Membership ${action}d for ${userId}`);
            loadTabData('approvals');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        setLoading(false);
    };

    const approveWithdrawal = async (transactionId, action, forcedMode = null) => {
        let mode = forcedMode;

        if (action === 'approve' && !mode) {
            const choice = window.confirm(
                "How would you like to approve this withdrawal?\n\n" +
                "Click OK for AUTOMATED BANK TRANSFER (via Cashfree)\n" +
                "Click CANCEL for MANUAL TRANSFER (already sent via PhonePe/GPay)"
            );
            mode = choice ? 'auto' : 'manual';
        }

        const note = window.prompt(`Enter a note for this ${action}:`) || '';
        if (action === 'reject' && !note) {
            return toast.error('Please provide a reason for rejection.');
        }

        setLoading(true);
        try {
            await API.post('/admin/approve-withdrawal', {
                transactionId,
                action,
                adminNote: note,
                mode: mode
            });
            toast.success(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}`);
            loadTabData('approvals');
        } catch (err) {
            const data = err.response?.data;
            if (data?.canManual) {
                if (window.confirm(`${data.message}\n\nWould you like to approve MANUALLY instead? (Choose this ONLY if you have already sent the money via UPI manually)`)) {
                    approveWithdrawal(transactionId, 'approve', 'manual');
                }
            } else {
                toast.error(data?.message || 'Action failed');
            }
        }
        setLoading(false);
    };

    const resetBalance = async () => {
        setLoading(true);
        try {
            const res = await API.post('/admin/reset-my-balance');
            toast.success(res.data.message);
            loadTabData('dashboard');
        } catch (err) { toast.error('Failed'); }
        setLoading(false);
    };

    const deactivateInactive = async () => {
        try {
            const res = await API.post('/admin/deactivate-inactive');
            toast.success(res.data.message);
            loadTabData('dashboard');
        } catch (err) { toast.error('Failed'); }
    };

    return (
        <div className="admin-wrapper page-wrapper">
            {/* ADMIN HEADER */}
            <header className="app-header">
                <div className="header-left">
                    <div className="header-brand">ADMIN CONTROL</div>
                    <div className="header-welcome">Hello, <strong>{user?.firstName}</strong></div>
                </div>
                <div className="header-right">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')}>
                        <FiArrowLeft /> BACK TO HOME
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={deactivateInactive} title="Deactivate users inactive for 30+ days">
                        <FiUserX /> CLEAN INACTIVE
                    </button>
                </div>
            </header>

            <div className="admin-content">
                <div className="admin-tabs-scroller">
                    <div className="admin-tabs">
                        {['dashboard', 'users', 'approvals', 'lines', 'active', 'inactive'].map(t => (
                            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* DASHBOARD TAB */}
                {tab === 'dashboard' && dashData && (
                    <div className="admin-dashboard-view">
                        <div className="dash-summary-cards">
                            <div className="summary-card gold">
                                <div className="card-label">TOTAL REVENUE</div>
                                <div className="card-value">₹{(dashData.totalRevenue || 0).toFixed(2)}</div>
                            </div>
                            <div className="summary-card cyan">
                                <div className="card-label">TOTAL USERS</div>
                                <div className="card-value">{dashData.totalUsers}</div>
                            </div>
                            <div className="summary-card green">
                                <div className="card-label">ACTIVE USERS</div>
                                <div className="card-value">{dashData.activeUsers}</div>
                            </div>
                            <div className="summary-card red">
                                <div className="card-label">INACTIVE USERS</div>
                                <div className="card-value">{dashData.inactiveUsers}</div>
                            </div>
                        </div>

                        <div className="dash-lines-report" style={{ marginTop: 24 }}>
                            <h3 className="section-header">NETWORK PERFORMANCE</h3>
                            <div className="report-grid">
                                <div className="report-box purple">
                                    <div className="report-value">{dashData.totalDirectLines || 0}</div>
                                    <div className="report-label">Direct Lines Active</div>
                                </div>
                                <div className="report-box magenta">
                                    <div className="report-value">{dashData.totalIndirectLines || 0}</div>
                                    <div className="report-label">Indirect Lines Active</div>
                                </div>
                                <div className="report-box cyan">
                                    <div className="report-value">₹{(dashData.monthlyEarnings || 0).toFixed(2)}</div>
                                    <div className="report-label">Monthly Velocity</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <button className="btn btn-outline btn-sm" onClick={resetBalance}>
                                ⚠️ TEST: REFUND ALL WITHDRAWALS
                            </button>
                        </div>
                    </div>
                )}

                {/* ALL USERS TAB */}
                {tab === 'users' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead>
                                <tr>
                                    <th>USER ID</th>
                                    <th>NAME</th>
                                    <th>CONTACT INFO</th>
                                    <th>SECURITY</th>
                                    <th>WALLET</th>
                                    <th>RANK</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.userId}>
                                        <td className="id-cell">{u.userId}</td>
                                        <td className="name-cell">{u.firstName} {u.lastName}</td>
                                        <td>
                                            <div className="info-sub">{u.email}</div>
                                            <div className="info-sub">{u.phone}</div>
                                        </td>
                                        <td>
                                            <div className="secure-badge">PASSPHRASE: [ENCRYPTED]</div>
                                        </td>
                                        <td className="wallet-cell">₹{(u.walletBalance || 0).toFixed(2)}</td>
                                        <td><span className={`rank-tag ${u.membership}`}>{u.membership.toUpperCase()}</span></td>
                                        <td>
                                            <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                                            {u.isActive ? 'Active' : 'Deactivated'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* APPROVALS TAB */}
                {tab === 'approvals' && (
                    <div className="approvals-view">
                        <div className="approval-section">
                            <h3 className="section-header purple">MEMBERSHIP REQUESTS ({approvals.pendingMemberships.length})</h3>
                            {approvals.pendingMemberships.length === 0 ? <p className="empty-msg">No pending requests</p> : (
                                <div className="approval-list">
                                    {approvals.pendingMemberships.map(u => (
                                        <div key={u.userId} className="luxury-approval-card">
                                            <div className="l-info">
                                                <div className="l-name">{u.firstName} {u.lastName} (ID: {u.userId})</div>
                                                <div className="l-change">{u.membership.toUpperCase()} → <span className="target">{u.pendingMembership.toUpperCase()}</span></div>
                                                <div className="l-txn">REF: {u.pendingTransactionId}</div>
                                            </div>
                                            <div className="l-actions">
                                                <button className="btn btn-success" onClick={() => approveMembership(u.userId, 'approve')} disabled={loading}>APPROVE</button>
                                                <button className="btn btn-danger" onClick={() => approveMembership(u.userId, 'reject')} disabled={loading}>REJECT</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="approval-section" style={{ marginTop: 32 }}>
                            <h3 className="section-header green">WITHDRAWAL REQUESTS ({approvals.pendingWithdrawals.length})</h3>
                            {approvals.pendingWithdrawals.length === 0 ? <p className="empty-msg">No pending withdrawals</p> : (
                                <div className="approval-list">
                                    {approvals.pendingWithdrawals.map(t => (
                                        <div key={t._id} className="luxury-approval-card">
                                            <div className="l-info">
                                                <div className="l-name">{t.user?.firstName} {t.user?.lastName} (ID: {t.userId})</div>
                                                <div className="l-amount">₹{t.amount.toFixed(2)}</div>
                                                {t.bankDetails && (
                                                    <div className="l-bank-summary">
                                                        <div>{t.bankDetails.bankName} - {t.bankDetails.accountNumber}</div>
                                                        {t.bankDetails.upiId && <div className="upi">UPI: {t.bankDetails.upiId}</div>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="l-actions">
                                                <button className="btn btn-success" onClick={() => approveWithdrawal(t._id, 'approve')} disabled={loading}>APPROVE</button>
                                                <button className="btn btn-danger" onClick={() => approveWithdrawal(t._id, 'reject')} disabled={loading}>REJECT</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ALL LINES TAB */}
                {tab === 'lines' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead>
                                <tr>
                                    <th>USER ID</th>
                                    <th>NAME</th>
                                    <th>REFERRER</th>
                                    <th>DIRECTS</th>
                                    <th>INDIRECTS</th>
                                    <th>TEAM ROSTER</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map(u => (
                                    <tr key={u.userId}>
                                        <td className="id-cell">{u.userId}</td>
                                        <td>{u.firstName} {u.lastName}</td>
                                        <td>{u.referredBy || 'PLATFORM'}</td>
                                        <td>{u.directReferralCount}</td>
                                        <td>{u.indirectReferralCount}</td>
                                        <td>
                                            <div className="team-roster">
                                                {u.directReferrals?.map(r => (
                                                    <span key={r.userId} className="roster-item">{r.firstName} ({r.userId})</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ACTIVE TAB */}
                {tab === 'active' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead><tr><th>USER ID</th><th>NAME</th><th>RANK</th></tr></thead>
                            <tbody>
                                {activeUsers.map(u => (
                                    <tr key={u.userId}>
                                        <td className="id-cell">{u.userId}</td>
                                        <td>{u.firstName} {u.lastName}</td>
                                        <td><span className={`rank-tag ${u.membership}`}>{u.membership.toUpperCase()}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* INACTIVE TAB */}
                {tab === 'inactive' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead><tr><th>USER ID</th><th>NAME</th><th>RANK</th><th>LAST SEEN</th></tr></thead>
                            <tbody>
                                {inactiveUsers.map(u => (
                                    <tr key={u.userId}>
                                        <td className="id-cell">{u.userId}</td>
                                        <td>{u.firstName} {u.lastName}</td>
                                        <td><span className={`rank-tag ${u.membership}`}>{u.membership.toUpperCase()}</span></td>
                                        <td>{new Date(u.lastActiveDate).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
