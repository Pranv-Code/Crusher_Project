import React, { useMemo, useState, useEffect } from "react";
import Pagination from "../../components/common/Pagination";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { exportToFormattedExcel } from "../../utils/excelGenerator";
import { useAuth } from "../../context/AuthContext";
import { generateSalesReportPdf } from "../../utils/pdfGenerator";
import { requestReportPrint } from "../../services/approvalApi";
import { formatDate, formatTime, formatInr, tonToBrass } from "../../utils/formatUtils";
import { getGoodsReturns } from "../../services/goodsReturnApi";
import { getSettings } from "../../services/settingsApi";

import Toast from "../../components/common/Toast";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

// ── Helpers ──────────────────────────────────────────────────────────────────
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
            {payload.map((p, i) => <div key={i}>{p.name}: <strong>{fmtTons(p.value)} MT</strong></div>)}
        </div>
    );
};

export default function SalesReport({ sales, parties, vehicles, products = [], onSwitchToParty }) {
    const { isManager, isClerk } = useAuth();

    const [toast, setToast] = useState({ message: "", type: "success" });
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [partyFilter, setPartyFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCharts, setShowCharts] = useState(false);

    const productList = useMemo(() => {
        if (Array.isArray(products) && products.length > 0) return products;
        const uniqueMap = {};
        (sales || []).forEach(s => {
            if (s && s.product_name) {
                const pr = (s.product_name === "Common Pool" || !s.product_name) ? "Quarry Material" : s.product_name;
                uniqueMap[pr] = { product_id: s.product_id || pr, product_name: pr };
            }
        });
        return Object.values(uniqueMap);
    }, [products, sales]);

    // Row Checkbox Selection State for Export
    const [selectedSaleIds, setSelectedSaleIds] = useState(new Set());

    // Conversion Factor State
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    // --- Goods Returns State ---
    const [goodsReturns, setGoodsReturns] = useState([]);

    useEffect(() => {
        getGoodsReturns({ limit: 500 })
            .then(res => setGoodsReturns(res.data?.goods_returns || []))
            .catch(err => console.error("Failed to load goods returns in SalesReport:", err));

        getSettings()
            .then(res => {
                if (res.data && res.data.tons_per_brass) {
                    setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                }
            })
            .catch(err => console.error("Failed to load settings in SalesReport:", err));
    }, []);

    const returnsBySaleId = useMemo(() => {
        const map = {};
        if (Array.isArray(goodsReturns)) {
            goodsReturns.forEach(ret => {
                if (ret && ret.sale_id) {
                    if (!map[ret.sale_id]) map[ret.sale_id] = [];
                    map[ret.sale_id].push(ret);
                }
            });
        }
        return map;
    }, [goodsReturns]);

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
        setPartyFilter("");
        setProductFilter("");
        setVehicleFilter("");
        setSearchQuery("");
        setSelectedSaleIds(new Set());
        setCurrentPage(1);
    };

    const filtered = useMemo(() => {
        if (!Array.isArray(sales)) return [];
        return sales.filter((s) => {
            if (!s) return false;
            if (dateFrom && s.sales_date < dateFrom) return false;
            if (dateTo && s.sales_date > dateTo) return false;
            if (monthFilter) {
                const rowMonth = s.sales_date?.slice(0, 7); // "YYYY-MM"
                if (rowMonth !== monthFilter) return false;
            }
            if (partyFilter && String(s.party_id) !== partyFilter) return false;
            if (productFilter) {
                const pName = (s.product_name === "Common Pool" || !s.product_name) ? "Quarry Material" : s.product_name;
                const matchId = String(s.product_id || "") === String(productFilter);
                const matchName = String(pName) === String(productFilter) || String(s.product_name) === String(productFilter);
                if (!matchId && !matchName) return false;
            }
            if (vehicleFilter && s.vehicle_number !== vehicleFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    s.party_name?.toLowerCase().includes(q) ||
                    s.product_name?.toLowerCase().includes(q) ||
                    s.vehicle_number?.toLowerCase().includes(q) ||
                    s.site?.toLowerCase().includes(q) ||
                    s.remarks?.toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [sales, dateFrom, dateTo, monthFilter, partyFilter, productFilter, vehicleFilter, searchQuery]);

    // Reset pagination when report data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filtered.length]);

    // ── Checkbox Selection Handlers ──────────────────────────────────────────
    const isAllSelected = useMemo(() => {
        return filtered.length > 0 && filtered.every(s => selectedSaleIds.has(s.sales_id));
    }, [filtered, selectedSaleIds]);

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedSaleIds(new Set());
        } else {
            setSelectedSaleIds(new Set(filtered.map(s => s.sales_id)));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedSaleIds(prev => {
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
        if (selectedSaleIds.size > 0) {
            return filtered.filter(s => selectedSaleIds.has(s.sales_id));
        }
        return filtered;
    };

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const grossTons = filtered.reduce((s, r) => s + parseFloat(r.quantity_tons || 0), 0);
    const filteredSaleIds = useMemo(() => new Set(filtered.map(s => s.sales_id)), [filtered]);

    const totalReturnedTons = useMemo(() => {
        if (!Array.isArray(goodsReturns)) return 0;
        return goodsReturns
            .filter(ret => ret && ret.sale_id && filteredSaleIds.has(ret.sale_id))
            .reduce((sum, ret) => sum + parseFloat(ret.returned_quantity_tons || 0), 0);
    }, [goodsReturns, filteredSaleIds]);

    const netTons = Math.max(0, grossTons - totalReturnedTons);
    const uniqueParties = new Set(filtered.map(r => r.party_id)).size;
    const uniqueVehicles = new Set(filtered.map(r => r.vehicle_number)).size;

    // ── Chart data ────────────────────────────────────────────────────────────
    const byMonth = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const m = monthLabel(r.sales_date);
            map[m] = (map[m] || 0) + (parseFloat(r.quantity_tons) || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const byParty = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const p = r.party_name || "Unknown";
            map[p] = (map[p] || 0) + (parseFloat(r.quantity_tons) || 0);
        });
        return Object.entries(map)
            .map(([party, tons]) => ({ name: party, value: parseFloat(tons.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    }, [filtered]);

    const byProduct = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const pr = (r.product_name === "Common Pool" || !r.product_name) ? "Quarry Material" : r.product_name;
            map[pr] = (map[pr] || 0) + (parseFloat(r.quantity_tons) || 0);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    }, [filtered]);

    const byVehicle = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const v = r.vehicle_number || "Unspecified";
            map[v] = (map[v] || 0) + (parseFloat(r.quantity_tons) || 0);
        });
        return Object.entries(map)
            .map(([vehicle, tons]) => ({ vehicle, tons: parseFloat(tons.toFixed(2)) }))
            .sort((a, b) => b.tons - a.tons)
            .slice(0, 10);
    }, [filtered]);

    // ── Export Handlers ────────────────────────────────────────────────────────
    const currentFilters = { dateFrom, dateTo, month: monthFilter, party: partyFilter, product: productFilter, vehicle: vehicleFilter };

    const [exportFormat, setExportFormat] = useState("pdf");

    const handlePrintOrRequest = () => {
        const exportData = getExportData();
        if (exportData.length === 0) {
            alert("No sales entries selected for PDF export.");
            return;
        }
        if (isManager) {
            generateSalesReportPdf(exportData, currentFilters, returnsBySaleId);
        } else {
            setExportFormat("pdf");
            setShowApprovalModal(true);
        }
    };

    const submitApprovalRequest = async () => {
        if (!approvalReason.trim()) {
            alert("Please provide a reason for the approval request.");
            return;
        }

        const exportData = getExportData();
        const selectedIds = selectedSaleIds.size > 0 ? Array.from(selectedSaleIds) : [];
        setIsSubmittingApproval(true);
        try {
            await requestReportPrint({
                report_type: "Sales Report",
                format: exportFormat,
                parameters: {
                    date_from: dateFrom,
                    date_to: dateTo,
                    month: monthFilter,
                    party: partyFilter,
                    product: productFilter,
                    vehicle: vehicleFilter,
                    selected_ids: selectedIds,
                    records_count: exportData.length
                },
                reason: approvalReason.trim()
            });

            setToast({
                message: `Export (${exportFormat.toUpperCase()}) request submitted successfully! A Manager will review your request.`,
                type: "success"
            });
            setShowApprovalModal(false);
            setApprovalReason("");
        } catch (err) {
            setToast({
                message: err.response?.data?.message || "Failed to submit export request.",
                type: "failure"
            });
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const exportToExcel = () => {
        const exportData = getExportData();
        if (exportData.length === 0) {
            alert("No sales entries selected to export.");
            return;
        }

        if (!isManager) {
            setExportFormat("excel");
            setShowApprovalModal(true);
            return;
        }

        const dataToExport = [];

        exportData.forEach(s => {
            const saleRets = returnsBySaleId[s.sales_id] || [];
            const retTons = saleRets.reduce((sum, r) => sum + parseFloat(r.returned_quantity_tons || 0), 0);
            const netTonsRow = Math.max(0, s.quantity_tons - retTons);

            dataToExport.push({
                "Sale ID": s.sales_id,
                "Date": formatDate(s.sales_date),
                "Party": s.party_name,
                "Product": s.product_name,
                "Vehicle": s.vehicle_number || "",
                "Vehicle Owner": s.vehicle_owner || "",
                "Gross Qty (MT)": Number((Number(s.quantity_tons || 0)).toFixed(2)),
                "Returned Qty (MT)": retTons > 0 ? Number((-retTons).toFixed(2)) : 0,
                "Net Qty (MT)": Number(netTonsRow.toFixed(2)),
                "Net Qty (Brass)": Number(tonToBrass(netTonsRow, tonsPerBrass).toFixed(2)),
                "Site": s.site || "",
                "Price (₹)": Number(s.price || 0),
                "Loading Time": formatTime(s.loading_time),
                "Unloading Time": formatTime(s.unloading_time),
                "Remarks": s.remarks || "",
            });
        });

        const isSelection = selectedSaleIds.size > 0;
        exportToFormattedExcel({
            rows: dataToExport,
            fileName: `sales_report_${new Date().toISOString().split("T")[0]}.xlsx`,
            sheetName: "Sales Report",
            title: "VISHWAJEET ENTERPRISES - SALES REPORT",
            subtitle: `Generated on ${new Date().toLocaleDateString()} ${isSelection ? `| Selected (${selectedSaleIds.size} entries)` : `| Filter: ${dateFrom || "Start"} to ${dateTo || "End"}`}`
        });
    };

    return (
        <div className="report-container">
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ message: "", type: "success" })}
            />
            {/* Action Bar */}
            <div className="report-action-bar">
                <div className="action-bar-left" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="report-count-badge">
                        {filtered.length} {filtered.length === 1 ? "Record" : "Records"}
                    </span>
                    {selectedSaleIds.size > 0 && (
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
                            Selected: {selectedSaleIds.size} / {filtered.length}
                            <button
                                onClick={() => setSelectedSaleIds(new Set())}
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
                    <button className="export-btn excel" onClick={exportToExcel}>
                        📥 Export Excel {selectedSaleIds.size > 0 ? `(${selectedSaleIds.size})` : ""}
                    </button>
                    <button
                        className="export-btn pdf"
                        onClick={handlePrintOrRequest}
                        title={isClerk ? "Request Manager approval to print" : "Download PDF report"}
                    >
                        {isClerk ? "💬 Request Print Approval" : `📄 Download PDF ${selectedSaleIds.size > 0 ? `(${selectedSaleIds.size})` : ""}`}
                    </button>
                </div>
            </div>

            {/* Global Search Bar */}
            <div style={{ marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="🔍 Search sales report by Party, Product, Vehicle, Site, or Remarks..."
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

            {/* Filter Bar */}
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
                    <label>Party</label>
                    <select value={partyFilter} onChange={e => setPartyFilter(e.target.value)}>
                        <option value="">All Parties</option>
                        {Array.isArray(parties) && parties.map(p => <option key={p.party_id} value={p.party_id}>{p.party_name}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Product</label>
                    <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                        <option value="">All Products</option>
                        {productList.map(p => (
                            <option key={p.product_id || p.product_name} value={p.product_id || p.product_name}>
                                {p.product_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Vehicle</label>
                    <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}>
                        <option value="">All Vehicles</option>
                        {Array.isArray(vehicles) && vehicles.map(v => <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>)}
                    </select>
                </div>
                <button className="filter-reset-btn" onClick={resetFilters}>✕ Reset</button>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card blue">
                    <div className="kpi-label">Total Entries</div>
                    <div className="kpi-value">{filtered.length}</div>
                    <div className="kpi-sub">Matching current filters</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-label">Gross Sales (MT)</div>
                    <div className="kpi-value">{fmtTons(grossTons)}</div>
                    <div className="kpi-sub">≈ {tonToBrass(grossTons, tonsPerBrass).toFixed(2)} Brass</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-label">Goods Returned</div>
                    <div className="kpi-value" style={{ color: "#000000ff" }}>{fmtTons(totalReturnedTons)} MT</div>
                    <div className="kpi-sub" style={{ color: "#000000ff" }}>≈ {tonToBrass(totalReturnedTons, tonsPerBrass).toFixed(2)} Brass</div>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-label">Net Sales (MT)</div>
                    <div className="kpi-value">{fmtTons(netTons)}</div>
                    <div className="kpi-sub">Parties: {uniqueParties} | Vehicles: {uniqueVehicles}</div>
                </div>
            </div>

            {/* Analytics Section (Collapsible) */}
            {showCharts && (
                <div className="charts-grid">
                    {byMonth.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Monthly Dispatch Trend (MT)</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={byMonth} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="tons" name="Dispatched MT" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {byParty.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Top Parties by Dispatch Volume</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={byParty.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Volume (MT)" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {byProduct.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Product Share Breakdown</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={byProduct} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                                        {byProduct.map((_, idx) => (
                                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {byVehicle.length > 0 && (
                        <div className="chart-card">
                            <h4 className="chart-title">Top 10 Vehicles Dispatched (MT)</h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={byVehicle} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="vehicle" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={40} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="tons" name="Dispatched MT" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* Main Sales Table */}
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
                                <th style={{ whiteSpace: "nowrap" }}>Date</th>
                                <th>Party Name</th>
                                <th>Product</th>
                                <th>Vehicle</th>
                                <th>Veh. Owner</th>
                                <th style={{ textAlign: "right" }}>Qty (MT)</th>
                                <th style={{ textAlign: "right" }}>Qty (Brass)</th>
                                <th>Site</th>
                                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Price (₹)</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="empty-row">
                                        No sales records found matching the specified filters.
                                    </td>
                                </tr>
                            ) : (
                                filtered
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((s, i) => {
                                        const saleRets = returnsBySaleId[s.sales_id] || [];
                                        const retTons = saleRets.reduce((sum, r) => sum + parseFloat(r.returned_quantity_tons || 0), 0);
                                        const isSelected = selectedSaleIds.has(s.sales_id);

                                        return (
                                            <React.Fragment key={s.sales_id}>
                                                <tr style={{ backgroundColor: isSelected ? "#f0f9ff" : "transparent" }}>
                                                    <td style={{ textAlign: "center" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectOne(s.sales_id)}
                                                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                                        />
                                                    </td>
                                                    <td>{(currentPage - 1) * pageSize + i + 1}</td>
                                                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.sales_date)}</td>
                                                    <td style={{ fontWeight: 600 }}>{s.party_name}</td>
                                                    <td>
                                                        <span className="product-badge">{s.product_name}</span>
                                                    </td>
                                                    <td>{s.vehicle_number || "—"}</td>
                                                    <td>{s.vehicle_owner || "—"}</td>
                                                    <td style={{ textAlign: "right" }}>
                                                        <strong>{fmtTons(s.quantity_tons)} MT</strong>
                                                        {retTons > 0 && (
                                                            <div style={{ color: "#dc2626", fontWeight: "bold", fontSize: "0.8em" }}>
                                                                -{fmtTons(retTons)} MT
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: "right" }}>
                                                        <strong>{tonToBrass(s.quantity_tons, tonsPerBrass).toFixed(2)} Brass</strong>
                                                        {retTons > 0 && (
                                                            <div style={{ color: "#dc2626", fontWeight: "bold", fontSize: "0.8em" }}>
                                                                -{tonToBrass(retTons, tonsPerBrass).toFixed(2)} Brass
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>{s.site || "—"}</td>
                                                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{s.price ? `₹${formatInr(s.price)}` : "—"}</td>
                                                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                                        title={s.remarks}>{s.remarks || "—"}</td>
                                                </tr>

                                                {/* Goods Return sub-rows in RED */}
                                                {saleRets.map(ret => (
                                                    <tr key={`report-ret-${ret.return_id}`} style={{ backgroundColor: "#fff5f5" }}>
                                                        <td colSpan="12" style={{ padding: "6px 16px", borderBottom: "1px dashed #fca5a5" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#b91c1c", fontSize: "0.85rem" }}>
                                                                <span>↩ <strong>Goods Return #{ret.return_id}</strong> ({formatDate(ret.return_date)}):</span>
                                                                <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "#dc2626" }}>
                                                                    -{parseFloat(ret.returned_quantity_tons || 0).toFixed(2)} MT
                                                                </span>
                                                                <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: "600" }}>
                                                                    (≈ -{tonToBrass(parseFloat(ret.returned_quantity_tons || 0), tonsPerBrass).toFixed(2)} Brass)
                                                                </span>
                                                                <span style={{
                                                                    backgroundColor: ret.condition_type === "GOOD" ? "#d1fae5" : "#fee2e2",
                                                                    color: ret.condition_type === "GOOD" ? "#065f46" : "#991b1b",
                                                                    padding: "2px 8px",
                                                                    borderRadius: "10px",
                                                                    fontSize: "0.75rem",
                                                                    fontWeight: "bold"
                                                                }}>
                                                                    {ret.condition_type === "GOOD" ? "🟢 Good (Restocked to Stock Pool)" : "🔴 Damaged (Wastage)"}
                                                                </span>
                                                                {ret.reason && <span style={{ color: "#7f1d1d" }}>Reason: {ret.reason}</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Shared Reusable Pagination Component */}
                <Pagination
                    currentPage={currentPage}
                    totalItems={filtered.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={handlePageSizeChange}
                />
            </div>

            {/* Approval Modal for Clerks */}
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
                                placeholder="e.g., Client requested monthly sales statement for auditing..."
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
