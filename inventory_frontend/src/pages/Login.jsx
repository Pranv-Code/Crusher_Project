import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoImg from "../assets/logo.png";
import "../css/auth.css";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await loginUser(username, password);
            navigate("/");
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to log in. Check credentials.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-wrapper">
                {/* Left Side: Large Logo & Brand Hero */}
                <div className="auth-left">
                    <div className="logo-hero-container">
                        <img src={logoImg} alt="White Cloud Global Solutions" className="auth-large-logo" />
                        <div className="brand-tagline">
                            <h3>Crusher IMS</h3>
                            <p>Inventory & Logistics Management System</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="auth-right">
                    <div className="auth-card">
                        <div className="auth-header">
                            <h2>Sign In</h2>
                            <p>Enter your credentials to access your dashboard</p>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Username or Email</label>
                                <div className="input-with-icon">
                                    <span className="input-icon">👤</span>
                                    <input
                                        type="text"
                                        placeholder="Enter username or email"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <div className="input-with-icon">
                                    <span className="input-icon">🔒</span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="has-toggle"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? "Hide Password" : "Show Password"}
                                        aria-label={showPassword ? "Hide Password" : "Show Password"}
                                    >
                                        {showPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? "Signing In..." : "Sign In to Dashboard →"}
                            </button>
                        </form>

                        <div className="auth-footer">
                            Don't have an account?
                            <Link to="/register">Register here</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Right Watermark */}
            <div className="watermark-container">
                <img src={logoImg} alt="White Cloud Watermark" className="watermark-logo" />
                <div className="watermark-text">
                    <span className="wm-title">WHITE CLOUD</span>
                    <span className="wm-subtitle">GLOBAL SOLUTIONS</span>
                </div>
            </div>
        </div>
    );
}
