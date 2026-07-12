import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { generateProductionReportPdf } from "../../utils/pdfGenerator";
import { requestReportPrint } from "../../services/approvalApi";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

const fmtTons = (v) => Number(v).toFixed(2);

const monthLabel = (dateStr) => {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]} ${y}`;
};

function exportToExcel(rows, filename) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production Report");
    XLSX.writeFile(wb, filename);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background:"#1e293b", color:"#f8fafc", padding:"10px 14px", borderRadius:8, fontSize:12 }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i}>{p.name}: <strong>{fmtTons(p.value)}</strong></div>
            ))}
        </div>
    );
};

export default function ProductionReport({ productions, products }) {
    const { isManager, isClerk } = useAuth();

    const [dateFrom, setDateFrom]   = useState("");
    const [dateTo, setDateTo]       = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [pdfUnit, setPdfUnit] = useState("tons");

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
        return productions.filter((p) => {
            if (dateFrom && p.production_date < dateFrom) return false;
            if (dateTo   && p.production_date > dateTo)   return false;
            if (monthFilter && p.production_date?.slice(0,7) !== monthFilter) return false;
            if (productFilter && String(p.product_id) !== productFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match = 
                    p.product_name?.toLowerCase().includes(q) ||
                    p.unit?.toLowerCase().includes(q) ||
                    String(p.production_cost || "").includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [productions, dateFrom, dateTo, monthFilter, productFilter, searchQuery]);

    const totalTons   = filtered.reduce((s, r) => s + (parseFloat(r.quantity_tons) || 0), 0);
    const totalCost   = filtered.reduce((s, r) => s + (parseFloat(r.production_cost) || 0), 0);
    const avgCost     = filtered.length ? totalCost / filtered.length : 0;

    const byMonth = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const m = monthLabel(r.production_date);
            map[m] = (map[m] || 0) + parseFloat(r.quantity_tons || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const byProduct = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.product_name] = (map[r.product_name] || 0) + parseFloat(r.quantity_tons || 0);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
            .sort((a,b) => b.value - a.value);
    }, [filtered]);

    const dailyTrend = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.production_date] = (map[r.production_date] || 0) + parseFloat(r.quantity_tons || 0);
        });
        return Object.entries(map)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([date, tons]) => ({ date, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const handleExport = () => {
        const productName = products.find(p => String(p.product_id) === productFilter)?.product_name || "All";
        const label = `Production Report (Excel) | Filters: Product: ${productName}, Date: ${dateFrom || "Start"} to ${dateTo || "End"}, Month: ${monthFilter || "All"}, Search: ${searchQuery || "None"}`;
        const requestData = {
            report_type: "production",
            format: "excel",
            filters: {
                dateFrom,
                dateTo,
                monthFilter,
                productFilter,
                searchQuery
            },
            label: label
        };
        if (isClerk) {
            setPendingRequest(requestData);
            setShowApprovalModal(true);
            return;
        }

        const rows = filtered.map(r => ({
            "Date":            r.production_date,
            "Product":         r.product_name,
            "Quantity (Tons)": fmtTons(r.quantity_tons),
            "Unit":            r.unit,
            "Production Cost": r.production_cost,
        }));
        exportToExcel(rows, "production_report.xlsx");
    };

    const handlePdfExport = () => {
        const productName = products.find(p => String(p.product_id) === productFilter)?.product_name || "All";
        const label = `Production Report (PDF) | Unit: ${pdfUnit} | Filters: Product: ${productName}, Date: ${dateFrom || "Start"} to ${dateTo || "End"}, Month: ${monthFilter || "All"}, Search: ${searchQuery || "None"}`;
        const requestData = {
            report_type: "production",
            format: "pdf",
            pdf_unit: pdfUnit,
            filters: {
                dateFrom,
                dateTo,
                monthFilter,
                productFilter,
                searchQuery
            },
            label: label
        };
        if (isClerk) {
            setPendingRequest(requestData);
            setShowApprovalModal(true);
            return;
        }

        generateProductionReportPdf(filtered, {
            dateFrom,
            dateTo,
            month: monthFilter,
            product: productName
        }, pdfUnit);
    };

    const resetFilters = () => {
        setDateFrom(""); setDateTo(""); setMonthFilter(""); setProductFilter(""); setSearchQuery("");
        setPdfUnit("tons");
    };

    return (
        <div>
            {/* Search Bar */}
            <div style={{ marginBottom: "1.25rem" }}>
                <input
                    type="text"
                    placeholder="🔍 Search production report by Product Name, Unit, or Cost..."
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
                    <label>Product</label>
                    <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                        <option value="">All Products</option>
                        {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                    </select>
                </div>
                <button className="filter-reset-btn" onClick={resetFilters}>✕ Reset</button>
            </div>

            {/* KPIs */}
            <div className="kpi-row">
                <div className="kpi-card blue">
                    <div className="kpi-label">Total Entries</div>
                    <div className="kpi-value">{filtered.length}</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-label">Total Produced (Tons)</div>
                    <div className="kpi-value">{fmtTons(totalTons)}</div>
                    <div className="kpi-sub">≈ {(totalTons * 4.2).toFixed(2)} brass</div>
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

            {/* Charts */}
            <div className="chart-grid">
                <div className="chart-card">
                    <h3>Production by Month (Tons)</h3>
                    {byMonth.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byMonth} margin={{ top:5, right:10, left:0, bottom:40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize:11 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize:11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#16a34a" radius={[4,4,0,0]} name="Tons" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <h3>Distribution by Product</h3>
                    {byProduct.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={byProduct} cx="50%" cy="50%" outerRadius={80}
                                    dataKey="value" nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                                    labelLine={false} fontSize={10}>
                                    {byProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => [`${fmtTons(v)} tons`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <h3>Daily Production Trend</h3>
                    {dailyTrend.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyTrend} margin={{ top:5, right:10, left:0, bottom:40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize:10 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize:11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="tons" stroke="#2563eb" strokeWidth={2} dot={false} name="Tons" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="report-table-section">
                <div className="report-table-header">
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <h3>Production Entries</h3>
                        <span className="report-count">{filtered.length} records</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button className="export-btn" onClick={handleExport}>⬇ Export to Excel</button>
                        {(isManager || isClerk) && (
                            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                <select 
                                    value={pdfUnit} 
                                    onChange={(e) => setPdfUnit(e.target.value)}
                                    style={{
                                        padding: "0.5rem",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "0.85rem",
                                        backgroundColor: "white",
                                        cursor: "pointer",
                                        height: "36px",
                                        boxSizing: "border-box"
                                    }}
                                >
                                    <option value="tons">Tons (T)</option>
                                    <option value="brass">Brass (B)</option>
                                </select>
                                <button className="export-btn" style={{ backgroundColor: "#ef4444", color: "white" }} onClick={handlePdfExport}>
                                    PDF Generate
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="report-empty">No production records match the selected filters.</div>
                ) : (
                    <div style={{ overflowX:"auto" }}>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Product</th>
                                    <th>Quantity (Tons)</th>
                                    <th>Quantity (Brass)</th>
                                    <th>Unit</th>
                                    <th>Production Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const tons = parseFloat(r.quantity_tons || 0);
                                    return (
                                        <tr key={r.production_id}>
                                            <td style={{ color:"#9ca3af", fontSize:12 }}>{i+1}</td>
                                            <td>{r.production_date}</td>
                                            <td><strong>{r.product_name}</strong></td>
                                            <td>{fmtTons(tons)}</td>
                                            <td style={{ color:"#6b7280" }}>{(tons * 4.2).toFixed(2)}</td>
                                            <td>{r.unit}</td>
                                            <td>₹{parseFloat(r.production_cost || 0).toLocaleString("en-IN")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
