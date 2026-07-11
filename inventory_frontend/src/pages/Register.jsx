import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/authApi";
import "../css/auth.css";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Crusher IMS</h2>
                    <p>Create a new account</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="Enter full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="Enter email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="Clerk">Clerk</option>
                            <option value="Manager">Manager</option>
                        </select>
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?
                    <Link to="/login">Sign In</Link>
                </div>
            </div>
        </div>
    );
}
