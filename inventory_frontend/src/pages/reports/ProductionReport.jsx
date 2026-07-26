import React, { useMemo, useState, useEffect } from "react";
import Pagination from "../../components/common/Pagination";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { exportToFormattedExcel } from "../../utils/excelGenerator";
import { useAuth } from "../../context/AuthContext";
import { generateProductionReportPdf } from "../../utils/pdfGenerator";
import { requestReportPrint } from "../../services/approvalApi";
import { formatDate, formatInr, tonToBrass } from "../../utils/formatUtils";
import { getSettings } from "../../services/settingsApi";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

const fmtTons = (v) => Number(v || 0).toFixed(2);

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
            {payload.map((p, i) => (
                <div key={i}>{p.name}: <strong>{fmtTons(p.value)}</strong></div>
            ))}
        </div>
    );
};

export default function ProductionReport({ production = [], productions = [], products = [] }) {
    const { isManager, isClerk } = useAuth();

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCharts, setShowCharts] = useState(false);

    // Checkbox Selection State
    const [selectedProductionIds, setSelectedProductionIds] = useState(new Set());

    // Conversion Factor State
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    useEffect(() => {
        getSettings()
            .then(res => {
                if (res.data && res.data.tons_per_brass) {
                    setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                }
            })
            .catch(err => console.error("Failed to load settings in ProductionReport:", err));
    }, []);

    // Defensive Production Data List
    const prodList = useMemo(() => {
        if (Array.isArray(production) && production.length > 0) return production;
        if (Array.isArray(productions)) return productions;
        return [];
    }, [production, productions]);

    const productList = useMemo(() => {
        return Array.isArray(products) ? products : [];
    }, [products]);

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
        setProductFilter("");
        setSearchQuery("");
        setSelectedProductionIds(new Set());
        setCurrentPage(1);
    };

    const filtered = useMemo(() => {
        return prodList.filter((r) => {
            if (!r) return false;
            if (dateFrom && r.production_date < dateFrom) return false;
            if (dateTo && r.production_date > dateTo) return false;

            if (monthFilter) {
                const rowMonth = r.production_date?.slice(0, 7);
                if (rowMonth !== monthFilter) return false;
            }

            if (productFilter && String(r.product_id) !== productFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = r.product_name?.toLowerCase().includes(q);
                const matchDate = r.production_date?.toLowerCase().includes(q);
                if (!matchName && !matchDate) return false;
            }

            return true;
        });
    }, [prodList, dateFrom, dateTo, monthFilter, productFilter, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filtered.length]);

    // Checkbox Selection Handlers
    const isAllSelected = useMemo(() => {
        return filtered.length > 0 && filtered.every(r => selectedProductionIds.has(r.production_id));
    }, [filtered, selectedProductionIds]);

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedProductionIds(new Set());
        } else {
            setSelectedProductionIds(new Set(filtered.map(r => r.production_id)));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedProductionIds(prev => {
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
        if (selectedProductionIds.size > 0) {
            return filtered.filter(r => selectedProductionIds.has(r.production_id));
        }
        return filtered;
    };

    const totalTons = useMemo(() => filtered.reduce((acc, r) => acc + (parseFloat(r.quantity_tons) || 0), 0), [filtered]);
    const totalCost = useMemo(() => filtered.reduce((acc, r) => acc + (parseFloat(r.production_cost) || 0), 0), [filtered]);
    const avgCost = filtered.length ? totalCost / filtered.length : 0;

    const byMonth = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const m = monthLabel(r.production_date);
            map[m] = (map[m] || 0) + (parseFloat(r.quantity_tons) || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const byProduct = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const name = r.product_name || "Unknown";
            map[name] = (map[name] || 0) + (parseFloat(r.quantity_tons) || 0);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    }, [filtered]);

    const currentFilters = { dateFrom, dateTo, month: monthFilter, product: productFilter };

    const handlePrintOrRequest = () => {
        const exportData = getExportData();
        if (exportData.length === 0) {
            alert("No production entries selected for PDF export.");
            return;
        }

        if (isManager) {
            generateProductionReportPdf(exportData, currentFilters, tonsPerBrass);
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
                report_type: "Production Report",
                parameters: {
                    date_from: dateFrom,
                    date_to: dateTo,
                    month: monthFilter,
                    product: productFilter,
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
            alert("No production entries selected to export.");
            return;
        }

        let productName = "All Products";
        if (productFilter) {
            const found = productList.find(p => String(p.product_id) === String(productFilter));
            if (found) productName = found.product_name;
        }

        const isSelection = selectedProductionIds.size > 0;
        const subtitle = `Product: ${productName} | Date: ${dateFrom || "Start"} to ${dateTo || "End"}${isSelection ? ` | Selected (${selectedProductionIds.size} entries)` : ""}`;

        const rows = exportData.map(r => {
            const tons = parseFloat(r.quantity_tons || 0);
            return {
                "Date": formatDate(r.production_date),
                "Product": r.product_name,
                "Quantity (MT)": Number(tons.toFixed(2)),
                "Quantity (Brass)": Number(tonToBrass(tons, tonsPerBrass).toFixed(2)),
                "Cost / Unit (₹)": r.cost_per_unit ? Number(Number(r.cost_per_unit).toFixed(2)) : "",
                "Total Production Cost (₹)": r.production_cost ? Number(r.production_cost) : "",
            };
        });

        exportToFormattedExcel({
            title: `Production Report`,
            subtitle,
            sheetName: "Production Report",
            rows,
            fileName: "production_report.xlsx"
        });
    };

    return (
        <div className="report-container">
            <div className="report-action-bar">
                <div className="action-bar-left">
                    <span className="report-count-badge">
                        {filtered.length} {filtered.length === 1 ? "Record" : "Records"}
                    </span>
                    {selectedProductionIds.size > 0 && (
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
                            Selected: {selectedProductionIds.size} / {filtered.length}
                            <button
                                onClick={() => setSelectedProductionIds(new Set())}
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
                        📥 Export Excel {selectedProductionIds.size > 0 ? `(${selectedProductionIds.size})` : ""}
                    </button>
                    <button
                        className="export-btn pdf"
                        onClick={handlePrintOrRequest}
                        title={isClerk ? "Request Manager approval to print" : "Download PDF report"}
                    >
                        {isClerk ? "💬 Request Print Approval" : `📄 Download PDF ${selectedProductionIds.size > 0 ? `(${selectedProductionIds.size})` : ""}`}
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="🔍 Search production report by Product name or Date..."
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
                    <label>Product</label>
                    <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                        <option value="">All Products</option>
                        {productList.map(p => (
                            <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                        ))}
                    </select>
                </div>
                <button className="filter-reset-btn" onClick={resetFilters}>✕ Reset</button>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card blue">
                    <div className="kpi-label">Total Logs</div>
                    <div className="kpi-value">{filtered.length}</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-label">Total Produced (MT)</div>
                    <div className="kpi-value">{fmtTons(totalTons)}</div>
                    <div className="kpi-sub">≈ {tonToBrass(totalTons, tonsPerBrass).toFixed(2)} Brass</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-label">Total Cost</div>
                    <div className="kpi-value">₹{totalCost.toLocaleString("en-IN")}</div>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-label">Avg Cost / Entry</div>
                    <div className="kpi-value">₹{Math.round(avgCost).toLocaleString("en-IN")}</div>
                </div>
            </div>

            {showCharts && (
                <div className="charts-grid">
                    {byMonth.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Monthly Production Volume (MT)</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="tons" name="Produced MT" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {byProduct.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Production Share by Product</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={byProduct} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                                        {byProduct.map((_, idx) => (
                                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
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
                                <th>#</th>
                                <th>Date</th>
                                <th>Product Name</th>
                                <th style={{ textAlign: "right" }}>Qty (MT)</th>
                                <th style={{ textAlign: "right" }}>Qty (Brass)</th>
                                <th style={{ textAlign: "right" }}>Cost / Unit (₹)</th>
                                <th style={{ textAlign: "right" }}>Total Cost (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-row">
                                        No production records match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filtered
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((r, i) => {
                                        const tons = parseFloat(r.quantity_tons || 0);
                                        const cpu = r.cost_per_unit || (r.production_cost && tons > 0 ? (r.production_cost / tons) : 0);
                                        const isSelected = selectedProductionIds.has(r.production_id);

                                        return (
                                            <tr key={r.production_id} style={{ backgroundColor: isSelected ? "#f0f9ff" : "transparent" }}>
                                                <td style={{ textAlign: "center" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectOne(r.production_id)}
                                                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                                    />
                                                </td>
                                                <td style={{ color: "#9ca3af", fontSize: 12 }}>
                                                    {(currentPage - 1) * pageSize + i + 1}
                                                </td>
                                                <td>{formatDate(r.production_date)}</td>
                                                <td><strong>{r.product_name}</strong></td>
                                                <td style={{ textAlign: "right" }}><strong>{fmtTons(r.quantity_tons)} MT</strong></td>
                                                <td style={{ textAlign: "right" }}><strong>{tonToBrass(r.quantity_tons, tonsPerBrass).toFixed(2)} Brass</strong></td>
                                                <td style={{ textAlign: "right" }}>{cpu ? `₹${formatInr(cpu)}` : "—"}</td>
                                                <td style={{ textAlign: "right" }}>{r.production_cost ? `₹${formatInr(r.production_cost)}` : "—"}</td>
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
                            As a Clerk, exporting or printing reports requires Manager approval. Please enter a reason for this request.
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
                                placeholder="e.g., Auditing production output statement..."
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
