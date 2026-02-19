import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function BankDetails() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        bankName: '', accountHolderName: '', accountNumber: '', confirmAccountNumber: '', ifscCode: '', upiId: ''
    });
    const [loading, setLoading] = useState(false);
    const [existing, setExisting] = useState(false);

    useEffect(() => {
        API.get('/user/bank-details').then(res => {
            if (res.data) {
                setForm({
                    bankName: res.data.bankName || '',
                    accountHolderName: res.data.accountHolderName || '',
                    accountNumber: res.data.accountNumber || '',
                    confirmAccountNumber: res.data.accountNumber || '',
                    ifscCode: res.data.ifscCode || '',
                    upiId: res.data.upiId || ''
                });
                if (res.data.bankName) setExisting(true);
            }
        }).catch(() => { });
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.accountNumber !== form.confirmAccountNumber) return toast.error('Account numbers do not match');
        setLoading(true);
        try {
            await API.post('/user/bank-details', form);
            toast.success(existing ? 'Bank details updated!' : 'Bank details saved!');
            setExisting(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
        setLoading(false);
    };

    return (
        <div className="settings-page animate-fade-up">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>
            <div className="settings-card">
                <div className="settings-title"><FiCreditCard /> Bank Details</div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input className="form-input" name="bankName" placeholder="e.g. State Bank of India"
                            value={form.bankName} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Account Holder Name</label>
                        <input className="form-input" name="accountHolderName" placeholder="Full name"
                            value={form.accountHolderName} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input className="form-input" name="accountNumber" placeholder="Account number"
                            value={form.accountNumber} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm Account Number</label>
                        <input className="form-input" name="confirmAccountNumber" placeholder="Confirm account number"
                            value={form.confirmAccountNumber} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">IFSC Code</label>
                        <input className="form-input" name="ifscCode" placeholder="e.g. SBIN0001234"
                            value={form.ifscCode} onChange={handleChange} required style={{ textTransform: 'uppercase' }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">UPI ID (Optional)</label>
                        <input className="form-input" name="upiId" placeholder="e.g. user@okhdfc"
                            value={form.upiId} onChange={handleChange} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Saving...' : (existing ? 'Update Details' : 'Save Details')}
                    </button>
                </form>
            </div>
        </div>
    );
}
