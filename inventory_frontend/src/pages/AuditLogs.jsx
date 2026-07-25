import React, { useState, useEffect, useMemo } from "react";
import Layout from "../layouts/Layout";
import { getAuditLogs } from "../services/auditApi";
import Pagination from "../components/common/Pagination";
import QuickDatePresets from "../components/common/QuickDatePresets";
import { exportToFormattedExcel } from "../utils/excelGenerator";
import { useAuth } from "../context/AuthContext";
import { requestReportPrint } from "../services/approvalApi";

export default function AuditLogs() {
    const { isManager } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalReason, setApprovalReason] = useState("");
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [moduleFilter, setModuleFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [activePreset, setActivePreset] = useState("");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (moduleFilter) params.module = moduleFilter;
            if (actionFilter) params.action_type = actionFilter;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;
            if (searchQuery) params.search = searchQuery;

            const res = await getAuditLogs(params);
            setLogs(res.data || []);
        } catch (err) {
            console.error("Failed to fetch audit logs:", err);
            setError("Failed to load audit logs. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [moduleFilter, actionFilter, dateFrom, dateTo]);

    // Debounced search trigger
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectPreset = ({ dateFrom, dateTo, key }) => {
        setDateFrom(dateFrom);
        setDateTo(dateTo);
        setActivePreset(key);
    };

    const resetFilters = () => {
        setSearchQuery("");
        setModuleFilter("");
        setActionFilter("");
        setDateFrom("");
        setDateTo("");
        setActivePreset("");
    };

    // Filtered & Paginated Logs
    const filteredLogs = useMemo(() => {
        return logs;
    }, [logs]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, currentPage, pageSize]);

    // KPI Counters
    const kpis = useMemo(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        let loginsToday = 0;
        let totalEditsDeletes = 0;
        let totalApprovals = 0;

        logs.forEach(l => {
            if (l.created_at && l.created_at.startsWith(todayStr) && l.action_type === "LOGIN") {
                loginsToday++;
            }
            if (["EDIT", "DELETE"].includes(l.action_type)) {
                totalEditsDeletes++;
            }
            if (["APPROVE", "REJECT"].includes(l.action_type)) {
                totalApprovals++;
            }
        });

        return {
            total: logs.length,
            loginsToday,
            totalEditsDeletes,
            totalApprovals
        };
    }, [logs]);

    const getActionBadgeClass = (action) => {
        switch (action) {
            case "LOGIN": return { bg: "#dcfce7", color: "#15803d", border: "#86efac" };
            case "LOGIN_FAILED": return { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" };
            case "CREATE": return { bg: "#e0e7ff", color: "#4338ca", border: "#a5b4fc" };
            case "EDIT": return { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" };
            case "DELETE": return { bg: "#ffe4e6", color: "#be123c", border: "#fda4af" };
            case "APPROVE": return { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" };
            case "REJECT": return { bg: "#f3e8ff", color: "#6b21a8", border: "#d8b4fe" };
            case "EXPORT": return { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" };
            default: return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
        }
    };

    const submitApprovalRequest = async () => {
        if (!approvalReason.trim()) {
            alert("Please provide a reason for the approval request.");
            return;
        }

        setIsSubmittingApproval(true);
        try {
            await requestReportPrint({
                report_type: "Audit Logs",
                format: "excel",
                parameters: {
                    date_from: dateFrom,
                    date_to: dateTo,
                    module: moduleFilter,
                    action: actionFilter,
                    search: searchQuery,
                    records_count: filteredLogs.length
                },
                reason: approvalReason.trim()
            });

            alert("Excel export request submitted successfully! A Manager will review your request.");
            setShowApprovalModal(false);
            setApprovalReason("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit export request.");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleExportExcel = () => {
        if (!isManager) {
            setShowApprovalModal(true);
            return;
        }

        const rows = filteredLogs.map(l => ({
            "Timestamp": l.created_at,
            "User": l.username,
            "Role": l.role,
            "Action": l.action_type,
            "Module": l.module,
            "Description": l.description,
        }));

        exportToFormattedExcel({
            title: "User Activity Audit Logs",
            subtitle: `Generated on ${new Date().toLocaleString()}`,
            sheetName: "Audit Logs",
            rows,
            fileName: "user_activity_audit_logs.xlsx"
        });
    };

    return (
        <Layout>
            <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.6rem", color: "#1e1b4b", display: "flex", alignItems: "center", gap: "10px" }}>
                            🛡️ User Login & Activity Audit Logs
                        </h1>
                        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                            Complete audit trail of user logins, record modifications, manager approvals, and security events.
                        </p>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#16a34a",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
                        }}
                    >
                        📊 Export Logs to Excel
                    </button>
                </div>

                {/* KPI Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ background: "white", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Logged Events</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>{kpis.total}</div>
                    </div>
                    <div style={{ background: "white", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Logins Today</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>{kpis.loginsToday}</div>
                    </div>
                    <div style={{ background: "white", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Edits & Deletes</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>{kpis.totalEditsDeletes}</div>
                    </div>
                    <div style={{ background: "white", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Manager Approvals</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#7c3aed", marginTop: "4px" }}>{kpis.totalApprovals}</div>
                    </div>
                </div>

                {/* Quick Date Presets */}
                <QuickDatePresets onSelectPreset={handleSelectPreset} activePreset={activePreset} />

                {/* Search & Filters Bar */}
                <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Search</label>
                            <input
                                type="text"
                                placeholder="🔍 Username, Description, IP..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Module</label>
                            <select
                                value={moduleFilter}
                                onChange={(e) => setModuleFilter(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                            >
                                <option value="">All Modules</option>
                                <option value="Auth">Auth & Authentication</option>
                                <option value="Sales">Sales Management</option>
                                <option value="Production">Production</option>
                                <option value="RawMaterial">Raw Material</option>
                                <option value="Approvals">Manager Approvals</option>
                                <option value="Reports">Reports & Exports</option>
                                <option value="Vehicle">Vehicles</option>
                                <option value="Party">Parties</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Action Type</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
                            >
                                <option value="">All Actions</option>
                                <option value="LOGIN">LOGIN</option>
                                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                                <option value="CREATE">CREATE</option>
                                <option value="EDIT">EDIT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="APPROVE">APPROVE</option>
                                <option value="REJECT">REJECT</option>
                                <option value="EXPORT">EXPORT</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setActivePreset(""); }}
                                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setActivePreset(""); }}
                                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.88rem", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                        <button
                            onClick={resetFilters}
                            style={{ padding: "6px 14px", backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}
                        >
                            ✕ Reset Filters
                        </button>
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    {loading ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading activity logs...</div>
                    ) : error ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#dc2626" }}>{error}</div>
                    ) : paginatedLogs.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No audit log entries found matching your criteria.</div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", textAlign: "left" }}>
                                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Timestamp</th>
                                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>User</th>
                                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Role</th>
                                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Action</th>
                                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Module</th>
                                        <th style={{ padding: "12px 16px", fontWeight: 700 }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLogs.map((log) => {
                                        const badgeStyle = getActionBadgeClass(log.action_type);
                                        return (
                                            <tr key={log.log_id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                                                <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.82rem" }}>
                                                    {log.created_at}
                                                </td>
                                                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1e293b" }}>
                                                    {log.username}
                                                </td>
                                                <td style={{ padding: "12px 16px" }}>
                                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", backgroundColor: log.role === "Manager" ? "#fef3c7" : "#e0f2fe", color: log.role === "Manager" ? "#92400e" : "#0369a1" }}>
                                                        {log.role}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 16px" }}>
                                                    <span style={{
                                                        fontSize: "0.75rem",
                                                        fontWeight: 800,
                                                        padding: "3px 10px",
                                                        borderRadius: "12px",
                                                        backgroundColor: badgeStyle.bg,
                                                        color: badgeStyle.color,
                                                        border: `1px solid ${badgeStyle.border}`
                                                    }}>
                                                        {log.action_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#334155" }}>
                                                    {log.module}
                                                </td>
                                                <td style={{ padding: "12px 16px", color: "#334155" }}>
                                                    {log.description}
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && filteredLogs.length > 0 && (
                        <div style={{ padding: "16px", borderTop: "1px solid #e2e8f0" }}>
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredLogs.length}
                                pageSize={pageSize}
                                onPageChange={(page) => setCurrentPage(page)}
                                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                            />
                        </div>
                    )}
                </div>

                {showApprovalModal && (
                    <div style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                        justifyContent: "center", alignItems: "center", zIndex: 1000
                    }}>
                        <div style={{
                            background: "white", padding: "2rem", borderRadius: "12px",
                            width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                        }}>
                            <h3 style={{ margin: "0 0 1rem 0", color: "#1e1b4b" }}>💬 Request Excel Export Approval</h3>
                            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1rem" }}>
                                As a Clerk, exporting audit log spreadsheets requires Manager approval. Please enter a reason for this request.
                            </p>
                            <div style={{ marginBottom: "1.5rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                                    Reason for Request *
                                </label>
                                <textarea
                                    rows="3"
                                    style={{
                                        width: "100%", padding: "0.75rem", borderRadius: "8px",
                                        border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none"
                                    }}
                                    placeholder="e.g., Requesting Excel export for security audit review..."
                                    value={approvalReason}
                                    onChange={(e) => setApprovalReason(e.target.value)}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                                <button
                                    style={{ padding: "0.6rem 1.2rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 600, cursor: "pointer" }}
                                    onClick={() => setShowApprovalModal(false)}
                                    disabled={isSubmittingApproval}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={{ padding: "0.6rem 1.2rem", borderRadius: "6px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" }}
                                    onClick={submitApprovalRequest}
                                    disabled={isSubmittingApproval}
                                >
                                    {isSubmittingApproval ? "Submitting..." : "Submit Request"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
