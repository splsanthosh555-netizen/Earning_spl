import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Earnings() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [earnings, setEarnings] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEarnings();
        fetchHistory();
        refreshUser();
    }, []);

    const fetchEarnings = async () => {
        try {
            const res = await API.get('/earnings/total');
            setEarnings(res.data);
        } catch (err) { }
    };

    const fetchHistory = async () => {
        try {
            const res = await API.get('/earnings/history');
            setTransactions(res.data);
        } catch (err) { }
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < 100) return toast.error('Minimum withdrawal is ₹100');
        setLoading(true);
        try {
            await API.post('/earnings/withdraw', { amount });
            toast.success('Withdrawal request submitted!');
            setWithdrawAmount('');
            fetchEarnings();
            fetchHistory();
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
        setLoading(false);
    };

    const getTypeLabel = (type) => {
        const labels = {
            membership_purchase: 'Membership',
            referral_income: 'Referral Income',
            indirect_income: 'Indirect Income',
            shared_income: 'Shared Income',
            admin_fee: 'Admin Fee',
            withdrawal: 'Withdrawal',
            upgrade: 'Upgrade',
            inactive_transfer: 'Inactive Transfer'
        };
        return labels[type] || type;
    };

    const isNegative = (type) => ['admin_fee', 'withdrawal', 'inactive_transfer'].includes(type);

    return (
        <div className="settings-page animate-fade-up" style={{ maxWidth: 700 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
                <FiTrendingUp /> Earnings
            </h2>

            <div className="earnings-summary">
                <div className="dash-card">
                    <div className="dash-card-icon">💰</div>
                    <div className="dash-card-value" style={{ color: 'var(--green-400)' }}>
                        ₹{(earnings?.totalEarnings || 0).toFixed(2)}
                    </div>
                    <div className="dash-card-label">Total Earnings</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-icon">👛</div>
                    <div className="dash-card-value" style={{ color: 'var(--cyan-400)' }}>
                        ₹{(earnings?.walletBalance || 0).toFixed(2)}
                    </div>
                    <div className="dash-card-label">Wallet Balance</div>
                </div>
            </div>

            {/* Withdraw Section */}
            <div className="glass-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                    <FiDollarSign /> Withdraw
                </h3>
                <div className="otp-row">
                    <input className="form-input" type="number" placeholder="Enter amount (min ₹100)"
                        value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                    <button
                        className="btn btn-success"
                        onClick={handleWithdraw}
                        disabled={loading || !earnings?.canWithdraw}
                    >
                        {loading ? 'Processing...' : 'Withdraw'}
                    </button>
                </div>
                {!earnings?.canWithdraw && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                        Minimum balance of ₹100 required to withdraw
                    </p>
                )}
            </div>

            {/* Transaction History */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Transaction History</h3>
            {transactions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No transactions yet</p>
            ) : (
                <ul className="transaction-list">
                    {transactions.map((t) => (
                        <li key={t._id} className="transaction-item">
                            <div>
                                <div className="transaction-type">{getTypeLabel(t.type)}</div>
                                <div className="transaction-desc">{t.description}</div>
                                <div className="transaction-date">{new Date(t.createdAt).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className={`transaction-amount ${isNegative(t.type) ? 'negative' : 'positive'}`}>
                                    {isNegative(t.type) ? '-' : '+'}₹{t.amount.toFixed(2)}
                                </div>
                                <div style={{
                                    fontSize: 11, textAlign: 'right', textTransform: 'capitalize',
                                    color: t.status === 'approved' || t.status === 'completed' ? 'var(--green-400)' :
                                        t.status === 'pending' ? 'var(--yellow-400)' : 'var(--red-400)'
                                }}>
                                    {t.status}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
