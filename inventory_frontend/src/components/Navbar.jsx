import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApprovals, getMyPendingApprovals } from "../services/approvalApi";
import { getSettings, updateSettings } from "../services/settingsApi";
import "../css/navbar.css";

function Navbar() {
    const { user, logoutUser, isManager, isClerk } = useAuth();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [tons, setTons] = useState("");
    const [brass, setBrass] = useState("");
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);
    const [savingFactor, setSavingFactor] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchConversionFactor = async () => {
        try {
            const res = await getSettings();
            if (res.data && res.data.tons_per_brass) {
                setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
            }
        } catch (e) {
            console.error("Failed to load unit conversion factor:", e);
        }
    };

    useEffect(() => {
        fetchConversionFactor();
    }, []);

    const handleSaveFactor = async () => {
        const factorNum = parseFloat(tonsPerBrass);
        if (isNaN(factorNum) || factorNum <= 0) {
            alert("Please enter a valid positive conversion factor (e.g. 4.2).");
            return;
        }

        setSavingFactor(true);
        try {
            await updateSettings({ tons_per_brass: factorNum });
            alert(`Unit conversion factor updated successfully! (1 Brass = ${factorNum} Tons)`);
            if (brass) {
                setTons((parseFloat(brass) * factorNum).toFixed(2));
            } else if (tons) {
                setBrass((parseFloat(tons) / factorNum).toFixed(2));
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update conversion factor.");
        } finally {
            setSavingFactor(false);
        }
    };

    const handleTonsChange = (e) => {
        const val = e.target.value;
        setTons(val);
        if (val === "" || isNaN(val)) {
            setBrass("");
        } else {
            const factor = parseFloat(tonsPerBrass) || 4.2;
            const calculated = parseFloat(val) / factor;
            setBrass(calculated.toFixed(2));
        }
    };

    const handleBrassChange = (e) => {
        const val = e.target.value;
        setBrass(val);
        if (val === "" || isNaN(val)) {
            setTons("");
        } else {
            const factor = parseFloat(tonsPerBrass) || 4.2;
            const calculated = parseFloat(val) * factor;
            setTons(calculated.toFixed(2));
        }
    };

    const checkOldEntries = (entries) => {
        if (!isManager || !user) return;
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const hasOld = entries.some(entry => {
            const entryDate = new Date(entry.created_at);
            return entryDate < oneDayAgo;
        });

        if (hasOld) {
            alert("⚠️ WARNING: You have pending requests older than 24 hours! Please review them immediately.");
        }
    };

    useEffect(() => {
        let isMounted = true;
        
        const fetchPendingCount = async () => {
            if (!user) return;
            try {
                if (isManager) {
                    const res = await getApprovals("pending");
                    if (isMounted && res.data) {
                        setPendingCount(res.data.length);
                        checkOldEntries(res.data);
                    }
                } else if (isClerk) {
                    const res = await getMyPendingApprovals();
                    if (isMounted && res.data) {
                        const pendingList = res.data.filter(item => item.status === "pending");
                        setPendingCount(pendingList.length);
                    }
                }
            } catch (err) {
                console.error("Error fetching pending approvals count:", err);
            }
        };

        fetchPendingCount();
        const interval = setInterval(fetchPendingCount, 10000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user, isManager, isClerk]);

    return (
        <header className="navbar navbar-container">
            <div className="navbar-brand" onClick={() => navigate("/")}>
                <img 
                    src="/logo.png" 
                    alt="Vishwajeet Enterprises Logo" 
                    className="navbar-logo"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }} 
                />
                <div>
                    <h2 className="navbar-title">VISHWAJEET ENTERPRISES</h2>
                </div>
            </div>

            <div className="navbar-right-actions">
                {user && (isManager || isClerk) && (
                    <NavLink
                        to={isManager ? "/approvals" : "/my-pending"}
                        className="nav-pending-link"
                        style={{
                            backgroundColor: pendingCount > 0 ? "#fee2e2" : "#f1f5f9",
                            color: pendingCount > 0 ? "#b91c1c" : "#475569",
                            border: pendingCount > 0 ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                        }}
                    >
                        <span style={{ fontSize: "1.1rem" }}>💬</span>
                        <span style={{color: "black"}}>{isManager ? "Pending Approvals" : "Pending Work"}</span>
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
                    className="nav-btn"
                    onClick={() => {
                        fetchConversionFactor();
                        setShowModal(true);
                    }}
                >
                    🔄 Unit Converter
                </button>

                <div className="nav-date-badge">
                    <span>🕒</span>
                    <span>
                        {currentDateTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ color: "#cbd5e1" }}>|</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {currentDateTime.toLocaleTimeString()}
                    </span>
                </div>

                {user && (
                    <button
                        className="nav-logout-btn"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <span>🚪</span>
                        <span>Logout</span>
                    </button>
                )}
            </div>

            {showModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        color: "#0f172a"
                    }}>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#1e1b4b", display: "flex", alignItems: "center", gap: "8px" }}>
                            🔄 Unit Converter &amp; Calculator
                        </h3>

                        {/* Conversion Factor Settings Section for Managers */}
                        <div style={{
                            backgroundColor: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            marginBottom: "1.2rem",
                            fontSize: "0.85rem"
                        }}>
                            <div style={{ fontWeight: "700", color: "#0369a1", marginBottom: "4px" }}>
                                📐 Conversion Rule: 1 Brass = {tonsPerBrass} Tons
                            </div>

                            {isManager ? (
                                <div style={{ marginTop: "6px" }}>
                                    <label style={{ display: "block", fontSize: "0.75rem", color: "#0369a1", marginBottom: "4px" }}>
                                        Change Tons Value (Tons in 1 Brass):
                                    </label>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tonsPerBrass}
                                            onChange={(e) => setTonsPerBrass(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: "4px 8px",
                                                borderRadius: "6px",
                                                border: "1px solid #7dd3fc",
                                                fontSize: "0.85rem"
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveFactor}
                                            disabled={savingFactor}
                                            style={{
                                                backgroundColor: "#0284c7",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "6px",
                                                padding: "4px 10px",
                                                fontSize: "0.8rem",
                                                fontWeight: "600",
                                                cursor: "pointer"
                                            }}
                                        >
                                            {savingFactor ? "Saving..." : "Save Factor"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ fontSize: "0.75rem", color: "#0284c7" }}>
                                    Manager can configure this conversion factor in settings.
                                </div>
                            )}
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85em", fontWeight: 600, color: "#475569" }}>
                                    Brass
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    style={{
                                        width: "100%", padding: "0.65rem", borderRadius: "8px",
                                        border: "1px solid #d1d5db", fontSize: "1rem", boxSizing: "border-box",
                                        color: "#000", background: "#f8fafc"
                                    }}
                                    placeholder="Enter brass quantity"
                                    value={brass}
                                    onChange={handleBrassChange}
                                />
                            </div>

                            <div style={{ textAlign: "center", fontSize: "1.1rem", color: "#94a3b8", fontWeight: "bold" }}>
                                ⇅ (1 Brass = {tonsPerBrass} Tons)
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85em", fontWeight: 600, color: "#475569" }}>
                                    Tons (MT)
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    style={{
                                        width: "100%", padding: "0.65rem", borderRadius: "8px",
                                        border: "1px solid #d1d5db", fontSize: "1rem", boxSizing: "border-box",
                                        color: "#000", background: "#f8fafc"
                                    }}
                                    placeholder="Enter metric tons"
                                    value={tons}
                                    onChange={handleTonsChange}
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