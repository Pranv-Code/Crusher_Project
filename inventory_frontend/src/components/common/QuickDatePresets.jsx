import React from "react";

export default function QuickDatePresets({ onSelectPreset, activePreset }) {
    const getPresetDates = (type) => {
        const today = new Date();
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        if (type === "today") {
            const dateStr = formatDate(today);
            return { dateFrom: dateStr, dateTo: dateStr, key: "today" };
        }
        if (type === "yesterday") {
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            const dateStr = formatDate(yest);
            return { dateFrom: dateStr, dateTo: dateStr, key: "yesterday" };
        }
        if (type === "this_week") {
            const first = new Date(today);
            const day = first.getDay() || 7;
            first.setDate(first.getDate() - day + 1);
            return { dateFrom: formatDate(first), dateTo: formatDate(today), key: "this_week" };
        }
        if (type === "this_month") {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            return { dateFrom: formatDate(first), dateTo: formatDate(today), key: "this_month" };
        }
        if (type === "last_30_days") {
            const prev = new Date(today);
            prev.setDate(prev.getDate() - 30);
            return { dateFrom: formatDate(prev), dateTo: formatDate(today), key: "last_30_days" };
        }
        return { dateFrom: "", dateTo: "", key: "" };
    };

    const handlePresetClick = (type) => {
        const res = getPresetDates(type);
        onSelectPreset(res);
    };

    const presets = [
        { key: "today", label: "Today" },
        { key: "yesterday", label: "Yesterday" },
        { key: "this_week", label: "This Week" },
        { key: "this_month", label: "This Month" },
        { key: "last_30_days", label: "Last 30 Days" }
    ];

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "10px"
        }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Quick Presets:
            </span>
            {presets.map(p => {
                const isActive = activePreset === p.key;
                return (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => handlePresetClick(p.key)}
                        style={{
                            padding: "4px 12px",
                            borderRadius: "16px",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            border: isActive ? "1.5px solid #d97706" : "1px solid #cbd5e1",
                            backgroundColor: isActive ? "#fef3c7" : "#ffffff",
                            color: isActive ? "#92400e" : "#475569",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isActive ? "0 2px 4px rgba(217,119,6,0.15)" : "none"
                        }}
                    >
                        {p.label}
                    </button>
                );
            })}
        </div>
    );
}
