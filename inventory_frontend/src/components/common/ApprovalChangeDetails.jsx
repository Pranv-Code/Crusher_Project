import React from "react";

export default function ApprovalChangeDetails({ request }) {
    if (!request) return null;

    const details = request.change_details || {};
    const rawFields = details.fields || [];
    const isDelete = details.action_badge === "DELETE" || request.request_type?.includes("delete");

    // Sort modified fields first so managers notice them immediately
    const sortedFields = [...rawFields].sort((a, b) => (b.changed ? 1 : 0) - (a.changed ? 1 : 0));
    const changedCount = rawFields.filter(f => f.changed).length;

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            fontFamily: "Inter, 'Segoe UI', sans-serif"
        }}>
            {/* Action Banner */}
            <div style={{
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: isDelete ? "#fee2e2" : "#fef3c7",
                border: `1px solid ${isDelete ? "#fca5a5" : "#fcd34d"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontWeight: "800",
                        fontSize: "0.75rem",
                        backgroundColor: isDelete ? "#dc2626" : "#d97706",
                        color: "white",
                        letterSpacing: "0.5px"
                    }}>
                        {details.action_badge || request.request_type?.toUpperCase()}
                    </span>
                    <span style={{
                        fontSize: "0.95rem",
                        fontWeight: "700",
                        color: isDelete ? "#991b1b" : "#92400e"
                    }}>
                        {details.title || `Request #${request.request_id}`}
                    </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    Requester: <strong>{request.requester_name || "Clerk"}</strong>
                </span>
            </div>

            {/* Short Summary & Modified Counter */}
            {details.short_summary && (
                <div style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#374151",
                    padding: "10px 14px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "6px",
                    borderLeft: "4px solid #3b82f6",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <span>Summary: {details.short_summary}</span>
                    {changedCount > 0 && (
                        <span style={{
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            backgroundColor: "#dbeafe",
                            color: "#1e40af",
                            padding: "3px 8px",
                            borderRadius: "12px"
                        }}>
                            {changedCount} {changedCount === 1 ? "Field Changed" : "Fields Changed"}
                        </span>
                    )}
                </div>
            )}

            {/* Deletion Warning Box */}
            {isDelete && (
                <div style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    backgroundColor: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#be123c",
                    fontSize: "0.85rem",
                    fontWeight: "600"
                }}>
                    ⚠️ Warning: Approving this request will permanently remove this record from inventory and stock balances.
                </div>
            )}

            {/* Fields Comparison Table */}
            {sortedFields.length > 0 ? (
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f3f4f6", color: "#374151", textAlign: "left" }}>
                                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Field</th>
                                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Current Value</th>
                                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Proposed Change</th>
                                <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedFields.map((f, idx) => (
                                <tr key={idx} style={{
                                    backgroundColor: f.changed ? (isDelete ? "#fef2f2" : "#fffbeb") : "white",
                                    borderBottom: idx < sortedFields.length - 1 ? "1px solid #f3f4f6" : "none"
                                }}>
                                    <td style={{ padding: "10px 12px", fontWeight: "600", color: "#1f2937" }}>
                                        {f.field}
                                    </td>
                                    <td style={{ padding: "10px 12px", color: f.changed ? "#6b7280" : "#374151" }}>
                                        {f.current}
                                    </td>
                                    <td style={{
                                        padding: "10px 12px",
                                        fontWeight: f.changed ? "700" : "normal",
                                        color: f.changed ? (isDelete ? "#dc2626" : "#b45309") : "#374151"
                                    }}>
                                        {f.proposed}
                                    </td>
                                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                        {f.changed ? (
                                            <span style={{
                                                padding: "2px 8px",
                                                borderRadius: "12px",
                                                fontSize: "0.72rem",
                                                fontWeight: "700",
                                                backgroundColor: isDelete ? "#fee2e2" : "#fef3c7",
                                                color: isDelete ? "#991b1b" : "#92400e"
                                            }}>
                                                MODIFIED
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                                                Unchanged
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ fontSize: "0.88rem", color: "#4b5563", padding: "10px", background: "#f9fafb", borderRadius: "6px" }}>
                    Details: {request.details || "No additional parameters provided."}
                </div>
            )}
        </div>
    );
}
