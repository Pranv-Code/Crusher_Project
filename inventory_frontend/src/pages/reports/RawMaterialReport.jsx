import { useMemo, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { generateRawMaterialReportPdf } from "../../utils/pdfGenerator";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777", "#d97706", "#059669"];

const fmtNum = (v) => Number(v || 0).toFixed(2);

const monthLabel = (dateStr) => {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]} ${y}`;
};

function exportToExcel(rows, filename) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raw Material Report");
    XLSX.writeFile(wb, filename);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background:"#1e293b", color:"#f8fafc", padding:"10px 14px", borderRadius:8, fontSize:12 }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
            {payload.map((p, i) => <div key={i}>{p.name}: <strong>{fmtNum(p.value)}</strong></div>)}
        </div>
    );
};

export default function RawMaterialReport({ activities, vehicles }) {
    const { isManager } = useAuth();

    const [dateFrom, setDateFrom]   = useState("");
    const [dateTo, setDateTo]       = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [pdfUnit, setPdfUnit] = useState("tons");

    const filtered = useMemo(() => {
        return activities.filter((a) => {
            if (dateFrom && a.activity_date < dateFrom) return false;
            if (dateTo   && a.activity_date > dateTo)   return false;
            if (monthFilter && a.activity_date?.slice(0,7) !== monthFilter) return false;
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

    const totalNetWeight   = filtered.reduce((s, r) => s + parseFloat(r.net_weight || 0), 0);
    const totalGrossWeight = filtered.reduce((s, r) => s + parseFloat(r.total_weight || 0), 0);
    const avgNetWeight     = filtered.length ? totalNetWeight / filtered.length : 0;

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
            .sort((a,b) => b.value - a.value)
            .slice(0, 8);
    }, [filtered]);

    const dailyTrend = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.activity_date] = (map[r.activity_date] || 0) + parseFloat(r.net_weight || 0);
        });
        return Object.entries(map)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([date, tons]) => ({ date, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const netWeightByVehicle = useMemo(() => {
        const map = {};
        filtered.forEach(r => {
            map[r.vehicle_number] = (map[r.vehicle_number] || 0) + parseFloat(r.net_weight || 0);
        });
        return Object.entries(map)
            .sort(([,a],[,b]) => b - a)
            .slice(0, 10)
            .map(([name, tons]) => ({ name, tons: parseFloat(tons.toFixed(2)) }));
    }, [filtered]);

    const handleExport = () => {
        const rows = filtered.map(r => ({
            "Date":                r.activity_date,
            "Vehicle":             r.vehicle_number,
            "Site":                r.site || "",
            "Arrival Time":        r.arrival_time || "",
            "Loading Start":       r.loading_start_time || "",
            "Unloading End":       r.unloading_end_time || "",
            "Turnaround Time":     r.turnaround_time || "",
            "Total Weight (T)":    fmtNum(r.total_weight),
            "Vehicle Weight (T)":  fmtNum(r.vehicle_weight),
            "Net Weight (T)":      fmtNum(r.net_weight),
        }));
        exportToExcel(rows, "raw_material_report.xlsx");
    };

    const handlePdfExport = () => {
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
                    <div className="kpi-label">Total Net Weight (T)</div>
                    <div className="kpi-value">{fmtNum(totalNetWeight)}</div>
                </div>
                <div className="kpi-card orange">
                    <div className="kpi-label">Total Gross Weight (T)</div>
                    <div className="kpi-value">{fmtNum(totalGrossWeight)}</div>
                </div>
                <div className="kpi-card purple">
                    <div className="kpi-label">Avg Net / Trip (T)</div>
                    <div className="kpi-value">{fmtNum(avgNetWeight)}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="chart-grid">
                <div className="chart-card">
                    <h3>Net Weight by Month (Tons)</h3>
                    {byMonth.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byMonth} margin={{ top:5, right:10, left:0, bottom:40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize:11 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize:11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#ea580c" radius={[4,4,0,0]} name="Net Weight (T)" />
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
                                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
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
                            <LineChart data={dailyTrend} margin={{ top:5, right:10, left:0, bottom:40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize:10 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize:11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="tons" stroke="#ea580c" strokeWidth={2} dot={false} name="Net Weight (T)" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="chart-card">
                    <h3>Net Weight by Vehicle</h3>
                    {netWeightByVehicle.length === 0 ? <div className="report-empty">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={netWeightByVehicle} layout="vertical" margin={{ top:5, right:20, left:40, bottom:5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize:11 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize:10 }} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="tons" fill="#7c3aed" radius={[0,4,4,0]} name="Net Weight (T)" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="report-table-section">
                <div className="report-table-header">
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <h3>Raw Material Entries</h3>
                        <span className="report-count">{filtered.length} records</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button className="export-btn" onClick={handleExport}>⬇ Export to Excel</button>
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
                    <div className="report-empty">No entries match the selected filters.</div>
                ) : (
                    <div style={{ overflowX:"auto" }}>
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
                                    <th>Gross Wt (T)</th>
                                    <th>Vehicle Wt (T)</th>
                                    <th>Net Wt (T)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <tr key={r.activity_id}>
                                        <td style={{ color:"#9ca3af", fontSize:12 }}>{i+1}</td>
                                        <td>{r.activity_date}</td>
                                        <td><strong>{r.vehicle_number}</strong></td>
                                        <td>{r.site || "—"}</td>
                                        <td>{r.arrival_time}</td>
                                        <td>{r.loading_start_time}</td>
                                        <td>{r.unloading_end_time}</td>
                                        <td>{r.turnaround_time}</td>
                                        <td>{fmtNum(r.total_weight)}</td>
                                        <td style={{ color:"#6b7280" }}>{fmtNum(r.vehicle_weight)}</td>
                                        <td style={{ fontWeight:600, color:"#16a34a" }}>{fmtNum(r.net_weight)}</td>
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
