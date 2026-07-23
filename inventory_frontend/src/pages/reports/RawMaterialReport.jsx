import { useMemo, useState, useEffect } from "react";
import Pagination from "../../components/common/Pagination";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { generateRawMaterialReportPdf } from "../../utils/pdfGenerator";
import { requestReportPrint } from "../../services/approvalApi";
import { formatDate, formatTime } from "../../utils/formatUtils";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

const fmtNum = (v) => Number(v || 0).toFixed(2);

const monthLabel = (dateStr) => {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1]} ${y}`;
};

import { exportToFormattedExcel } from "../../utils/excelGenerator";



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
    const [pdfUnit, setPdfUnit] = useState("tons");

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [pendingRequest, setPendingRequest] = useState(null);
    const [submittingRequest, setSubmittingRequest] = useState(false);

    const handleRequestApproval = async () => {
        if (!pendingRequest) return;
        setSubmittingRequest(true);
        try {
            await requestReportPrint(pendingRequest);
            alert("Request submitted successfully! Check status in 'My Pending Work'.");
            setShowApprovalModal(false);
            setPendingRequest(null);
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data?.error || "Failed to submit request.");
        } finally {
            setSubmittingRequest(false);
        }
    };

    const filtered = useMemo(() => {
        return activities.filter((a) => {
            if (dateFrom && a.activity_date < dateFrom) return false;
            if (dateTo && a.activity_date > dateTo) return false;
            if (monthFilter && a.activity_date?.slice(0, 7) !== monthFilter) return false;
            if (vehicleFilter && a.vehicle_number !== vehicleFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    a.vehicle_number?.toLowerCase().includes(q) ||
                    a.driver_name?.toLowerCase().includes(q) ||
                    a.remarks?.toLowerCase().includes(q) ||
                    String(a.net_weight || "").includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [activities, dateFrom, dateTo, monthFilter, vehicleFilter, searchQuery]);

    // Reset pagination when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filtered.length]);

    const totalNetWeight = filtered.reduce((s, r) => s + parseFloat(r.net_weight || 0), 0);
    const totalGrossWeight = filtered.reduce((s, r) => s + parseFloat(r.total_weight || 0), 0);
    const avgNetWeight = filtered.length ? totalNetWeight / filtered.length : 0;

    const byMonth = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const m = monthLabel(r.activity_date);
            map[m] = (map[m] || 0) + parseFloat(r.net_weight || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const byVehicle = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.vehicle_number] = (map[r.vehicle_number] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, trips]) => ({ name, value: trips }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [filtered]);

    const dailyTrend = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.activity_date] = (map[r.activity_date] || 0) + parseFloat(r.net_weight || 0);
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tons]) => ({ date, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const netWeightByVehicle = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.vehicle_number] = (map[r.vehicle_number] || 0) + parseFloat(r.net_weight || 0);
        });
        return Object.entries(map)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, tons]) => ({ name, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const handleExport = () => {
        const label = `Raw Material Report (Excel) | Unit: ${pdfUnit} | Filters: Vehicle: ${vehicleFilter || "All"}, Date: ${dateFrom || "Start"} to ${dateTo || "End"}, Month: ${monthFilter || "All"}, Search: ${searchQuery || "None"}`;
        const requestData = {
            report_type: "raw",
            format: "excel",
            pdf_unit: pdfUnit,
            filters: {
                dateFrom,
                dateTo,
                monthFilter,
                vehicleFilter,
                searchQuery
            },
            label: label
        };
        if (isClerk) {
            setPendingRequest(requestData);
            setShowApprovalModal(true);
            return;
        }

        const multiplier = pdfUnit === "brass" ? 4.2 : 1.0;
        const totalHeader = pdfUnit === "brass" ? "Total Weight (Brass)" : "Total Weight (MT)";
        const vehHeader   = pdfUnit === "brass" ? "Vehicle Weight (Brass)" : "Vehicle Weight (MT)";
        const netHeader   = pdfUnit === "brass" ? "Net Weight (Brass)" : "Net Weight (MT)";

        const subtitle = `Unit: ${pdfUnit.toUpperCase()} | Vehicle: ${vehicleFilter || "All"} | Date: ${dateFrom || "Start"} to ${dateTo || "End"} | Month: ${monthFilter || "All"}${searchQuery ? ` | Search: "${searchQuery}"` : ""}`;

        const rows = filtered.map(r => ({
            "Date": formatDate(r.activity_date),
            "Vehicle": r.vehicle_number,
            "Site": r.site || "",
            "Arrival Time": formatTime(r.arrival_time),
            "Loading Start": formatTime(r.loading_start_time),
            "Unloading End": formatTime(r.unloading_end_time),
            "Turnaround Time": r.turnaround_time || "",
            [totalHeader]: Number((Number(r.total_weight || 0) * multiplier).toFixed(2)),
            [vehHeader]:   Number((Number(r.vehicle_weight || 0) * multiplier).toFixed(2)),
            [netHeader]:   Number((Number(r.net_weight || 0) * multiplier).toFixed(2)),
        }));

        exportToFormattedExcel({
            title: `Raw Material Report (${pdfUnit.toUpperCase()})`,
            subtitle,
            sheetName: "Raw Material Report",
            rows,
            fileName: "raw_material_report.xlsx"
        });
    };

    const handlePdfExport = () => {
        const label = `Raw Material Report (PDF) | Unit: ${pdfUnit} | Filters: Vehicle: ${vehicleFilter || "All"}, Date: ${dateFrom || "Start"} to ${dateTo || "End"}, Month: ${monthFilter || "All"}, Search: ${searchQuery || "None"}`;
        const requestData = {
            report_type: "raw",
            format: "pdf",
            pdf_unit: pdfUnit,
            filters: {
                dateFrom,
                dateTo,
                monthFilter,
                vehicleFilter,
                searchQuery
            },
            label: label
        };
        if (isClerk) {
            setPendingRequest(requestData);
            setShowApprovalModal(true);
            return;
        }

        generateRawMaterialReportPdf(filtered, {
            dateFrom,
            dateTo,
            month: monthFilter,
            vehicle: vehicleFilter
        }, pdfUnit);
    };

    const resetFilters = () => {
        setDateFrom(""); setDateTo(""); setMonthFilter(""); setVehicleFilter(""); setSearchQuery("");
        setPdfUnit("tons");
    };

    return (
        <div>
            {/* Search Bar */}
            <div style={{ marginBottom: "1.25rem" }}>
                <input
                    type="text"
                    placeholder="🔍 Search raw material report by Driver Name, Vehicle Number, Remarks, or Net Weight..."
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

            {/* Filters */}
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

            {/* KPIs */}
            <div className="kpi-row">
                <div className="kpi-card blue">
                    <div className="kpi-label">Total Trips</div>
                    <div className="kpi-value">{filtered.length}</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-label">Total Net Weight (MT)</div>
                    <div className="kpi-value">{fmtNum(totalNetWeight)}</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-label">Total Gross Weight (MT)</div>
                    <div className="kpi-value">{fmtNum(totalGrossWeight)}</div>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-label">Avg Net / Trip (MT)</div>
                    <div className="kpi-value">{fmtNum(avgNetWeight)}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="chart-grid">
                <div className="chart-card">
                    <h3>Net Weight by Month (MT)</h3>
                    {byMonth.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byMonth} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#ea580c" radius={[4, 4, 0, 0]} name="Net Weight (MT)" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <h3>Trips by Vehicle</h3>
                    {byVehicle.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={byVehicle} cx="50%" cy="50%" outerRadius={80}
                                    dataKey="value" nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false} fontSize={10}>
                                    {byVehicle.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => [`${v} trips`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <h3>Daily Net Weight Trend</h3>
                    {dailyTrend.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="tons" stroke="#ea580c" strokeWidth={2} dot={false} name="Net Weight (MT)" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <h3>Net Weight by Vehicle</h3>
                    {netWeightByVehicle.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={netWeightByVehicle} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Net Weight (MT)" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="report-table-section">
                <div className="report-table-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h3>Raw Material Entries</h3>
                        <span className="report-count">{filtered.length} records</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Unit:</span>
                            <select
                                value={pdfUnit}
                                onChange={(e) => setPdfUnit(e.target.value)}
                                style={{
                                    padding: "0.4rem 0.6rem",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "0.85rem",
                                    backgroundColor: "white",
                                    cursor: "pointer",
                                    height: "36px",
                                    fontWeight: 600,
                                    boxSizing: "border-box"
                                }}
                            >
                                <option value="tons">Metric Ton (MT)</option>
                                <option value="brass">Brass (B)</option>
                            </select>
                        </div>
                        <button className="export-btn" onClick={handleExport}>⬇ Export to Excel</button>
                        {(isManager || isClerk) && (
                            <button className="export-btn" style={{ backgroundColor: "#ef4444", color: "white" }} onClick={handlePdfExport}>
                                PDF Generate
                            </button>
                        )}
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="report-empty">No entries match the selected filters.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Vehicle</th>
                                    <th>Site</th>
                                    <th>Arrival</th>
                                    <th>Loading Start</th>
                                    <th>Unloading End</th>
                                    <th>Turnaround</th>
                                    <th>Gross Wt (MT)</th>
                                    <th>Vehicle Wt (MT)</th>
                                    <th>Net Wt (MT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((r, i) => (
                                        <tr key={r.activity_id}>
                                            <td style={{ color: "#9ca3af", fontSize: 12 }}>
                                                {(currentPage - 1) * pageSize + i + 1}
                                            </td>
                                            <td>{formatDate(r.activity_date)}</td>
                                            <td><strong>{r.vehicle_number}</strong></td>
                                            <td>{r.site || "—"}</td>
                                            <td>{formatTime(r.arrival_time)}</td>
                                            <td>{formatTime(r.loading_start_time)}</td>
                                            <td>{formatTime(r.unloading_end_time)}</td>
                                            <td>{r.turnaround_time}</td>
                                            <td>{fmtNum(r.total_weight)}</td>
                                            <td style={{ color: "#6b7280" }}>{fmtNum(r.vehicle_weight)}</td>
                                            <td style={{ fontWeight: 600, color: "#16a34a" }}>{fmtNum(r.net_weight)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filtered.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={setPageSize}
                            pageSizeOptions={[5, 10, 20, 50]}
                        />
                    </div>
                )}
            </div>
            {showApprovalModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 2000
                }}>
                    <div style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#1e1b4b" }}>Approval Required</h3>
                        <p style={{ color: "#475569", fontSize: "0.95rem", marginBottom: "1rem" }}>
                            You need manager approval to print or export reports. Would you like to request approval for this report?
                        </p>
                        <div style={{
                            marginBottom: "1.5rem", padding: "0.75rem",
                            background: "#f1f5f9", borderRadius: "8px",
                            fontSize: "0.9rem", color: "#334155", borderLeft: "4px solid #3b82f6"
                        }}>
                            <strong>Request Details:</strong>
                            <div style={{ marginTop: "0.25rem" }}>{pendingRequest?.label}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                className="primary-btn"
                                onClick={handleRequestApproval}
                                disabled={submittingRequest}
                            >
                                {submittingRequest ? "Submitting..." : "Submit Request"}
                            </button>
                            <button
                                className="primary-btn"
                                style={{ backgroundColor: "#9ca3af", color: "white", border: "none" }}
                                onClick={() => {
                                    setShowApprovalModal(false);
                                    setPendingRequest(null);
                                }}
                                disabled={submittingRequest}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
