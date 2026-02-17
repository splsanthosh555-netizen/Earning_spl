import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFileText } from 'react-icons/fi';

export default function TermsConditions() {
    const navigate = useNavigate();

    const terms = [
        'Amount not refunds – All payments once made are non-refundable.',
        'Not fixed incomes – Earnings are variable and not guaranteed.',
        'Based on service – Income is based on the services provided and referrals made.',
        'Based on work – Your earnings depend on your active participation and effort.',
        'No passive income – You must actively refer and participate to earn.',
        'User inactive more than 30 days then inactive user wallet amount added into admin wallet.'
    ];

    return (
        <div className="settings-page animate-fade-up">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/home')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>
            <div className="settings-card">
                <div className="settings-title"><FiFileText /> Terms & Conditions</div>
                <ul className="terms-list">
                    {terms.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
            </div>
        </div>
    );
}
