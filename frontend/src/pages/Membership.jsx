import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiAward, FiCheck, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const memberships = [
    {
        type: 'bronze', name: 'Bronze', cost: 50,
        gradient: 'var(--gradient-bronze)',
        features: ['20% of Referrer Pool', 'Active Member Community Share', '20% Admin Fee on income']
    },
    {
        type: 'silver', name: 'Silver', cost: 100,
        gradient: 'var(--gradient-silver)',
        features: ['30% of Referrer Pool', 'Active Member Community Share', '20% Admin Fee on income']
    },
    {
        type: 'gold', name: 'Gold', cost: 200,
        gradient: 'var(--gradient-gold)',
        features: ['35% of Referrer Pool', 'Active Member Community Share', '20% Admin Fee on income']
    },
    {
        type: 'diamond', name: 'Diamond', cost: 350,
        gradient: 'var(--gradient-diamond)',
        features: ['40% of Referrer Pool', 'Active Member Community Share', 'No Admin Fees', 'Admin Approval Required']
    },
    {
        type: 'platinum', name: 'Platinum', cost: 500,
        gradient: 'var(--gradient-platinum)',
        features: ['40% of Referrer Pool', 'Active Member Community Share', 'No Admin Fees', 'Admin Approval Required']
    }
];

const RANK = { none: 0, bronze: 1, silver: 2, gold: 3, diamond: 4, platinum: 5, vip: 6 };

export default function Membership() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cashfree, setCashfree] = useState(null);

    useEffect(() => {
        // Initialize Cashfree
        if (window.Cashfree) {
            const isProd = window.location.hostname === 'earningspl.com';
            setCashfree(window.Cashfree({
                mode: isProd ? "production" : "sandbox"
            }));
            console.log(`Cashfree initialized in ${isProd ? 'production' : 'sandbox'} mode`);
        }
    }, []);

    const handleBuy = async (type) => {
        setLoading(true);
        try {
            const res = await API.post('/membership/buy', { membershipType: type });

            if (res.data.mode === 'automatic' && cashfree) {
                // AUTOMATIC CHECKOUT
                let checkoutOptions = {
                    paymentSessionId: res.data.paymentSessionId,
                    redirectTarget: "_modal", // Opens in a modal
                };

                cashfree.checkout(checkoutOptions).then((result) => {
                    if (result.error) {
                        toast.error(result.error.message);
                    }
                    if (result.redirect) {
                        console.log("Payment redirected");
                    }
                    if (result.paymentDetails) {
                        // Check status
                        verifyAutomatedPayment(res.data.orderId, type);
                    }
                });
            } else {
                // MANUAL FALLBACK
                setSelectedType(type);
                setPaymentInfo(res.data.paymentInfo);
                setShowPayment(true);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to initiate purchase');
        }
        setLoading(false);
    };

    const verifyAutomatedPayment = async (orderId, type) => {
        try {
            const res = await API.post('/membership/verify-order', { orderId, membershipType: type });
            if (res.data.success) {
                toast.success('Membership Activated!');
                refreshUser();
            }
        } catch (err) {
            toast.error('Payment verification failed. Please contact support.');
        }
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
            toast.success('Transaction submitted! Waiting for admin approval.');
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
        <div className="settings-page animate-fade-up" style={{ maxWidth: 900 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>

            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                    <FiAward /> Membership Plans
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Current: <strong style={{ color: 'var(--gold)', textTransform: 'capitalize' }}>
                        {user?.membership === 'vip' ? 'VIP' : user?.membership}
                    </strong>
                    {user?.pendingMembership && (
                        <span style={{ color: 'var(--yellow-400)', marginLeft: 12 }}>
                            ⏳ Pending: {user.pendingMembership}
                        </span>
                    )}
                </p>
            </div>

            <div className="membership-grid">
                {memberships.map((m) => {
                    const isOwned = currentRank >= RANK[m.type];
                    const isCurrent = user?.membership === m.type;
                    const canBuy = currentRank < RANK[m.type];

                    return (
                        <div key={m.type} className={`membership-card ${m.type}`}>
                            <div className="membership-name">{m.name}</div>
                            <div className="membership-price">₹{m.cost}<span>/one-time</span></div>
                            <ul className="membership-features">
                                {m.features.map((f, i) => (
                                    <li key={i}><span className="icon">✓</span> {f}</li>
                                ))}
                            </ul>
                            {isCurrent ? (
                                <div className="current-badge">Current Plan</div>
                            ) : canBuy ? (
                                <button className="btn btn-primary btn-full" onClick={() => handleBuy(m.type)}
                                    disabled={loading || !!user?.pendingMembership}>
                                    {loading ? 'Processing...' : (user?.pendingMembership ? 'Pending Approval' : (currentRank > 0 ? 'Upgrade' : 'Buy Now'))}
                                </button>
                            ) : (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>✓ Included</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Payment Modal (Manual Fallback Only) */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Complete Payment</div>
                            <button className="modal-close" onClick={() => setShowPayment(false)}>✕</button>
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, color: 'var(--gold)' }}>
                                ₹{paymentInfo?.amount}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                {selectedType?.charAt(0).toUpperCase() + selectedType?.slice(1)} Membership
                            </p>
                        </div>

                        <div style={{
                            padding: 16, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                            borderRadius: 12, marginBottom: 20, textAlign: 'center'
                        }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Scan QR to Pay</p>
                            <div style={{
                                background: 'white', padding: 10, borderRadius: 12, display: 'inline-block',
                                marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${paymentInfo?.upiId}&am=${paymentInfo?.amount}&cu=INR`)}`}
                                    alt="UPI QR Code"
                                    style={{ display: 'block' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--cyan-400)', fontFamily: 'monospace' }}>
                                    {paymentInfo?.upiId}
                                </p>
                                <button className="btn btn-secondary btn-sm" onClick={copyUpiId} style={{ padding: '4px 8px' }}>
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <a
                                href={`upi://pay?pa=${paymentInfo?.upiId}&am=${paymentInfo?.amount}&cu=INR`}
                                className="btn btn-gold btn-full"
                                style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                            >
                                <FiExternalLink style={{ marginRight: 8 }} /> Pay with Any UPI App
                            </a>

                            <a
                                href={`phonepe://pay?pa=${paymentInfo?.upiId}&am=${paymentInfo?.amount}&cu=INR`}
                                className="btn btn-primary btn-full"
                                style={{
                                    marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    textDecoration: 'none', background: '#5f259f', borderColor: '#5f259f'
                                }}
                            >
                                <FiExternalLink style={{ marginRight: 8 }} /> Open PhonePe Directly
                            </a>

                            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                                Mobile users: Click above or scan QR.<br />
                                Desktop users: Scan the QR code with your phone.
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Enter Transaction ID after payment</label>
                            <input className="form-input" placeholder="Enter Transaction ID"
                                value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                        </div>
                        <button className="btn btn-primary btn-full" onClick={submitTransaction} disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Transaction ID'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
