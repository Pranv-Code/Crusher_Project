import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApprovals, getMyPendingApprovals } from "../services/approvalApi";
import "../css/navbar.css";

function Navbar({ onToggleSidebar, isSidebarCollapsed }) {
    const { user, isManager, isClerk } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [tons, setTons] = useState("");
    const [brass, setBrass] = useState("");
    const [pendingCount, setPendingCount] = useState(0);

    const today = new Date().toLocaleDateString();

    const checkOldEntries = (entries) => {
        if (!isManager || !user) return;
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const hasOld = entries.some(entry => {
            const entryDate = new Date(entry.created_at);
            return entryDate < oneDayAgo;
        });

        if (hasOld) {
            const storageKey = `alerted_old_approvals_${user.user_id}`;
            const hasAlerted = sessionStorage.getItem(storageKey);
            if (!hasAlerted) {
                alert("⚠️ Warning: You have pending approval requests that are more than a day old!");
                sessionStorage.setItem(storageKey, "true");
            }
        }
    };

    const updatePendingCount = async () => {
        if (!user) return;
        try {
            if (isManager) {
                const res = await getApprovals();
                setPendingCount(res.data.length);
                checkOldEntries(res.data);
            } else if (isClerk) {
                const res = await getMyPendingApprovals();
                // Filter only 'pending' status requests for the clerk badge count
                const pending = res.data.filter(req => req.status === "pending");
                setPendingCount(pending.length);
            }
        } catch (err) {
            console.error("Failed to fetch pending count for navbar:", err);
        }
    };

    useEffect(() => {
        if (user) {
            updatePendingCount();

            const interval = setInterval(() => {
                updatePendingCount();
            }, 5000);

            return () => clearInterval(interval);
        } else {
            setPendingCount(0);
        }
    }, [user, isManager, isClerk]);

    const handleTonsChange = (e) => {
        const val = e.target.value;
        setTons(val);
        if (val === "") {
            setBrass("");
        } else {
            const calculated = parseFloat(val) * 4.2;
            setBrass(isNaN(calculated) ? "" : calculated.toFixed(2));
        }
    };

    const handleBrassChange = (e) => {
        const val = e.target.value;
        setBrass(val);
        if (val === "") {
            setTons("");
        } else {
            const calculated = parseFloat(val) / 4.2;
            setTons(isNaN(calculated) ? "" : calculated.toFixed(4));
        }
    };

    return (
        <header className="navbar">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div className="nav-logo">
                    <h2>WHITE CLOUD</h2>
                    <p>GLOBAL SOLUTIONS</p>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                {user && (isManager || isClerk) && (
                    <NavLink
                        to={isManager ? "/approvals" : "/my-pending"}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 12px",
                            backgroundColor: pendingCount > 0 ? "#fee2e2" : "#f1f5f9",
                            color: pendingCount > 0 ? "#b91c1c" : "#475569",
                            border: pendingCount > 0 ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                            textDecoration: "none",
                            borderRadius: "6px",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            position: "relative",
                            transition: "all 0.2s"
                        }}
                    >
                        <span style={{ fontSize: "1.1rem" }}>💬</span>
                        <span>{isManager ? "Pending Approvals" : "Pending Work"}</span>
                        {pendingCount > 0 && (
                            <span className="pulse-badge" style={{
                                position: "absolute",
                                top: "-8px",
                                right: "-8px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                borderRadius: "50%",
                                width: "18px",
                                height: "18px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                fontSize: "0.75rem",
                                fontWeight: "bold",
                                border: "2px solid white",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                            }}>
                                {pendingCount}
                            </span>
                        )}
                    </NavLink>
                )}
                
                <button 
                    style={{ 
                        fontSize: "0.85rem", 
                        padding: "6px 12px", 
                        backgroundColor: "#f1f5f9", 
                        color: "#0f172a", 
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s"
                    }}
                    onClick={() => setShowModal(true)}
                >
                    🔄 Unit Converter
                </button>
                <span>{today}</span>
            </div>

            {showModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        color: "#0f172a"
                    }}>
                        <h3 style={{ margin: "0 0 1.5rem 0", color: "#1e1b4b", display: "flex", alignItems: "center", gap: "8px" }}>
                            🔄 Unit Converter
                        </h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginBottom: "1.5rem" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                    Tons
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    style={{
                                        width: "100%", padding: "0.75rem", borderRadius: "8px",
                                        border: "1px solid #d1d5db", fontSize: "1rem", boxSizing: "border-box",
                                        color: "#000", background: "#f8fafc"
                                    }}
                                    placeholder="Enter tons"
                                    value={tons}
                                    onChange={handleTonsChange}
                                />
                            </div>

                            <div style={{ textAlign: "center", fontSize: "1.2rem", color: "#94a3b8", fontWeight: "bold" }}>
                                ⇅
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                    Brass
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    style={{
                                        width: "100%", padding: "0.75rem", borderRadius: "8px",
                                        border: "1px solid #d1d5db", fontSize: "1rem", boxSizing: "border-box",
                                        color: "#000", background: "#f8fafc"
                                    }}
                                    placeholder="Enter brass"
                                    value={brass}
                                    onChange={handleBrassChange}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                className="primary-btn"
                                style={{ backgroundColor: "#ef4444", border: "none", color: "white" }}
                                onClick={() => { setTons(""); setBrass(""); }}
                            >
                                Reset
                            </button>
                            <button
                                className="primary-btn"
                                style={{ backgroundColor: "#9ca3af", color: "white", border: "none" }}
                                onClick={() => setShowModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Navbar;