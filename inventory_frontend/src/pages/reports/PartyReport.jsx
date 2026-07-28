import React, { useState, useMemo, useEffect } from "react";
import Pagination from "../../components/common/Pagination";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import { exportToFormattedExcel } from "../../utils/excelGenerator";
import { getPartyReport } from "../../services/reportsApi";
import { useAuth } from "../../context/AuthContext";
import { generatePartyReportPdf, generatePartyInvoicePdf } from "../../utils/pdfGenerator";
import { getSettings } from "../../services/settingsApi";
import { requestReportPrint } from "../../services/approvalApi";
import { formatDate, formatInr, tonToBrass } from "../../utils/formatUtils";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

const fmtTons = (v) => Number(v || 0).toFixed(2);

export default function PartyReport({ parties, products }) {
    const { isManager, isClerk } = useAuth();

    const [selectedPartyId, setSelectedPartyId] = useState("");
    const [partyData, setPartyData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCharts, setShowCharts] = useState(false);

    // Filters State
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");

    // Checkbox selection state for selective export
    const [selectedSaleIds, setSelectedSaleIds] = useState(new Set());

    // Conversion Factor State
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    // Company Settings for Invoice
    const [companyDetails, setCompanyDetails] = useState({});

    useEffect(() => {
        getSettings()
            .then(res => {
                if (res.data) {
                    setCompanyDetails(res.data);
                    if (res.data.tons_per_brass) {
                        setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                    }
                }
            })
            .catch(err => console.error("Failed to load settings in PartyReport:", err));
    }, []);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalReason, setApprovalReason] = useState("");
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    // Tracks whether the pending approval modal is for a PDF report or an Invoice
    const [pendingApprovalFormat, setPendingApprovalFormat] = useState("pdf");

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
        setSelectedSaleIds(new Set());
        setCurrentPage(1);
    };

    const handlePartySelect = (partyId) => {
        setSelectedPartyId(partyId);
        setDateFrom("");
        setDateTo("");
        setMonthFilter("");
        setProductFilter("");
        setSearchQuery("");
        setSelectedSaleIds(new Set());
        setCurrentPage(1);

        if (!partyId) {
            setPartyData(null);
            return;
        }

        setLoading(true);
        getPartyReport(partyId)
            .then(res => setPartyData(res.data))
            .catch(err => console.error("Failed to fetch party report:", err))
            .finally(() => setLoading(false));
    };

    const filteredSales = useMemo(() => {
        if (!partyData?.sales) return [];
        return partyData.sales.filter(s => {
            if (dateFrom && s.sales_date < dateFrom) return false;
            if (dateTo && s.sales_date > dateTo) return false;
            if (monthFilter && s.sales_date?.slice(0, 7) !== monthFilter) return false;
            if (productFilter && String(s.product_id) !== productFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchProduct = s.product_name?.toLowerCase().includes(q);
                const matchVehicle = s.vehicle_number?.toLowerCase().includes(q);
                const matchChalan = s.chalan_no?.toLowerCase().includes(q);
                const matchSite = s.site?.toLowerCase().includes(q);
                const matchDate = s.sales_date?.toLowerCase().includes(q);
                const matchRemarks = s.remarks?.toLowerCase().includes(q);
                if (!matchProduct && !matchVehicle && !matchChalan && !matchSite && !matchDate && !matchRemarks) return false;
            }
            return true;
        });
    }, [partyData, dateFrom, dateTo, monthFilter, productFilter, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredSales.length]);

    // Checkbox Selection Logic
    const isAllSelected = useMemo(() => {
        return filteredSales.length > 0 && filteredSales.every(s => selectedSaleIds.has(s.sales_id));
    }, [filteredSales, selectedSaleIds]);

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedSaleIds(new Set());
        } else {
            setSelectedSaleIds(new Set(filteredSales.map(s => s.sales_id)));
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

    const getExportSales = () => {
        if (selectedSaleIds.size > 0) {
            return filteredSales.filter(s => selectedSaleIds.has(s.sales_id));
        }
        return filteredSales;
    };

    // KPIs
    const filteredTons = useMemo(() => filteredSales.reduce((acc, s) => acc + (parseFloat(s.quantity_tons) || 0), 0), [filteredSales]);
    const filteredSpend = useMemo(() => filteredSales.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0), [filteredSales]);

    const byProductData = useMemo(() => {
        if (!filteredSales.length) return [];
        const map = {};
        filteredSales.forEach(s => {
            const p = s.product_name || "Common Pool";
            map[p] = (map[p] || 0) + (parseFloat(s.quantity_tons) || 0);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    }, [filteredSales]);

    const topProduct = useMemo(() => {
        if (!byProductData.length) return "N/A";
        const sorted = [...byProductData].sort((a, b) => b.value - a.value);
        return `${sorted[0].name} (${sorted[0].value} MT)`;
    }, [byProductData]);

    const handlePrintOrRequest = () => {
        if (!partyData) return;
        const exportSales = getExportSales();
        if (exportSales.length === 0) {
            alert("No sales entries selected for PDF export.");
            return;
        }

        if (isManager) {
            generatePartyReportPdf({ ...partyData, sales: exportSales }, tonsPerBrass);
        } else {
            setPendingApprovalFormat("pdf");
            setShowApprovalModal(true);
        }
    };

    const handleGenerateInvoicePdf = () => {
        if (!partyData) return;
        const exportSales = getExportSales();
        if (exportSales.length === 0) {
            alert("No sales entries selected for Invoice PDF.");
            return;
        }

        if (isManager) {
            // Manager can download invoice directly
            generatePartyInvoicePdf({ ...partyData, sales: exportSales }, dateFrom, dateTo, companyDetails);
        } else {
            // Clerk must request approval
            setPendingApprovalFormat("invoice");
            setShowApprovalModal(true);
        }
    };

    const submitApprovalRequest = async () => {
        if (!approvalReason.trim()) {
            alert("Please provide a reason for the approval request.");
            return;
        }

        const exportSales = getExportSales();
        setIsSubmittingApproval(true);
        try {
            await requestReportPrint({
                report_type: "Party Sales Report",
                format: pendingApprovalFormat,
                label: pendingApprovalFormat === "invoice"
                    ? `Party Invoice PDF - ${partyData?.party?.party_name}`
                    : `Party Sales Report PDF - ${partyData?.party?.party_name}`,
                parameters: {
                    party_id: selectedPartyId,
                    party_name: partyData?.party?.party_name,
                    records_count: exportSales.length,
                    date_from: dateFrom || null,
                    date_to: dateTo || null,
                    selected_ids: exportSales.map(s => s.sales_id),
                },
                reason: approvalReason.trim()
            });

            const label = pendingApprovalFormat === "invoice" ? "Invoice" : "Print";
            alert(`${label} request submitted successfully! A Manager will review your request.`);
            setShowApprovalModal(false);
            setApprovalReason("");
            setPendingApprovalFormat("pdf");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit approval request.");
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const handleExportExcel = () => {
        const exportSales = getExportSales();
        if (!partyData || exportSales.length === 0) {
            alert("No party sales data available to export.");
            return;
        }

        const partyName = partyData.party.party_name;
        const isSelection = selectedSaleIds.size > 0;
        const subtitle = `Party Statement: ${partyName}${partyData.party.gst_no ? ` | GSTIN: ${partyData.party.gst_no}` : ""}${isSelection ? ` | Selected (${selectedSaleIds.size} entries)` : ""}`;

        const rows = exportSales.map(s => ({
            "Date": formatDate(s.sales_date),
            "Chalan No.": s.chalan_no || "",
            "Product": s.product_name,
            "Vehicle": s.vehicle_number || "",
            "Vehicle Owner": s.vehicle_owner || "",
            "Quantity (MT)": Number((Number(s.quantity_tons || 0)).toFixed(2)),
            "Quantity (Brass)": Number(tonToBrass(s.quantity_tons, tonsPerBrass).toFixed(2)),
            "Site": s.site || "",
            "Price (₹)": Number(s.price || 0),
            "Remarks": s.remarks || "",
        }));

        exportToFormattedExcel({
            title: `PARTY STATEMENT - ${partyName}`,
            subtitle,
            sheetName: "Party Statement",
            rows,
            fileName: `party_${partyName.replace(/\s/g, "_")}_report.xlsx`
        });
    };

    return (
        <div className="report-container">
            {/* Top Action Bar */}
            <div className="report-action-bar">
                <div className="action-bar-left">
                    <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>Select Party:</label>
                    <select
                        value={selectedPartyId}
                        onChange={(e) => handlePartySelect(e.target.value)}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            minWidth: "220px",
                            outline: "none"
                        }}
                    >
                        <option value="">-- Choose a Party --</option>
                        {parties.map(p => (
                            <option key={p.party_id} value={p.party_id}>{p.party_name}</option>
                        ))}
                    </select>

                    {partyData && (
                        <span className="report-count-badge">
                            {filteredSales.length} {filteredSales.length === 1 ? "Record" : "Records"}
                        </span>
                    )}

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
                            Selected: {selectedSaleIds.size} / {filteredSales.length}
                            <button
                                onClick={() => setSelectedSaleIds(new Set())}
                                style={{ background: "none", border: "none", color: "#ef4444", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" }}
                                title="Clear Selection"
                            >
                                ✕
                            </button>
                        </span>
                    )}

                    {partyData && (
                        <button
                            className={`toggle-charts-btn ${showCharts ? "active" : ""}`}
                            onClick={() => setShowCharts(!showCharts)}
                        >
                            {showCharts ? "📊 Hide Graph" : "📈 Show Graph"}
                        </button>
                    )}
                </div>

                {partyData && (
                    <div className="action-bar-right">
                        <button className="export-btn excel" onClick={handleExportExcel}>
                            📥 Export Excel {selectedSaleIds.size > 0 ? `(${selectedSaleIds.size})` : ""}
                        </button>
                        <button
                            className="export-btn pdf"
                            onClick={handlePrintOrRequest}
                            title={isClerk ? "Request Manager approval to print" : "Download Party Statement PDF"}
                        >
                            {isClerk ? "💬 Request Print Approval" : `📄 Download PDF ${selectedSaleIds.size > 0 ? `(${selectedSaleIds.size})` : ""}`}
                        </button>
                        <button
                            className="export-btn excel"
                            onClick={handleGenerateInvoicePdf}
                            style={{ backgroundColor: isClerk ? "#d97706" : "#16a34a" }}
                            title={isClerk ? "Request Manager approval to generate Invoice" : "Generate Non-GST Invoice PDF"}
                        >
                            {isClerk
                                ? `💬 Request Invoice Approval${selectedSaleIds.size > 0 ? ` (${selectedSaleIds.size})` : ""}`
                                : `📄 Invoice PDF${selectedSaleIds.size > 0 ? ` (${selectedSaleIds.size})` : ""}`
                            }
                        </button>
                    </div>
                )}
            </div>

            {!selectedPartyId && (
                <div className="report-table-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
                    <h3 style={{ color: "#1e293b", margin: "0 0 0.5rem 0" }}>No Party Selected</h3>
                    <p style={{ color: "#64748b", margin: 0 }}>Select a party from the dropdown above to view their sales history, statement analytics, and generate non-GST invoices.</p>
                </div>
            )}

            {loading && (
                <div className="report-loading">
                    <h3 style={{ color: "#2563eb" }}>Loading Party Report...</h3>
                </div>
            )}

            {!loading && partyData && (
                <>
                    {/* Search Bar */}
                    <div style={{ marginBottom: "1rem" }}>
                        <input
                            type="text"
                            placeholder="🔍 Search party sales by Product, Vehicle, Site, Remarks, or Date..."
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
                            <label>Product</label>
                            <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                                <option value="">All Products</option>
                                {Array.isArray(products) && products.map(p => (
                                    <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="filter-reset-btn" onClick={resetFilters}>✕ Reset</button>
                    </div>

                    {/* Party Details Header Box */}
                    <div style={{ background: "#ffffff", padding: "1.2rem 1.5rem", borderRadius: "12px", marginBottom: "1.2rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                            <div>
                                <h3 style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontSize: "1.3rem" }}>{partyData.party.party_name}</h3>
                                <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                                    {partyData.party.address || "No address specified"}
                                </p>
                            </div>
                            <div style={{ textAlign: "right", fontSize: "0.85rem", color: "#475569" }}>
                                {partyData.party.contact_person && <div>Contact: <strong>{partyData.party.contact_person}</strong></div>}
                                {partyData.party.phone && <div>Phone: <strong>{partyData.party.phone}</strong></div>}
                                {partyData.party.email && <div>Email: <strong>{partyData.party.email}</strong></div>}
                                {partyData.party.gst_no && <div>GSTIN: <strong>{partyData.party.gst_no}</strong></div>}
                            </div>
                        </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="kpi-grid">
                        <div className="kpi-card blue">
                            <div className="kpi-label">Filtered Sales Entries</div>
                            <div className="kpi-value">{filteredSales.length}</div>
                            <div className="kpi-sub">Lifetime Orders: {partyData.summary.total_purchases}</div>
                        </div>
                        <div className="kpi-card green">
                            <div className="kpi-label">Dispatched Volume (MT)</div>
                            <div className="kpi-value">{fmtTons(filteredTons)}</div>
                            <div className="kpi-sub">≈ {tonToBrass(filteredTons, tonsPerBrass).toFixed(2)} Brass</div>
                        </div>
                        <div className="kpi-card orange">
                            <div className="kpi-label">Total Spend (₹)</div>
                            <div className="kpi-value">₹{formatInr(filteredSpend)}</div>
                            <div className="kpi-sub">Lifetime Spend: ₹{formatInr(partyData.summary.total_spend)}</div>
                        </div>
                        <div className="kpi-card purple">
                            <div className="kpi-label">Top Product Bought</div>
                            <div className="kpi-value" style={{ fontSize: "1.1rem" }}>{topProduct}</div>
                        </div>
                    </div>

                    {/* Collapsible Analytics Section */}
                    {showCharts && byProductData.length > 0 && (
                        <div className="charts-grid">
                            <div className="chart-card">
                                <h4 className="chart-title">Purchases by Product (MT)</h4>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={byProductData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="value" name="Volume (MT)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-card">
                                <h4 className="chart-title">Product Share Breakdown</h4>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={byProductData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                                            {byProductData.map((_, idx) => (
                                                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Table Card */}
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
                                        <th>Chalan No.</th>
                                        <th>Product Name</th>
                                        <th>Vehicle</th>
                                        <th style={{ textAlign: "right" }}>Qty (MT)</th>
                                        <th style={{ textAlign: "right" }}>Qty (Brass)</th>
                                        <th>Site</th>
                                        <th style={{ textAlign: "right" }}>Price (₹)</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="empty-row">
                                                No sales history records match the specified filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSales
                                            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                            .map((s, i) => {
                                                const isSelected = selectedSaleIds.has(s.sales_id);
                                                return (
                                                    <tr key={s.sales_id} style={{ backgroundColor: isSelected ? "#f0f9ff" : "transparent" }}>
                                                        <td style={{ textAlign: "center" }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectOne(s.sales_id)}
                                                                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                                            />
                                                        </td>
                                                        <td style={{ color: "#9ca3af", fontSize: 12 }}>
                                                            {(currentPage - 1) * pageSize + i + 1}
                                                        </td>
                                                        <td>{formatDate(s.sales_date)}</td>
                                                        <td><strong style={{ color: "#2563eb" }}>{s.chalan_no || "—"}</strong></td>
                                                        <td><strong>{s.product_name}</strong></td>
                                                        <td>{s.vehicle_number || "—"}</td>
                                                        <td style={{ textAlign: "right" }}><strong>{fmtTons(s.quantity_tons)} MT</strong></td>
                                                        <td style={{ textAlign: "right" }}><strong>{tonToBrass(s.quantity_tons, tonsPerBrass).toFixed(2)} Brass</strong></td>
                                                        <td>{s.site || "—"}</td>
                                                        <td style={{ textAlign: "right" }}>{s.price ? `₹${formatInr(s.price)}` : "—"}</td>
                                                        <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                                            title={s.remarks}>{s.remarks || "—"}</td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredSales.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Print Approval Request Modal */}
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
                        <h3 style={{ margin: "0 0 1rem 0", color: "#1e1b4b" }}>
                            {pendingApprovalFormat === "invoice" ? "💬 Request Invoice Approval" : "💬 Request Print Approval"}
                        </h3>
                        <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1rem" }}>
                            {pendingApprovalFormat === "invoice"
                                ? "As a Clerk, generating invoices requires Manager approval. Please enter a reason for this request."
                                : "As a Clerk, exporting or printing party statements requires Manager approval. Please enter a reason for this request."
                            }
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
                                placeholder="e.g., Party requested annual statement of account..."
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
