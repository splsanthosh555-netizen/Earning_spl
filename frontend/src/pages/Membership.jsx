import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiAward, FiCheck, FiExternalLink, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const memberships = [
    {
        type: 'bronze', name: 'Bronze', cost: 50,
        color: '#cd7f32',
        features: [
            '20% Direct Referral Income',
            '1% Indirect Referral Income',
            '10% Admin Fee on Earnings',
            'Standard Membership Benefits'
        ]
    },
    {
        type: 'silver', name: 'Silver', cost: 100,
        color: '#a8a9ad',
        features: [
            '30% Direct Referral Income',
            '2% Indirect Referral Income',
            '10% Admin Fee on Earnings',
            'Easy Withdrawal Access'
        ]
    },
    {
        type: 'gold', name: 'Gold', cost: 200,
        color: '#ffd700',
        features: [
            '40% Direct Referral Income',
            '2% Indirect Referral Income',
            '10% Admin Fee on Earnings',
            'Fast-Track Approvals'
        ]
    },
    {
        type: 'diamond', name: 'Diamond', cost: 350,
        color: '#b9f2ff',
        features: [
            '40% Direct Referral Income',
            '10% Indirect Referral Income',
            '✨ ZERO Admin Fees',
            'No Manual Approvals Required'
        ]
    },
    {
        type: 'platinum', name: 'Platinum', cost: 500,
        color: '#e5e4e2',
        features: [
            '40% Direct Referral Income',
            '15% Indirect Referral Income',
            '✨ ZERO Admin Fees',
            'Premium VIP Status',
            'Priority Payout Processing'
        ]
    }
];

const RANK = { none: 0, bronze: 1, silver: 2, gold: 3, diamond: 4, platinum: 5, vip: 6 };

export default function Membership() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [selectedType, setSelectedType] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cashfreeSDK, setCashfreeSDK] = useState(null);

    // Check for order_id in URL (Cashfree redirect back)
    useEffect(() => {
        const orderId = searchParams.get('order_id');
        if (orderId) {
            verifyReturnedPayment(orderId);
        }
    }, []);

    // Initialize Cashfree SDK
    useEffect(() => {
        if (window.Cashfree) {
            const isProd = window.location.hostname !== 'localhost';
            const cf = new window.Cashfree({
                mode: isProd ? 'production' : 'sandbox'
            });
            setCashfreeSDK(cf);
            console.log(`✅ Cashfree SDK loaded in ${isProd ? 'PRODUCTION' : 'SANDBOX'} mode`);
        } else {
            console.warn('⚠️ Cashfree SDK not loaded – falling back to manual payment');
        }
    }, []);

    const verifyReturnedPayment = async (orderId) => {
        try {
            const res = await API.post('/membership/verify-order', { orderId });
            if (res.data.success) {
                toast.success('🎉 Membership activated successfully!');
                refreshUser();
            } else {
                toast.error('Payment not confirmed. Contact support if money was deducted.');
            }
        } catch (err) {
            toast.error('Could not verify payment. Please contact support.');
        }
    };

    const handleBuy = async (type) => {
        setLoading(true);
        try {
            const res = await API.post('/membership/buy', { membershipType: type });

            if (res.data.mode === 'automatic' && cashfreeSDK) {
                // ✅ CASHFREE AUTOMATED CHECKOUT
                const checkoutOptions = {
                    paymentSessionId: res.data.paymentSessionId,
                    redirectTarget: '_modal',
                };

                cashfreeSDK.checkout(checkoutOptions).then(async (result) => {
                    if (result.error) {
                        console.error('Cashfree error:', result.error);
                        toast.error('Payment failed: ' + result.error.message);
                    } else if (result.paymentDetails) {
                        toast.success('Payment completed! Verifying...');
                        await verifyReturnedPayment(res.data.orderId);
                    }
                });
            } else if (res.data.mode === 'manual') {
                // 💳 MANUAL UPI FALLBACK
                setSelectedType(type);
                setPaymentInfo(res.data.paymentInfo);
                setShowPayment(true);
            } else if (res.data.mode === 'error') {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to initiate purchase. Try again.');
        }
        setLoading(false);
    };

    const copyUpiId = () => {
        navigator.clipboard.writeText(paymentInfo?.upiId);
        toast.success('UPI ID copied!');
    };

    const submitTransaction = async () => {
        if (!transactionId.trim()) return toast.error('Enter transaction ID');
        setLoading(true);
        try {
            await API.post('/membership/submit-transaction', {
                transactionId: transactionId.trim(),
                membershipType: selectedType
            });
            toast.success('✅ Transaction submitted! Waiting for admin approval.');
            setShowPayment(false);
            setTransactionId('');
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
        setLoading(false);
    };

    const currentRank = RANK[user?.membership] || 0;

    return (
        <div className="settings-page animate-fade-up" style={{ maxWidth: 1000 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')}
                style={{ marginBottom: 20 }}>
                <FiArrowLeft /> Back to Home
            </button>

            <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FiAward style={{ color: 'var(--gold)' }} /> Membership Plans
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Current Status: <strong style={{ color: 'var(--gold)', textTransform: 'capitalize' }}>
                        {user?.membership === 'vip' ? '👑 VIP' : user?.membership || 'None'}
                    </strong>
                    {user?.pendingMembership && (
                        <span style={{ color: 'var(--yellow-400)', marginLeft: 16 }}>
                            ⏳ Pending Approval: {user.pendingMembership}
                        </span>
                    )}
                </p>
            </div>

            <div className="membership-grid">
                {memberships.map((m) => {
                    const isOwned = currentRank >= RANK[m.type];
                    const isCurrent = user?.membership === m.type;
                    const canBuy = currentRank < RANK[m.type];
                    const hasPending = !!user?.pendingMembership;

                    return (
                        <div key={m.type} className={`membership-card ${m.type}`} style={{ borderTopColor: m.color }}>
                            <div className="membership-name" style={{ color: m.color }}>{m.name}</div>
                            <div className="membership-price">
                                ₹{m.cost}<span>/one-time</span>
                            </div>
                            <ul className="membership-features">
                                {m.features.map((f, i) => (
                                    <li key={i}><span className="icon">✓</span> {f}</li>
                                ))}
                            </ul>

                            {isCurrent ? (
                                <div className="current-badge">✅ Current Plan</div>
                            ) : !canBuy ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                                    ✓ Included in your plan
                                </div>
                            ) : hasPending ? (
                                <div style={{
                                    padding: '10px', textAlign: 'center', fontSize: 13,
                                    color: 'var(--yellow-400)', border: '1px solid var(--yellow-400)',
                                    borderRadius: 8
                                }}>
                                    ⏳ Approval Pending
                                </div>
                            ) : (
                                <button className="btn btn-primary btn-full"
                                    onClick={() => handleBuy(m.type)}
                                    disabled={loading}
                                    style={{ borderColor: m.color, background: `linear-gradient(135deg, ${m.color}22, ${m.color}11)` }}>
                                    {loading ? 'Processing...' : (currentRank > 0 ? `⬆️ Upgrade to ${m.name}` : `Buy ${m.name} — ₹${m.cost}`)}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Manual Payment Modal */}
            {showPayment && paymentInfo && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Complete Payment</div>
                            <button className="modal-close" onClick={() => setShowPayment(false)}>✕</button>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--gold)', marginBottom: 4 }}>
                                ₹{paymentInfo.amount}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                {selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)} Membership
                            </p>
                        </div>

                        {/* QR Code */}
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>Scan to Pay via UPI</p>
                            <div style={{ background: 'white', padding: 10, borderRadius: 12, display: 'inline-block' }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${paymentInfo.upiId}&am=${paymentInfo.amount}&cu=INR&tn=${paymentInfo.note}`)}`}
                                    alt="UPI QR Code" style={{ display: 'block' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                                <span style={{ fontFamily: 'monospace', color: 'var(--cyan-400)', fontWeight: 700, fontSize: 16 }}>
                                    {paymentInfo.upiId}
                                </span>
                                <button className="btn btn-secondary btn-sm" onClick={copyUpiId} style={{ padding: '4px 10px' }}>
                                    <FiCopy /> Copy
                                </button>
                            </div>
                        </div>

                        {/* UPI Deep Links */}
                        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <a href={`upi://pay?pa=${paymentInfo.upiId}&am=${paymentInfo.amount}&cu=INR&tn=${paymentInfo.note}`}
                                className="btn btn-gold btn-full"
                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <FiExternalLink /> Pay via Any UPI App
                            </a>
                            <a href={`phonepe://pay?pa=${paymentInfo.upiId}&am=${paymentInfo.amount}&cu=INR`}
                                className="btn btn-primary btn-full"
                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#5f259f', borderColor: '#5f259f' }}>
                                <FiExternalLink /> Open PhonePe
                            </a>
                        </div>

                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 16 }}>
                            After payment, enter the transaction ID below and submit for admin approval.
                        </p>

                        <div className="form-group">
                            <label className="form-label">Transaction ID (from your UPI app)</label>
                            <input className="form-input" placeholder="e.g. 426873628465"
                                value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                        </div>
                        <button className="btn btn-primary btn-full" onClick={submitTransaction} disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Transaction ID for Approval'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
