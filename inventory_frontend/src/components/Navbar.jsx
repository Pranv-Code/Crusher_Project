import React, { useState } from "react";
import "../css/navbar.css";

function Navbar() {
    const [showModal, setShowModal] = useState(false);
    const [tons, setTons] = useState("");
    const [brass, setBrass] = useState("");

    const today = new Date().toLocaleDateString();

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
            <div className="nav-logo">
                <h2>WHITE CLOUD</h2>
                <p>GLOBAL SOLUTIONS</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
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