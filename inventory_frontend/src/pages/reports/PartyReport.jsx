import { useState, useMemo, useEffect } from "react";
import Pagination from "../../components/common/Pagination";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { exportToFormattedExcel } from "../../utils/excelGenerator";
import { getPartyReport } from "../../services/reportsApi";
import { useAuth } from "../../context/AuthContext";
import { generatePartyReportPdf } from "../../utils/pdfGenerator";
import { requestReportPrint } from "../../services/approvalApi";
import { formatDate, formatInr } from "../../utils/formatUtils";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#db2777"];

const fmtTons = (v) => Number(v || 0).toFixed(2);

const monthLabel = (dateStr) => {
    if (!dateStr) return "";
    const [y, m] = dateStr.split("-");
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1]} ${y}`;
};

function exportToExcel(rows, filename) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Party Report");
    XLSX.writeFile(wb, filename);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#1e293b", color: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => <div key={i}>{p.name}: <strong>{fmtTons(p.value)} tons</strong></div>)}
        </div>
    );
};

export default function PartyReport({ parties, onSwitchToSales }) {
    const { isManager, isClerk } = useAuth();

    const [search, setSearch] = useState("");
    const [selectedPartyId, setSelectedPartyId] = useState(null);
    const [partyData, setPartyData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pdfUnit, setPdfUnit] = useState("tons");

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset pagination when report changes
    useEffect(() => {
        setCurrentPage(1);
    }, [partyData]);

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

    const filteredParties = useMemo(() =>
        parties.filter(p => p.party_name.toLowerCase().includes(search.toLowerCase())),
        [parties, search]);

    const handleSelectParty = async (partyId) => {
        setSelectedPartyId(partyId);
        setLoading(true);
        setError(null);
        setPartyData(null);
        try {
            const res = await getPartyReport(partyId);
            setPartyData(res.data);
        } catch (e) {
            setError("Failed to load party data.");
        } finally {
            setLoading(false);
        }
    };

    // Chart data from partyData.sales
    const byMonth = useMemo(() => {
        if (!partyData?.sales) return [];
        const map = {};
        partyData.sales.forEach(s => {
            const m = monthLabel(s.sales_date);
            map[m] = (map[m] || 0) + parseFloat(s.quantity_tons || 0);
        });
        return Object.entries(map).map(([month, tons]) => ({ month, tons: parseFloat(tons.toFixed(2)) }));
    }, [partyData]);

    const byProduct = useMemo(() => {
        if (!partyData?.sales) return [];
        const map = {};
        partyData.sales.forEach(s => {
            map[s.product_name] = (map[s.product_name] || 0) + parseFloat(s.quantity_tons || 0);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    }, [partyData]);

    const topProduct = byProduct[0]?.name || "—";

    const handleExport = () => {
        if (!partyData?.sales) return;
        const label = `Party Report (Excel) - Party: ${partyData.party.party_name} | Unit: ${pdfUnit}`;
        const requestData = {
            report_type: "party",
            format: "excel",
            pdf_unit: pdfUnit,
            filters: {
                party_id: partyData.party.party_id,
                party_name: partyData.party.party_name
            },
            label: label
        };
        if (isClerk) {
            setPendingRequest(requestData);
            setShowApprovalModal(true);
            return;
        }
        const partyName = partyData.party.party_name;
        const multiplier = pdfUnit === "brass" ? 4.2 : 1.0;
        const qtyHeader = pdfUnit === "brass" ? "Quantity (Brass)" : "Quantity (Tons)";
        const unitLabel = pdfUnit === "brass" ? "brass" : "Tons";

        const subtitle = `Unit: ${pdfUnit.toUpperCase()} | Party Statement: ${partyName}${partyData.party.gst_no ? ` | GSTIN: ${partyData.party.gst_no}` : ""}`;

        const rows = partyData.sales.map(s => ({
            "Date": formatDate(s.sales_date),
            "Product": s.product_name,
            "Vehicle": s.vehicle_number || "",
            "Vehicle Owner": s.vehicle_owner || "",
            [qtyHeader]: Number((Number(s.quantity_tons || 0) * multiplier).toFixed(2)),
            "Unit": unitLabel,
            "Site": s.site || "",
            "Price (₹)": Number(s.price || 0),
            "Remarks": s.remarks || "",
        }));

        exportToFormattedExcel({
            title: `PARTY STATEMENT - ${partyName} (${pdfUnit.toUpperCase()})`,
            subtitle,
            sheetName: "Party Statement",
            rows,
            fileName: `party_${partyName.replace(/\s/g, "_")}_report.xlsx`
        });
    };

    const handlePdfExport = () => {
        if (!partyData) return;
        const label = `Party Report (PDF) - Party: ${partyData.party.party_name} | Unit: ${pdfUnit}`;
        const requestData = {
            report_type: "party",
            format: "pdf",
            pdf_unit: pdfUnit,
            filters: {
                party_id: partyData.party.party_id,
                party_name: partyData.party.party_name
            },
            label: label
        };
        if (isClerk) {
            setPendingRequest(requestData);
            setShowApprovalModal(true);
            return;
        }
        generatePartyReportPdf(partyData, pdfUnit);
    };

    return (
        <div className="party-layout">
            {/* Left: Party List */}
            <div className="party-list-panel">
                <h3>Parties</h3>
                <input
                    className="party-search"
                    placeholder="Search party..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {filteredParties.map(p => (
                    <div
                        key={p.party_id}
                        className={`party-list-item ${selectedPartyId === p.party_id ? "selected" : ""}`}
                        onClick={() => handleSelectParty(p.party_id)}
                    >
                        {p.party_name}
                    </div>
                ))}
                {filteredParties.length === 0 && (
                    <div style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0" }}>No parties found.</div>
                )}
            </div>

            {/* Right: Party Detail */}
            <div className="party-detail-panel">
                {!selectedPartyId && (
                    <div className="party-placeholder">
                        <div style={{ fontSize: 40 }}>👥</div>
                        <p>Select a party from the left to view their report</p>
                    </div>
                )}

                {loading && <div className="report-loading">Loading party data...</div>}
                {error && <div className="report-empty" style={{ color: "#dc2626" }}>{error}</div>}

                {partyData && !loading && (
                    <>
                        {/* Party Info Card */}
                        <div className="party-info-card">
                            <div className="party-info-field">
                                <label>Party Name</label>
                                <span>{partyData.party.party_name}</span>
                            </div>
                            <div className="party-info-field">
                                <label>GST No</label>
                                <span>{partyData.party.gst_no || "—"}</span>
                            </div>
                            <div className="party-info-field">
                                <label>PAN No</label>
                                <span>{partyData.party.pan_no || "—"}</span>
                            </div>
                            <div className="party-info-field">
                                <label>Address</label>
                                <span>{partyData.party.address || "—"}</span>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="kpi-row">
                            <div className="kpi-card blue">
                                <div className="kpi-label">Total Entries</div>
                                <div className="kpi-value">{partyData.summary.total_entries}</div>
                            </div>
                            <div className="kpi-card green">
                                <div className="kpi-label">Total Tons Bought</div>
                                <div className="kpi-value">{fmtTons(partyData.summary.total_tons)}</div>
                                <div className="kpi-sub">≈ {(partyData.summary.total_tons * 4.2).toFixed(2)} brass</div>
                            </div>
                            <div className="kpi-card purple">
                                <div className="kpi-label">Top Product</div>
                                <div className="kpi-value" style={{ fontSize: "1rem" }}>{topProduct}</div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="chart-grid">
                            <div className="chart-card">
                                <h3>Monthly Purchases (Tons)</h3>
                                {byMonth.length === 0 ? <div className="report-empty">No data</div> : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={byMonth} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="tons" fill="#2563eb" radius={[4, 4, 0, 0]} name="Tons" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="chart-card">
                                <h3>By Product</h3>
                                {byProduct.length === 0 ? <div className="report-empty">No data</div> : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={byProduct} cx="50%" cy="50%" outerRadius={80}
                                                dataKey="value" nameKey="name"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false} fontSize={10}>
                                                {byProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v) => [`${fmtTons(v)} tons`]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Table + Actions */}
                        <div className="report-table-section">
                            <div className="report-table-header">
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <h3>Sales History</h3>
                                    <span className="report-count">{partyData.sales.length} records</span>
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <button
                                        className="filter-reset-btn"
                                        onClick={() => onSwitchToSales(partyData.party.party_id)}
                                        style={{ borderColor: "#2563eb", color: "#2563eb" }}
                                    >
                                        🔗 View in Sales Report
                                    </button>
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
                                            <option value="tons">Tons (MT)</option>
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

                            {partyData.sales.length === 0 ? (
                                <div className="report-empty">No sales recorded for this party.</div>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Date</th>
                                                <th>Product</th>
                                                <th>Vehicle</th>
                                                <th>Quantity (MT)</th>
                                                <th>Unit</th>
                                                <th>Site</th>
                                                <th>Price (₹)</th>
                                                <th>Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {partyData.sales
                                                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                                .map((s, i) => (
                                                    <tr key={s.sales_id}>
                                                        <td style={{ color: "#9ca3af", fontSize: 12 }}>
                                                            {(currentPage - 1) * pageSize + i + 1}
                                                        </td>
                                                        <td>{formatDate(s.sales_date)}</td>
                                                        <td><strong>{s.product_name}</strong></td>
                                                        <td>{s.vehicle_number || "—"}</td>
                                                        <td style={{ fontWeight: 600 }}>{fmtTons(s.quantity_tons)}</td>
                                                        <td>
                                                            <div style={{ lineHeight: 1.4 }}>
                                                                <span style={{ fontWeight: 600 }}>{fmtTons(s.quantity_tons)} MT</span>
                                                                <br />
                                                                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                                                                    ≈ {(s.quantity_tons * 4.2).toFixed(2)} Brass
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>{s.site || "—"}</td>
                                                        <td>{s.price ? `₹${formatInr(s.price)}` : "—"}</td>
                                                        <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                                            title={s.remarks}>{s.remarks || "—"}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalItems={partyData.sales.length}
                                        pageSize={pageSize}
                                        onPageChange={setCurrentPage}
                                        onPageSizeChange={setPageSize}
                                        pageSizeOptions={[5, 10, 20, 50]}
                                    />
                                </div>
                            )}
                        </div>
                    </>
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
