import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import "./ConfirmModal.css";

// Global bridge for instant custom alert triggering across the whole system
let globalSetAlertData = null;

window.alert = (message, forcedType) => {
    const text = typeof message === "object" ? JSON.stringify(message) : String(message || "");
    const lower = text.toLowerCase();

    let isSuccess = false;
    if (forcedType === "success") {
        isSuccess = true;
    } else if (forcedType === "error" || forcedType === "failure") {
        isSuccess = false;
    } else {
        isSuccess = (
            lower.includes("success") ||
            lower.includes("approved") ||
            lower.includes("created") ||
            lower.includes("updated") ||
            lower.includes("submitted") ||
            lower.includes("recorded") ||
            lower.includes("saved") ||
            lower.includes("restocked")
        ) && !lower.includes("failed") && !lower.includes("error") && !lower.includes("compulsory") && !lower.includes("required");
    }

    if (globalSetAlertData) {
        globalSetAlertData({
            title: isSuccess ? "Success" : "Notice",
            message: text,
            isSuccess
        });
    } else {
        console.warn("Alert triggered:", text);
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

    const isSuccess = alertData.isSuccess;

    return (
        <div className="modal-overlay" style={{ zIndex: 99999, background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(2px)" }}>
            <div className="confirm-modal" style={{ maxWidth: "440px", width: "90%", textAlign: "center", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)", borderRadius: "16px" }}>
                <div style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: isSuccess ? "#d1fae5" : "#fee2e2",
                    color: isSuccess ? "#059669" : "#dc2626",
                    border: `2px solid ${isSuccess ? "#10b981" : "#f87171"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                    fontSize: "26px",
                    fontWeight: "bold"
                }}>
                    {isSuccess ? "✓" : "!"}
                </div>
                <h3 style={{ margin: "0 0 12px 0", color: isSuccess ? "#065f46" : "#991b1b", fontSize: "1.2rem", fontWeight: 700 }}>
                    {alertData.title}
                </h3>
                <p style={{ color: "#334155", fontSize: "0.95rem", marginBottom: "24px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {alertData.message}
                </p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Button
                        variant={isSuccess ? "success" : "danger"}
                        onClick={() => setAlertData(null)}
                        style={{
                            minWidth: "120px",
                            padding: "10px 24px",
                            fontSize: "14px",
                            borderRadius: "8px",
                            fontWeight: 600,
                            backgroundColor: isSuccess ? "#10b981" : "#dc2626",
                            color: "#ffffff"
                        }}
                    >
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default CustomAlertModal;
