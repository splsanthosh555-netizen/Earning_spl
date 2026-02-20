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
                setUsers(res.data);
            } else if (currentTab === 'approvals') {
                const res = await API.get('/admin/approvals');
                setApprovals(res.data);
            } else if (currentTab === 'lines') {
                const res = await API.get('/admin/lines');
                setLines(res.data);
            } else if (currentTab === 'active') {
                const res = await API.get('/admin/active-users');
                setActiveUsers(res.data);
            } else if (currentTab === 'inactive') {
                const res = await API.get('/admin/inactive-users');
                setInactiveUsers(res.data);
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

    const approveWithdrawal = async (transactionId, action) => {
        const note = window.prompt(`Enter a note for this ${action}:`) || '';
        if (action === 'reject' && !note) {
            return toast.error('Please provide a reason for rejection.');
        }

        if (!window.confirm(`Are you sure you want to ${action} this ₹ withdrawal?`)) return;

        setLoading(true);
        try {
            await API.post('/admin/approve-withdrawal', { transactionId, action, adminNote: note });
            toast.success(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}`);
            loadTabData('approvals');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
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
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }} className="animate-fade-up">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                <FiActivity /> Admin Panel
            </h2>

            <div className="admin-tabs">
                {['dashboard', 'users', 'approvals', 'lines', 'active', 'inactive'].map(t => (
                    <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        {t === 'dashboard' ? '📊 Dashboard' : t === 'users' ? '👥 All Users' :
                            t === 'approvals' ? '✅ Approvals' : t === 'lines' ? '🔗 All Lines' :
                                t === 'active' ? '🟢 Active' : '🔴 Inactive'}
                    </button>
                ))}
            </div>

            {/* DASHBOARD TAB */}
            {tab === 'dashboard' && dashData && (
                <div>
                    <div className="dashboard-grid">
                        <div className="dash-card">
                            <div className="dash-card-icon">💰</div>
                            <div className="dash-card-value" style={{ color: 'var(--green-400)' }}>₹{(dashData.totalRevenue || 0).toFixed(2)}</div>
                            <div className="dash-card-label">Total Revenue</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">👥</div>
                            <div className="dash-card-value" style={{ color: 'var(--cyan-400)' }}>{dashData.totalUsers}</div>
                            <div className="dash-card-label">Total Users</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">🟢</div>
                            <div className="dash-card-value" style={{ color: 'var(--green-400)' }}>{dashData.activeUsers}</div>
                            <div className="dash-card-label">Active Users</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">🔴</div>
                            <div className="dash-card-value" style={{ color: 'var(--red-400)' }}>{dashData.inactiveUsers}</div>
                            <div className="dash-card-label">Inactive Users</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">📅</div>
                            <div className="dash-card-value" style={{ color: 'var(--purple-400)' }}>₹{(dashData.monthlyEarnings || 0).toFixed(2)}</div>
                            <div className="dash-card-label">Monthly Earnings</div>
                        </div>
                        <div className="dash-card">
                            <div className="dash-card-icon">📊</div>
                            <div className="dash-card-value" style={{ color: 'var(--gold)' }}>₹{(dashData.weeklyEarnings || 0).toFixed(2)}</div>
                            <div className="dash-card-label">Weekly Earnings</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                        <button className="btn btn-danger btn-sm" onClick={deactivateInactive}>
                            Deactivate 30+ Day Inactive Users
                        </button>
                        <button className="btn btn-warning btn-sm" onClick={resetBalance}>
                            ⚠️ TEST: Reset My Balance (Refund Withdrawals)
                        </button>
                    </div>
                </div>
            )}

            {/* ALL USERS TAB */}
            {tab === 'users' && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User ID</th><th>Name</th><th>Email</th><th>Phone</th>
                                <th>Membership</th><th>Wallet</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.userId}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--cyan-400)' }}>{u.userId}</td>
                                    <td>{u.firstName} {u.lastName}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{u.membership}</td>
                                    <td style={{ fontFamily: 'monospace' }}>₹{(u.walletBalance || 0).toFixed(2)}</td>
                                    <td>{u.isActive ?
                                        <span style={{ color: 'var(--green-400)' }}>Active</span> :
                                        <span style={{ color: 'var(--red-400)' }}>Inactive</span>
                                    }</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* APPROVALS TAB */}
            {tab === 'approvals' && (
                <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--purple-400)' }}>
                        Membership Approvals ({approvals.pendingMemberships.length})
                    </h3>
                    {approvals.pendingMemberships.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>No pending memberships</p>
                    ) : (
                        approvals.pendingMemberships.map(u => (
                            <div key={u.userId} className="approval-card">
                                <div className="approval-info">
                                    <div style={{ fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        ID: {u.userId} | Current: {u.membership} → {u.pendingMembership}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--cyan-400)', fontFamily: 'monospace' }}>
                                        TXN: {u.pendingTransactionId}
                                    </div>
                                </div>
                                <div className="approval-actions">
                                    <button className="btn btn-success btn-sm" disabled={loading}
                                        onClick={() => approveMembership(u.userId, 'approve')}>
                                        <FiCheckCircle /> Approve
                                    </button>
                                    <button className="btn btn-danger btn-sm" disabled={loading}
                                        onClick={() => approveMembership(u.userId, 'reject')}>
                                        <FiXCircle /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 24, color: 'var(--green-400)' }}>
                        Withdrawal Approvals ({approvals.pendingWithdrawals.length})
                    </h3>
                    {approvals.pendingWithdrawals.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No pending withdrawals</p>
                    ) : (
                        approvals.pendingWithdrawals.map(t => (
                            <div key={t._id} className="approval-card">
                                <div className="approval-info">
                                    <div style={{ fontWeight: 700 }}>{t.user?.firstName} {t.user?.lastName}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        ID: {t.userId} | Amount: ₹{t.amount.toFixed(2)}
                                    </div>
                                    {t.bankDetails && (
                                        <div style={{
                                            fontSize: 12, background: 'rgba(255,255,255,0.05)',
                                            padding: '6px 10px', borderRadius: 6, margin: '8px 0',
                                            border: '1px solid var(--border-glass)'
                                        }}>
                                            {t.bankDetails.upiId ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>
                                                        UPI ID: {t.bankDetails.upiId}
                                                    </div>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(t.bankDetails.upiId);
                                                            toast.success('UPI ID copied!');
                                                        }}
                                                        title="Copy UPI ID"
                                                    >
                                                        <FiCopy size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{ color: 'var(--text-muted)' }}>
                                                        <span style={{ color: 'var(--text-main)' }}>Bank: {t.bankDetails.bankName}</span><br />
                                                        A/C: {t.bankDetails.accountNumber} | IFSC: {t.bankDetails.ifscCode}
                                                    </div>
                                                    <button
                                                        className="btn-icon"
                                                        style={{ position: 'absolute', top: 0, right: 0 }}
                                                        onClick={() => {
                                                            const text = `A/C: ${t.bankDetails.accountNumber}, IFSC: ${t.bankDetails.ifscCode}`;
                                                            navigator.clipboard.writeText(text);
                                                            toast.success('Account details copied!');
                                                        }}
                                                        title="Copy Bank Details"
                                                    >
                                                        <FiCopy size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(t.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="approval-actions">
                                    <button className="btn btn-success btn-sm" disabled={loading}
                                        onClick={() => approveWithdrawal(t._id, 'approve')}>
                                        <FiCheckCircle /> Approve
                                    </button>
                                    <button className="btn btn-danger btn-sm" disabled={loading}
                                        onClick={() => approveWithdrawal(t._id, 'reject')}>
                                        <FiXCircle /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ALL LINES TAB */}
            {tab === 'lines' && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User ID</th><th>Name</th><th>Referred By</th>
                                <th>Direct</th><th>Indirect</th><th>Direct Referrals</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map(u => (
                                <tr key={u.userId}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--cyan-400)' }}>{u.userId}</td>
                                    <td>{u.firstName} {u.lastName}</td>
                                    <td>{u.referredBy || '-'}</td>
                                    <td>{u.directReferralCount}</td>
                                    <td>{u.indirectReferralCount}</td>
                                    <td>
                                        {u.directReferrals?.map(r => (
                                            <span key={r.userId} style={{
                                                display: 'inline-block', padding: '2px 8px', background: 'var(--bg-glass)',
                                                borderRadius: 4, margin: 2, fontSize: 12
                                            }}>
                                                {r.firstName} ({r.userId})
                                            </span>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ACTIVE USERS TAB */}
            {tab === 'active' && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead><tr><th>User ID</th><th>Name</th><th>Membership</th></tr></thead>
                        <tbody>
                            {activeUsers.map(u => (
                                <tr key={u.userId}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--cyan-400)' }}>{u.userId}</td>
                                    <td>{u.firstName} {u.lastName}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{u.membership}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* INACTIVE USERS TAB */}
            {tab === 'inactive' && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead><tr><th>User ID</th><th>Name</th><th>Membership</th><th>Last Active</th></tr></thead>
                        <tbody>
                            {inactiveUsers.map(u => (
                                <tr key={u.userId}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--cyan-400)' }}>{u.userId}</td>
                                    <td>{u.firstName} {u.lastName}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{u.membership}</td>
                                    <td>{new Date(u.lastActiveDate).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
