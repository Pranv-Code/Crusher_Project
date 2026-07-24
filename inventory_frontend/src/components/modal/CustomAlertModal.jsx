import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import "./ConfirmModal.css";

// Global bridge for instant alert triggering
let globalSetAlertData = null;

window.alert = (message) => {
    const text = typeof message === "object" ? JSON.stringify(message) : String(message || "");
    if (globalSetAlertData) {
        globalSetAlertData({
            title: "Crusher Inventory System",
            message: text
        });
    } else {
        console.warn("Alert triggered before modal ready:", text);
    }
};

function CustomAlertModal() {
    const [alertData, setAlertData] = useState(null);

    useEffect(() => {
        globalSetAlertData = setAlertData;
        return () => {
            globalSetAlertData = null;
        };
    }, []);

    if (!alertData) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 99999, background: "rgba(0, 0, 0, 0.6)" }}>
            <div className="confirm-modal" style={{ maxWidth: "440px", width: "90%", textAlign: "center", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#fee2e2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    fontSize: "24px",
                    fontWeight: "bold"
                }}>
                    !
                </div>
                <h3 style={{ margin: "0 0 12px 0", color: "#1e1b4b", fontSize: "1.15rem", fontWeight: 700 }}>
                    {alertData.title}
                </h3>
                <p style={{ color: "#475569", fontSize: "0.95rem", marginBottom: "24px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {alertData.message}
                </p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Button
                        variant="primary"
                        onClick={() => setAlertData(null)}
                        style={{ minWidth: "120px", padding: "10px 24px", fontSize: "14px" }}
                    >
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default CustomAlertModal;
