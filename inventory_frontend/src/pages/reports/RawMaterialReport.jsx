import React, { useMemo, useState, useEffect } from "react";
import Pagination from "../../components/common/Pagination";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";
import { exportToFormattedExcel } from "../../utils/excelGenerator";
import { useAuth } from "../../context/AuthContext";
import { generateRawMaterialReportPdf } from "../../utils/pdfGenerator";
import { requestReportPrint } from "../../services/approvalApi";
import { formatDate, formatTime, formatDurationHM, tonToBrass } from "../../utils/formatUtils";
import { getSettings } from "../../services/settingsApi";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

const fmtNum = (v) => Number(v || 0).toFixed(2);

const monthLabel = (dateStr) => {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1]} ${y}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#1e293b", color: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => <div key={i}>{p.name}: <strong>{fmtNum(p.value)}</strong></div>)}
        </div>
    );
};

export default function RawMaterialReport({ activities, vehicles }) {
    const { isManager, isClerk } = useAuth();

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCharts, setShowCharts] = useState(false);

    // Checkbox Selection State for Selective Export
    const [selectedActivityIds, setSelectedActivityIds] = useState(new Set());

    // Conversion Factor State
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    useEffect(() => {
        getSettings()
            .then(res => {
                if (res.data && res.data.tons_per_brass) {
                    setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                }
            })
            .catch(err => console.error("Failed to load settings in RawMaterialReport:", err));
    }, []);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalReason, setApprovalReason] = useState("");
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setDateFrom("");
        setDateTo("");
        setMonthFilter("");
        setVehicleFilter("");
        setSearchQuery("");
        setSelectedActivityIds(new Set());
        setCurrentPage(1);
    };

    const filtered = useMemo(() => {
        return activities.filter((r) => {
            if (dateFrom && r.activity_date < dateFrom) return false;
            if (dateTo && r.activity_date > dateTo) return false;

            if (monthFilter) {
                const rowMonth = r.activity_date?.slice(0, 7);
                if (rowMonth !== monthFilter) return false;
            }

            if (vehicleFilter && r.vehicle_number !== vehicleFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchVehicle = r.vehicle_number?.toLowerCase().includes(q);
                const matchSite = r.site?.toLowerCase().includes(q);
                const matchDate = r.activity_date?.toLowerCase().includes(q);
                if (!matchVehicle && !matchSite && !matchDate) return false;
            }

            return true;
        });
    }, [activities, dateFrom, dateTo, monthFilter, vehicleFilter, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filtered.length]);

    // Checkbox Selection Logic
    const isAllSelected = useMemo(() => {
        return filtered.length > 0 && filtered.every(r => selectedActivityIds.has(r.activity_id));
    }, [filtered, selectedActivityIds]);

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedActivityIds(new Set());
        } else {
            setSelectedActivityIds(new Set(filtered.map(r => r.activity_id)));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedActivityIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getExportData = () => {
        if (selectedActivityIds.size > 0) {
            return filtered.filter(r => selectedActivityIds.has(r.activity_id));
        }
        return filtered;
    };

    const totalGross = useMemo(() => filtered.reduce((acc, r) => acc + (parseFloat(r.total_weight) || 0), 0), [filtered]);
    const totalVehWt = useMemo(() => filtered.reduce((acc, r) => acc + (parseFloat(r.vehicle_weight) || 0), 0), [filtered]);
    const totalNet = useMemo(() => filtered.reduce((acc, r) => acc + (parseFloat(r.net_weight) || 0), 0), [filtered]);

    const byMonth = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const m = monthLabel(r.activity_date);
            map[m] = (map[m] || 0) + (parseFloat(r.net_weight) || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const byVehicle = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const v = r.vehicle_number || "Unknown";
            map[v] = (map[v] || 0) + (parseFloat(r.net_weight) || 0);
        });
        return Object.entries(map)
            .map(([vehicle, tons]) => ({ vehicle, tons: parseFloat(tons.toFixed(2)) }))
            .sort((a, b) => b.tons - a.tons)
            .slice(0, 10);
    }, [filtered]);

    const currentFilters = { dateFrom, dateTo, month: monthFilter, vehicle: vehicleFilter };

    const handlePrintOrRequest = () => {
        const exportData = getExportData();
        if (exportData.length === 0) {
            alert("No raw material trip entries selected for PDF export.");
            return;
        }

        if (isManager) {
            generateRawMaterialReportPdf(exportData, currentFilters, tonsPerBrass);
        } else {
            setShowApprovalModal(true);
        }
    };

    const submitApprovalRequest = async () => {
        if (!approvalReason.trim()) {
            alert("Please provide a reason for the print approval request.");
            return;
        }

        const exportData = getExportData();
        setIsSubmittingApproval(true);
        try {
            await requestReportPrint({
                report_type: "Raw Material Report",
                parameters: {
                    date_from: dateFrom,
                    date_to: dateTo,
                    month: monthFilter,
                    vehicle: vehicleFilter,
                    records_count: exportData.length
                },
                reason: approvalReason.trim()
            });

            alert("Print request submitted successfully! A Manager will review your request.");
            setShowApprovalModal(false);
            setApprovalReason("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit print request.");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleExportExcel = () => {
        const exportData = getExportData();
        if (exportData.length === 0) {
            alert("No raw material trip entries selected to export.");
            return;
        }

        let vehicleName = "All Vehicles";
        if (vehicleFilter) vehicleName = vehicleFilter;

        const isSelection = selectedActivityIds.size > 0;
        const subtitle = `Vehicle: ${vehicleName} | Date: ${dateFrom || "Start"} to ${dateTo || "End"}${isSelection ? ` | Selected (${selectedActivityIds.size} entries)` : ""}`;

        const rows = exportData.map(r => ({
            "Date": formatDate(r.activity_date),
            "Vehicle Number": r.vehicle_number,
            "Site": r.site || "",
            "Arrival Time": formatTime(r.arrival_time),
            "Loading Start": formatTime(r.loading_start_time),
            "Unloading End": formatTime(r.unloading_end_time),
            "Turnaround Time (hr/min)": formatDurationHM(r.turnaround_time),
            "Gross Weight (MT)": Number((Number(r.total_weight || 0)).toFixed(2)),
            "Vehicle Weight (MT)": Number((Number(r.vehicle_weight || 0)).toFixed(2)),
            "Net Weight (MT)": Number((Number(r.net_weight || 0)).toFixed(2)),
            "Net Weight (Brass)": Number(tonToBrass(r.net_weight || 0, tonsPerBrass).toFixed(2)),
        }));

        exportToFormattedExcel({
            title: `Raw Material Report`,
            subtitle,
            sheetName: "Raw Material Report",
            rows,
            fileName: "raw_material_report.xlsx"
        });
    };

    return (
        <div className="report-container">
            <div className="report-action-bar">
                <div className="action-bar-left" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="report-count-badge">
                        {filtered.length} {filtered.length === 1 ? "Trip" : "Trips"}
                    </span>
                    {selectedActivityIds.size > 0 && (
                        <span style={{
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                            padding: "4px 10px",
                            borderRadius: "16px",
                            fontSize: "0.85rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}>
                            Selected: {selectedActivityIds.size} / {filtered.length}
                            <button
                                onClick={() => setSelectedActivityIds(new Set())}
                                style={{ background: "none", border: "none", color: "#ef4444", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" }}
                                title="Clear Selection"
                            >
                                ✕
                            </button>
                        </span>
                    )}
                    <button
                        className={`toggle-charts-btn ${showCharts ? "active" : ""}`}
                        onClick={() => setShowCharts(!showCharts)}
                    >
                        {showCharts ? "📊 Hide Graph" : "📈 Show Graph"}
                    </button>
                </div>
                <div className="action-bar-right">
                    <button className="export-btn excel" onClick={handleExportExcel}>
                        📥 Export Excel {selectedActivityIds.size > 0 ? `(${selectedActivityIds.size})` : ""}
                    </button>
                    <button
                        className="export-btn pdf"
                        onClick={handlePrintOrRequest}
                        title={isClerk ? "Request Manager approval to print" : "Download PDF report"}
                    >
                        {isClerk ? "💬 Request Print Approval" : `📄 Download PDF ${selectedActivityIds.size > 0 ? `(${selectedActivityIds.size})` : ""}`}
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="🔍 Search raw material trips by Vehicle, Site, or Date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.95rem",
                        outline: "none",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                        transition: "all 0.2s",
                        boxSizing: "border-box"
                    }}
                />
            </div>

            <div className="report-filters">
                <div className="filter-group">
                    <label>From Date</label>
                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setMonthFilter(""); }} />
                </div>
                <div className="filter-group">
                    <label>To Date</label>
                    <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setMonthFilter(""); }} />
                </div>
                <div className="filter-group">
                    <label>Month</label>
                    <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setDateFrom(""); setDateTo(""); }} />
                </div>
                <div className="filter-group">
                    <label>Vehicle</label>
                    <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}>
                        <option value="">All Vehicles</option>
                        {vehicles.map(v => (
                            <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>
                        ))}
                    </select>
                </div>
                <button className="filter-reset-btn" onClick={resetFilters}>✕ Reset</button>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card blue">
                    <div className="kpi-label">Total Trips</div>
                    <div className="kpi-value">{filtered.length}</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-label">Total Net Weight (MT)</div>
                    <div className="kpi-value">{fmtNum(totalNet)}</div>
                    <div className="kpi-sub">≈ {tonToBrass(totalNet, tonsPerBrass).toFixed(2)} Brass</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-label">Total Gross Weight (MT)</div>
                    <div className="kpi-value">{fmtNum(totalGross)}</div>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-label">Total Vehicle Tare (MT)</div>
                    <div className="kpi-value">{fmtNum(totalVehWt)}</div>
                </div>
            </div>

            {showCharts && (
                <div className="charts-grid">
                    {byMonth.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Monthly Raw Material Inflow (MT)</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="tons" name="Inflow MT" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {byVehicle.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Top 10 Vehicles by Inflow Volume (MT)</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={byVehicle} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="vehicle" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={40} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="tons" name="Inflow MT" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            <div className="report-table-card">
                <div className="table-wrapper">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th style={{ width: "38px", textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleSelectAll}
                                        title={isAllSelected ? "Deselect All" : "Select All Filtered"}
                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                    />
                                </th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>#</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Date</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Vehicle Number</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Site</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Arrival</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Start</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>End</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>T/Around</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Gross (MT)</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Tare (MT)</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Net (MT)</th>
                                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Net (Brass)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="empty-row">
                                        No raw material trip records match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filtered
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((r, i) => {
                                        const isSelected = selectedActivityIds.has(r.activity_id);
                                        return (
                                            <tr key={r.activity_id} style={{ backgroundColor: isSelected ? "#f0f9ff" : "transparent" }}>
                                                <td style={{ textAlign: "center" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectOne(r.activity_id)}
                                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                                    />
                                                </td>
                                                <td style={{ color: "#9ca3af", fontSize: 12 }}>
                                                    {(currentPage - 1) * pageSize + i + 1}
                                                </td>
                                                <td>{formatDate(r.activity_date)}</td>
                                                <td><strong>{r.vehicle_number}</strong></td>
                                                <td>{r.site || "—"}</td>
                                                <td>{formatTime(r.arrival_time)}</td>
                                                <td>{formatTime(r.loading_start_time)}</td>
                                                <td>{formatTime(r.unloading_end_time)}</td>
                                                <td style={{ textAlign: "right" }}>{formatDurationHM(r.turnaround_time)}</td>
                                                <td style={{ textAlign: "right" }}>{fmtNum(r.total_weight)}</td>
                                                <td style={{ textAlign: "right", color: "#6b7280" }}>{fmtNum(r.vehicle_weight)}</td>
                                                <td style={{ textAlign: "right" }}>{fmtNum(r.net_weight)} MT</td>
                                                <td style={{ textAlign: "right", fontWeight: 600, color: "#16a34a" }}>{tonToBrass(r.net_weight, tonsPerBrass).toFixed(2)} Brass</td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filtered.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                    />
                </div>
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
                        <h3 style={{ margin: "0 0 1rem 0", color: "#1e1b4b" }}>💬 Request Print Approval</h3>
                        <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1rem" }}>
                            As a Clerk, exporting or printing raw material reports requires Manager approval. Please enter a reason for this request.
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
                                placeholder="e.g., Vehicle owner requested monthly trip log..."
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
    );
}
