import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/authApi";
import logoImg from "../assets/logo.png";
import "../css/auth.css";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState("Clerk");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await register({ name, email, password, role });
            alert("Registration successful! You can now log in.");
            navigate("/login");
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to register. Please try again.";
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

                {/* Right Side: Register Form */}
                <div className="auth-right">
                    <div className="auth-card">
                        <div className="auth-header">
                            <h2>Create Account</h2>
                            <p>Fill in your details to register a new account</p>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <div className="input-with-icon">
                                    <span className="input-icon">👤</span>
                                    <input
                                        type="text"
                                        placeholder="Enter full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <div className="input-with-icon">
                                    <span className="input-icon">✉️</span>
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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

                            <div className="form-group">
                                <label>Role</label>
                                <div className="input-with-icon">
                                    <span className="input-icon">🛡️</span>
                                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                                        <option value="Clerk">Clerk</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="auth-btn" disabled={loading}>
                                {loading ? "Registering..." : "Create Account →"}
                            </button>
                        </form>

                        <div className="auth-footer">
                            Already have an account?
                            <Link to="/login">Sign In</Link>
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
