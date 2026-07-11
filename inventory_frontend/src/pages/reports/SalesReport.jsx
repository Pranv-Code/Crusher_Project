import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { generateSalesReportPdf } from "../../utils/pdfGenerator";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTons = (v) => Number(v).toFixed(2);

const monthLabel = (dateStr) => {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]} ${y}`;
};

function exportToExcel(rows, filename) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, filename);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background:"#1e293b", color:"#f8fafc", padding:"10px 14px", borderRadius:8, fontSize:12 }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i}>{p.name}: <strong>{fmtTons(p.value)} tons</strong></div>
            ))}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalesReport({ sales, parties, vehicles }) {
    const { isManager } = useAuth();

    const [dateFrom, setDateFrom]     = useState("");
    const [dateTo, setDateTo]         = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [partyFilter, setPartyFilter] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [pdfUnit, setPdfUnit] = useState("tons");

    // ── Filter logic ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return sales.filter((s) => {
            if (dateFrom && s.sales_date < dateFrom) return false;
            if (dateTo   && s.sales_date > dateTo)   return false;
            if (monthFilter) {
                const rowMonth = s.sales_date?.slice(0, 7); // "YYYY-MM"
                if (rowMonth !== monthFilter) return false;
            }
            if (partyFilter  && String(s.party_id)    !== partyFilter)  return false;
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
    }, [sales, dateFrom, dateTo, monthFilter, partyFilter, vehicleFilter, searchQuery]);

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const totalTons     = filtered.reduce((s, r) => s + (r.quantity_tons || 0), 0);
    const uniqueParties = new Set(filtered.map(r => r.party_id)).size;
    const uniqueVehicles= new Set(filtered.map(r => r.vehicle_number)).size;

    // ── Chart data ────────────────────────────────────────────────────────────
    const byMonth = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            const m = monthLabel(r.sales_date);
            map[m] = (map[m] || 0) + (r.quantity_tons || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const byParty = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.party_name] = (map[r.party_name] || 0) + (r.quantity_tons || 0);
        });
        return Object.entries(map)
            .map(([name, tons]) => ({ name, value: parseFloat(tons.toFixed(2)) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [filtered]);

    const byVehicle = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            if (r.vehicle_number) {
                map[r.vehicle_number] = (map[r.vehicle_number] || 0) + (r.quantity_tons || 0);
            }
        });
        return Object.entries(map)
            .map(([name, tons]) => ({ name, tons: parseFloat(tons.toFixed(2)) }))
            .sort((a, b) => b.tons - a.tons)
            .slice(0, 10);
    }, [filtered]);

    const dailyTrend = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.sales_date] = (map[r.sales_date] || 0) + (r.quantity_tons || 0);
        });
        return Object.entries(map)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([date, tons]) => ({ date, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = filtered.map(s => ({
            "Date":           s.sales_date,
            "Party":          s.party_name,
            "Product":        s.product_name,
            "Vehicle":        s.vehicle_number || "",
            "Vehicle Owner":  s.vehicle_owner || "",
            "Quantity (Tons)":fmtTons(s.quantity_tons),
            "Unit":           s.unit,
            "Site":           s.site || "",
            "Price":          s.price || "",
            "Loading Time":   s.loading_time || "",
            "Unloading Time": s.unloading_time || "",
            "Remarks":        s.remarks || "",
        }));
        exportToExcel(rows, "sales_report.xlsx");
    };

    const handlePdfExport = () => {
        generateSalesReportPdf(filtered, {
            dateFrom,
            dateTo,
            month: monthFilter,
            party: parties.find(p => String(p.party_id) === partyFilter)?.party_name,
            vehicle: vehicleFilter
        }, pdfUnit);
    };

    const resetFilters = () => {
        setDateFrom(""); setDateTo(""); setMonthFilter("");
        setPartyFilter(""); setVehicleFilter(""); setSearchQuery("");
        setPdfUnit("tons");
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Search Bar */}
            <div style={{ marginBottom: "1.25rem" }}>
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
                        {parties.map(p => <option key={p.party_id} value={p.party_id}>{p.party_name}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Vehicle</label>
                    <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)}>
                        <option value="">All Vehicles</option>
                        {vehicles.map(v => <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>)}
                    </select>
                </div>
                <button className="filter-reset-btn" onClick={resetFilters}>✕ Reset</button>
            </div>

            {/* KPI Cards */}
            <div className="kpi-row">
                <div className="kpi-card blue">
                    <div className="kpi-label">Total Entries</div>
                    <div className="kpi-value">{filtered.length}</div>
                </div>
                <div className="kpi-card green">
                    <div className="kpi-label">Total Tons Sold</div>
                    <div className="kpi-value">{fmtTons(totalTons)}</div>
                    <div className="kpi-sub">≈ {(totalTons * 4.2).toFixed(2)} brass</div>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-label">Unique Parties</div>
                    <div className="kpi-value">{uniqueParties}</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-label">Unique Vehicles</div>
                    <div className="kpi-value">{uniqueVehicles}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="chart-grid">
                {/* Monthly Bar Chart */}
                <div className="chart-card">
                    <h3>Sales by Month (Tons)</h3>
                    {byMonth.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byMonth} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#2563eb" radius={[4,4,0,0]} name="Tons" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Party Pie Chart */}
                <div className="chart-card">
                    <h3>Distribution by Party</h3>
                    {byParty.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={byParty} cx="50%" cy="50%" outerRadius={80}
                                    dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                                    labelLine={false} fontSize={10}>
                                    {byParty.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => [`${fmtTons(v)} tons`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Daily Trend */}
                <div className="chart-card">
                    <h3>Daily Sales Trend</h3>
                    {dailyTrend.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="tons" stroke="#16a34a" strokeWidth={2} dot={false} name="Tons" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Vehicle Bar Chart */}
                <div className="chart-card">
                    <h3>Top Vehicles by Tons</h3>
                    {byVehicle.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byVehicle} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#7c3aed" radius={[0,4,4,0]} name="Tons" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="report-table-section">
                <div className="report-table-header">
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <h3>Sales Entries</h3>
                        <span className="report-count">{filtered.length} records</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button className="export-btn" onClick={handleExport}>
                            ⬇ Export to Excel
                        </button>
                        {isManager && (
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
                    <div className="report-empty">No sales match the selected filters.</div>
                ) : (
                    <div style={{ overflowX:"auto" }}>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Party</th>
                                    <th>Product</th>
                                    <th>Vehicle</th>
                                    <th>Owner</th>
                                    <th>Quantity</th>
                                    <th>Site</th>
                                    <th>Price</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, i) => (
                                    <tr key={s.sales_id}>
                                        <td style={{ color:"#9ca3af", fontSize:12 }}>{i+1}</td>
                                        <td>{s.sales_date}</td>
                                        <td><strong>{s.party_name}</strong></td>
                                        <td>{s.product_name}</td>
                                        <td>{s.vehicle_number || "—"}</td>
                                        <td style={{ color:"#6b7280" }}>{s.vehicle_owner || "—"}</td>
                                        <td>
                                            <div style={{ lineHeight:1.4 }}>
                                                <span style={{ fontWeight:600 }}>{fmtTons(s.quantity_tons)} tons</span>
                                                <br/>
                                                <span style={{ fontSize:11, color:"#9ca3af" }}>
                                                    ≈ {(s.quantity_tons * 4.2).toFixed(2)} brass
                                                </span>
                                            </div>
                                        </td>
                                        <td>{s.site || "—"}</td>
                                        <td>{s.price || "—"}</td>
                                        <td style={{ maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                                            title={s.remarks}>{s.remarks || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
