import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiActivity, FiUsers, FiCheckCircle, FiXCircle, FiUserCheck, FiUserX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function AdminPanel() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Enforce specific Admin ID access ONLY
        if (!user || !user.isAdmin || user.userId !== 1135841) {
            toast.error('Restricted Area: Access Denied');
            navigate('/home');
        }
    }, [user, navigate]);

    const [tab, setTab] = useState('dashboard');
    const [dashData, setDashData] = useState(null);
    const [users, setUsers] = useState([]);
    const [approvals, setApprovals] = useState({ pendingMemberships: [], pendingWithdrawals: [] });
    const [lines, setLines] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [inactiveUsers, setInactiveUsers] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingIds, setProcessingIds] = useState(new Set()); // per-card loading
    const [rejectNote, setRejectNote] = useState('');
    const [rejectTarget, setRejectTarget] = useState(null);

    const isProcessing = (id) => processingIds.has(String(id));
    const addProcessing = (id) => setProcessingIds(prev => new Set([...prev, String(id)]));
    const removeProcessing = (id) => setProcessingIds(prev => { const s = new Set(prev); s.delete(String(id)); return s; });

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
            } else if (currentTab === 'history') {
                const res = await API.get('/admin/transactions?type=withdrawal&status=completed,rejected');
                setHistory(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load data');
        }
    };

    const approveMembership = async (userId, action) => {
        if (isProcessing(userId)) return;
        addProcessing(userId);
        try {
            await API.post('/admin/approve-membership', { userId, action });
            toast.success(`Membership ${action === 'approve' ? 'approved ✅' : 'rejected ❌'} for User ${userId}`);
            // Optimistically remove from list
            setApprovals(prev => ({
                ...prev,
                pendingMemberships: prev.pendingMemberships.filter(u => u.userId !== userId)
            }));
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed';
            if (msg.toLowerCase().includes('already')) {
                // Already processed — just refresh
                loadTabData('approvals');
            } else {
                toast.error(msg);
            }
        }
        removeProcessing(userId);
    };

    // Manual approval — no popup, just approve directly
    const approveWithdrawal = async (transactionId, action) => {
        if (isProcessing(transactionId)) return; // prevent double click

        if (action === 'reject' && !rejectNote) {
            setRejectTarget(transactionId);
            return;
        }

        addProcessing(transactionId);
        try {
            await API.post('/admin/approve-withdrawal', {
                transactionId,
                action,
                adminNote: rejectNote || 'Approved by admin',
                mode: 'manual'
            });
            toast.success(action === 'approve' ? '✅ Withdrawal approved! Money deducted from wallet.' : '❌ Withdrawal rejected.');
            setRejectNote('');
            setRejectTarget(null);
            // Optimistically remove from list — no need to re-fetch
            setApprovals(prev => ({
                ...prev,
                pendingWithdrawals: prev.pendingWithdrawals.filter(t => String(t._id) !== String(transactionId))
            }));
        } catch (err) {
            const msg = err.response?.data?.message || 'Action failed';
            if (msg.toLowerCase().includes('already processed')) {
                toast.success('Already processed — refreshing list.');
                loadTabData('approvals'); // just refresh, no error
            } else {
                toast.error(msg);
            }
        }
        removeProcessing(transactionId);
    };

    const deactivateInactive = async () => {
        if (!window.confirm('This will mark all users inactive for 30+ days. Continue?')) return;
        try {
            const res = await API.post('/admin/deactivate-inactive');
            toast.success(res.data.message);
            loadTabData('dashboard');
        } catch (err) { toast.error('Failed'); }
    };

    const TABS = [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'approvals', label: '✅ Approvals' },
        { id: 'users', label: '👥 All Users' },
        { id: 'lines', label: '🔗 Lines' },
        { id: 'active', label: '🟢 Active' },
        { id: 'inactive', label: '🔴 Inactive' },
        { id: 'history', label: '📜 History' },
    ];

    return (
        <div className="admin-wrapper page-wrapper">
            {/* HEADER */}
            <header className="app-header">
                <div className="header-left">
                    <div className="header-brand">⚙️ ADMIN PANEL</div>
                    <div className="header-welcome">
                        Welcome, <strong>{user?.firstName}</strong>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                            (ID: {user?.userId})
                        </span>
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn btn-secondary btn-sm" onClick={() => loadTabData(tab)}>
                        <FiRefreshCw /> Refresh
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')}>
                        <FiArrowLeft /> Home
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={deactivateInactive}>
                        <FiUserX /> Clean Inactive
                    </button>
                </div>
            </header>

            <div className="admin-content">
                {/* TABS */}
                <div className="admin-tabs-scroller">
                    <div className="admin-tabs">
                        {TABS.map(t => (
                            <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`}
                                onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── DASHBOARD ── */}
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
                                <div className="card-label">ACTIVE</div>
                                <div className="card-value">{dashData.activeUsers}</div>
                            </div>
                            <div className="summary-card red">
                                <div className="card-label">INACTIVE</div>
                                <div className="card-value">{dashData.inactiveUsers}</div>
                            </div>
                            <div className="summary-card purple">
                                <div className="card-label">MONTHLY EARNINGS</div>
                                <div className="card-value">₹{(dashData.monthlyEarnings || 0).toFixed(2)}</div>
                            </div>
                            <div className="summary-card magenta">
                                <div className="card-label">WEEKLY EARNINGS</div>
                                <div className="card-value">₹{(dashData.weeklyEarnings || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── APPROVALS ── */}
                {tab === 'approvals' && (
                    <div className="approvals-view">
                        {/* Rejection Modal */}
                        {rejectTarget && (
                            <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <div className="modal-title">Rejection Reason</div>
                                        <button className="modal-close" onClick={() => setRejectTarget(null)}>✕</button>
                                    </div>
                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <textarea className="form-input" rows={3}
                                            placeholder="Reason for rejection..."
                                            value={rejectNote}
                                            onChange={e => setRejectNote(e.target.value)}
                                            style={{ height: 'auto', resize: 'vertical' }} />
                                    </div>
                                    <button className="btn btn-danger btn-full"
                                        disabled={!rejectNote.trim() || loading}
                                        onClick={() => approveWithdrawal(rejectTarget, 'reject')}>
                                        Confirm Reject
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* MEMBERSHIP APPROVALS */}
                        <div className="approval-section">
                            <h3 className="section-header purple">
                                MEMBERSHIP REQUESTS ({approvals.pendingMemberships.length})
                            </h3>
                            {approvals.pendingMemberships.length === 0
                                ? <p className="empty-msg">✅ No pending membership requests</p>
                                : (
                                    <div className="approval-list">
                                        {approvals.pendingMemberships.map(u => (
                                            <div key={u.userId} className="luxury-approval-card">
                                                <div className="l-info">
                                                    <div className="l-name">
                                                        {u.firstName} {u.lastName}
                                                        <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 13 }}>
                                                            ID: {u.userId}
                                                        </span>
                                                    </div>
                                                    <div className="l-change">
                                                        {u.membership.toUpperCase()} → <span className="target">{u.pendingMembership.toUpperCase()}</span>
                                                    </div>
                                                    <div className="l-txn">Txn Ref: {u.pendingTransactionId}</div>
                                                </div>
                                                <div className="l-actions">
                                                    <button className="btn btn-success"
                                                        onClick={() => approveMembership(u.userId, 'approve')}
                                                        disabled={isProcessing(u.userId)}>
                                                        <FiCheckCircle /> {isProcessing(u.userId) ? 'Processing...' : 'APPROVE'}
                                                    </button>
                                                    <button className="btn btn-danger"
                                                        onClick={() => approveMembership(u.userId, 'reject')}
                                                        disabled={isProcessing(u.userId)}>
                                                        <FiXCircle /> REJECT
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>

                        {/* WITHDRAWAL APPROVALS */}
                        <div className="approval-section" style={{ marginTop: 32 }}>
                            <h3 className="section-header green">
                                WITHDRAWAL REQUESTS ({approvals.pendingWithdrawals.length})
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                                ⚠️ Click APPROVE only after you have manually sent the money to the user via PhonePe / GPay / UPI.
                            </p>
                            {approvals.pendingWithdrawals.length === 0
                                ? <p className="empty-msg">✅ No pending withdrawal requests</p>
                                : (
                                    <div className="approval-list">
                                        {approvals.pendingWithdrawals.map(t => (
                                            <div key={t._id} className="luxury-approval-card">
                                                <div className="l-info">
                                                    <div className="l-name">
                                                        {t.user?.firstName} {t.user?.lastName}
                                                        <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 13 }}>
                                                            ID: {t.userId}
                                                        </span>
                                                    </div>
                                                    <div className="l-amount" style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)', margin: '4px 0' }}>
                                                        ₹{t.amount?.toFixed(2)}
                                                    </div>
                                                    {t.bankDetails && (
                                                        <div className="l-bank-summary">
                                                            {t.bankDetails.upiId && (
                                                                <div style={{ color: 'var(--cyan-400)', fontWeight: 700, fontSize: 15 }}>
                                                                    📲 UPI: {t.bankDetails.upiId}
                                                                </div>
                                                            )}
                                                            {t.bankDetails.accountNumber && (
                                                                <div>
                                                                    🏦 {t.bankDetails.bankName} — Acc: {t.bankDetails.accountNumber} | IFSC: {t.bankDetails.ifscCode}
                                                                </div>
                                                            )}
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                                Holder: {t.bankDetails.accountHolderName}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                                        Requested: {new Date(t.createdAt).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                                <div className="l-actions">
                                                    <button className="btn btn-success"
                                                        onClick={() => approveWithdrawal(t._id, 'approve')}
                                                        disabled={isProcessing(t._id)}>
                                                        <FiCheckCircle />
                                                        {isProcessing(t._id) ? 'Processing...' : 'APPROVE'}
                                                        <span style={{ display: 'block', fontSize: 10, fontWeight: 400 }}>
                                                            {isProcessing(t._id) ? '' : '(Send money first, then click)'}
                                                        </span>
                                                    </button>
                                                    <button className="btn btn-danger"
                                                        onClick={() => {
                                                            setRejectTarget(t._id);
                                                            setRejectNote('');
                                                        }}
                                                        disabled={isProcessing(t._id)}>
                                                        <FiXCircle /> REJECT
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* ── ALL USERS ── */}
                {tab === 'users' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>NAME</th>
                                    <th>EMAIL</th>
                                    <th>PHONE</th>
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
                                        <td><div className="info-sub">{u.email}</div></td>
                                        <td><div className="info-sub">{u.phone}</div></td>
                                        <td className="wallet-cell">₹{(u.walletBalance || 0).toFixed(2)}</td>
                                        <td><span className={`rank-tag ${u.membership}`}>{u.membership?.toUpperCase()}</span></td>
                                        <td>
                                            <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── LINES ── */}
                {tab === 'lines' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead>
                                <tr>
                                    <th>USER ID</th>
                                    <th>NAME</th>
                                    <th>REFERRED BY</th>
                                    <th>DIRECTS</th>
                                    <th>INDIRECTS</th>
                                    <th>DIRECT REFERRALS</th>
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
                                                    <span key={r.userId} className="roster-item">
                                                        {r.firstName} ({r.userId})
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── ACTIVE USERS ── */}
                {tab === 'active' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead><tr><th>USER ID</th><th>NAME</th><th>RANK</th><th>WALLET</th></tr></thead>
                            <tbody>
                                {activeUsers.map(u => (
                                    <tr key={u.userId}>
                                        <td className="id-cell">{u.userId}</td>
                                        <td>{u.firstName} {u.lastName}</td>
                                        <td><span className={`rank-tag ${u.membership}`}>{u.membership?.toUpperCase()}</span></td>
                                        <td>₹{(u.walletBalance || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── INACTIVE USERS ── */}
                {tab === 'inactive' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead><tr><th>USER ID</th><th>NAME</th><th>RANK</th><th>LAST SEEN</th></tr></thead>
                            <tbody>
                                {inactiveUsers.map(u => (
                                    <tr key={u.userId}>
                                        <td className="id-cell">{u.userId}</td>
                                        <td>{u.firstName} {u.lastName}</td>
                                        <td><span className={`rank-tag ${u.membership}`}>{u.membership?.toUpperCase()}</span></td>
                                        <td>{new Date(u.lastActiveDate).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* ── HISTORY ── */}
                {tab === 'history' && (
                    <div className="admin-table-container">
                        <table className="admin-data-table">
                            <thead>
                                <tr>
                                    <th>DATE</th>
                                    <th>USER</th>
                                    <th>AMOUNT</th>
                                    <th>DETAILS</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(t => (
                                    <tr key={t._id}>
                                        <td>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>
                                            <div className="name-cell">{t.user?.firstName} {t.user?.lastName}</div>
                                            <div className="info-sub">ID: {t.userId}</div>
                                        </td>
                                        <td className="wallet-cell" style={{ color: 'var(--gold)' }}>₹{t.amount?.toFixed(2)}</td>
                                        <td>
                                            <div className="info-sub" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.description}</div>
                                            {t.adminNote && <div className="info-sub" style={{ fontStyle: 'italic' }}>Note: {t.adminNote}</div>}
                                        </td>
                                        <td>
                                            <span className={`status-dot ${t.status === 'completed' ? 'active' : 'inactive'}`}></span>
                                            {t.status.toUpperCase()}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && <tr><td colSpan="5" className="empty-msg">No history found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
