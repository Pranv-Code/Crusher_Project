import React, { useEffect } from "react";
import "./Toast.css";

export default function Toast({ message, type = "success", onClose, duration = 4000 }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    const isSuccess = type === "success" || type === "approved";
    const icon = isSuccess ? "🟢" : "🔴";

    return (
        <div className={`toast-alert ${isSuccess ? "toast-success" : "toast-failure"}`}>
            <span className="toast-icon">{icon}</span>
            <span className="toast-message">{message}</span>
            {onClose && (
                <button className="toast-close-btn" onClick={onClose} title="Close alert">
                    ✕
                </button>
            )}
        </div>
    );
}
