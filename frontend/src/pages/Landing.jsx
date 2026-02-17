import { Link } from 'react-router-dom';
import { FiZap, FiUsers, FiDollarSign, FiShield } from 'react-icons/fi';

export default function Landing() {
    return (
        <div className="landing-page">
            <div className="landing-hero">
                <div className="landing-badge">
                    <FiZap /> Premium Referral Platform
                </div>
                <h1 className="landing-title">
                    Earn with <span>SPL-Earnings</span>
                </h1>
                <p className="landing-subtitle">
                    Join our premium membership platform. Refer friends, build your network, and earn passive income through our multi-level referral system.
                </p>
                <div className="landing-actions">
                    <Link to="/register" className="btn btn-primary btn-lg" id="landing-register">
                        Get Started
                    </Link>
                    <Link to="/login" className="btn btn-secondary btn-lg" id="landing-login">
                        Login
                    </Link>
                </div>
                <div className="landing-stats">
                    <div className="landing-stat">
                        <div className="landing-stat-value">5</div>
                        <div className="landing-stat-label">Membership Tiers</div>
                    </div>
                    <div className="landing-stat">
                        <div className="landing-stat-value">40%</div>
                        <div className="landing-stat-label">Referral Income</div>
                    </div>
                    <div className="landing-stat">
                        <div className="landing-stat-value">₹50</div>
                        <div className="landing-stat-label">Starting From</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
