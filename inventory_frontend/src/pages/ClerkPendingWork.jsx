import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getMyPendingApprovals } from "../services/approvalApi";
import Pagination from "../components/common/Pagination";
import { addVehicle } from "../services/vehicleApi";
import { addParty } from "../services/partyApi";
import * as XLSX from "xlsx";
import { exportToFormattedExcel } from "../utils/excelGenerator";
import { getSales } from "../services/salesApi";
import { getParties } from "../services/partyApi";
import { getProduction } from "../services/productionApi";
import { getProducts } from "../services/productApi";
import { getPartyReport } from "../services/reportsApi";
import { getVehicleActivities } from "../services/vehicleActivityApi";
import { getSettings } from "../services/settingsApi";
import {
    generateSalesReportPdf,
    generateProductionReportPdf,
    generatePartyReportPdf,
    generateRawMaterialReportPdf
} from "../utils/pdfGenerator";
import { formatDate, formatTime, formatInr, formatDurationHM, tonToBrass } from "../utils/formatUtils";
import ApprovalChangeDetails from "../components/common/ApprovalChangeDetails";

export default function ClerkPendingWork() {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const capitalizeWords = (str) => {
        if (!str) return "";
        return str.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [downloadingId, setDownloadingId] = useState(null);
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    // Modal state for direct re-submission
    const [resubmitModal, setResubmitModal] = useState(false);
    const [resubmitItem, setResubmitItem] = useState(null);
    const [resubmitFormData, setResubmitFormData] = useState({});
    const [resubmitSubmitting, setResubmitSubmitting] = useState(false);
    const [resubmitError, setResubmitError] = useState("");

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const fetchMyRequests = async () => {
        setLoading(true);
        try {
            const res = await getMyPendingApprovals();
            setRequests(res.data || []);
        } catch (err) {
            console.error("Failed to load my requests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRequests();

        getSettings()
            .then(res => {
                if (res.data && res.data.tons_per_brass) {
                    setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                }
            })
            .catch(() => {});
    }, []);

    const handleDownloadReport = async (item, format) => {
        const { report_type, parameters } = item.reference_data || {};
        const f = parameters || {};
        setDownloadingId(item.approval_id);

        try {
            if (report_type === "Sales Report") {
                const salesRes = await getSales();
                const salesData = salesRes.data.sales || (Array.isArray(salesRes.data) ? salesRes.data : []);
                const filtered = salesData.filter((s) => {
                    if (f.date_from && s.sales_date < f.date_from) return false;
                    if (f.date_to   && s.sales_date > f.date_to)   return false;
                    if (f.month     && s.sales_date?.slice(0,7) !== f.month) return false;
                    if (f.party     && String(s.party_id) !== f.party) return false;
                    if (f.vehicle   && s.vehicle_number !== f.vehicle) return false;
                    return true;
                });

                if (format === "excel") {
                    const subtitle = `Filter: ${f.date_from || "Start"} to ${f.date_to || "End"} | Month: ${f.month || "All"}`;
                    const rows = filtered.map(s => ({
                        "Date":           formatDate(s.sales_date),
                        "Party":          s.party_name,
                        "Product":        s.product_name,
                        "Vehicle":        s.vehicle_number || "",
                        "Vehicle Owner":  s.vehicle_owner || "",
                        "Quantity (MT)":  Number((Number(s.quantity_tons || 0)).toFixed(2)),
                        "Quantity (Brass)": Number(tonToBrass(s.quantity_tons || 0, tonsPerBrass).toFixed(2)),
                        "Site":           s.site || "",
                        "Price (₹)":      Number(s.price || 0),
                        "Loading Time":   formatTime(s.loading_time),
                        "Unloading Time": formatTime(s.unloading_time),
                        "Remarks":        s.remarks || "",
                    }));
                    await exportToFormattedExcel({
                        title: `Sales Report`,
                        subtitle,
                        sheetName: "Sales Report",
                        rows,
                        fileName: "sales_report.xlsx"
                    });
                } else {
                    generateSalesReportPdf(filtered, { dateFrom: f.date_from, dateTo: f.date_to, month: f.month, party: f.party, vehicle: f.vehicle });
                }
            } else if (report_type === "Production Report") {
                const prodRes = await getProduction();
                const prodData = prodRes.data || [];
                const productsRes = await getProducts();
                const productsList = productsRes.data || [];

                const filtered = prodData.filter((r) => {
                    if (f.date_from && r.production_date < f.date_from) return false;
                    if (f.date_to   && r.production_date > f.date_to)   return false;
                    if (f.month     && r.production_date?.slice(0,7) !== f.month) return false;
                    if (f.product   && String(r.product_id) !== f.product) return false;
                    return true;
                });

                if (format === "excel") {
                    const productName = productsList.find(p => String(p.product_id) === f.productFilter)?.product_name || "All";
                    const subtitle = `Product: ${productName} | Date: ${f.dateFrom || "Start"} to ${f.dateTo || "End"} | Month: ${f.monthFilter || "All"}${f.searchQuery ? ` | Search: "${f.searchQuery}"` : ""}`;
                    const rows = filtered.map(r => {
                        const tons = parseFloat(r.quantity_tons || 0);
                        return {
                            "Date":            formatDate(r.production_date),
                            "Product":         r.product_name,
                            "Quantity (MT)":   Number(tons.toFixed(2)),
                            "Quantity (Brass)": Number(tonToBrass(tons, tonsPerBrass).toFixed(2)),
                            "Cost / Unit (₹)": r.cost_per_unit ? Number(Number(r.cost_per_unit).toFixed(2)) : "",
                            "Total Production Cost (₹)": r.production_cost ? Number(r.production_cost) : "",
                        };
                    });
                    await exportToFormattedExcel({
                        title: `Production Report`,
                        subtitle,
                        sheetName: "Production Report",
                        rows,
                        fileName: "production_report.xlsx"
                    });
                } else {
                    generateProductionReportPdf(filtered, { dateFrom: f.date_from, dateTo: f.date_to, month: f.month, product: f.product }, tonsPerBrass);
                }
            } else if (report_type === "Party Sales Report") {
                const partyDataRes = await getPartyReport(f.party_id);
                const partyData = partyDataRes.data;

                if (format === "excel") {
                    const partyName = partyData.party.party_name;
                    const subtitle = `Party Statement: ${partyName}${partyData.party.gst_no ? ` | GSTIN: ${partyData.party.gst_no}` : ""}`;
                    const rows = partyData.sales.map(s => ({
                        "Date":           formatDate(s.sales_date),
                        "Product":        s.product_name,
                        "Vehicle":        s.vehicle_number || "",
                        "Vehicle Owner":  s.vehicle_owner || "",
                        "Quantity (MT)":  Number((Number(s.quantity_tons || 0)).toFixed(2)),
                        "Quantity (Brass)": Number(tonToBrass(s.quantity_tons || 0, tonsPerBrass).toFixed(2)),
                        "Site":           s.site || "",
                        "Price (₹)":      Number(s.price || 0),
                        "Remarks":        s.remarks || "",
                    }));
                    await exportToFormattedExcel({
                        title: `PARTY STATEMENT - ${partyName}`,
                        subtitle,
                        sheetName: "Party Statement",
                        rows,
                        fileName: `party_${partyName.replace(/\s/g,"_")}_report.xlsx`
                    });
                } else {
                    generatePartyReportPdf(partyData, tonsPerBrass);
                }
            } else if (report_type === "Raw Material Report") {
                const actRes = await getVehicleActivities();
                const actData = actRes.data || [];
                const filtered = actData.filter((a) => {
                    if (f.dateFrom && a.activity_date < f.dateFrom) return false;
                    if (f.dateTo   && a.activity_date > f.dateTo)   return false;
                    if (f.monthFilter && a.activity_date?.slice(0,7) !== f.monthFilter) return false;
                    if (f.vehicleFilter && a.vehicle_number !== f.vehicleFilter) return false;
                    if (f.searchQuery) {
                        const q = f.searchQuery.toLowerCase();
                        const match = 
                            a.vehicle_number?.toLowerCase().includes(q) ||
                            a.driver_name?.toLowerCase().includes(q) ||
                            a.remarks?.toLowerCase().includes(q) ||
                            String(a.net_weight || "").includes(q);
                        if (!match) return false;
                    }
                    return true;
                });

                if (format === "excel") {
                    const subtitle = `Vehicle: ${f.vehicleFilter || "All"} | Date: ${f.dateFrom || "Start"} to ${f.dateTo || "End"} | Month: ${f.monthFilter || "All"}${f.searchQuery ? ` | Search: "${f.searchQuery}"` : ""}`;
                    const rows = filtered.map(r => ({
                        "Date":                formatDate(r.activity_date),
                        "Vehicle":             r.vehicle_number,
                        "Site":                r.site || "",
                        "Arrival Time":        formatTime(r.arrival_time),
                        "Loading Start":       formatTime(r.loading_start_time),
                        "Unloading End":       formatTime(r.unloading_end_time),
                        "Turnaround Time (hr/min)": formatDurationHM(r.turnaround_time),
                        "Gross Weight (MT)":   Number((Number(r.total_weight || 0)).toFixed(2)),
                        "Vehicle Weight (MT)": Number((Number(r.vehicle_weight || 0)).toFixed(2)),
                        "Net Weight (MT)":     Number((Number(r.net_weight || 0)).toFixed(2)),
                        "Net Weight (Brass)":  Number(tonToBrass(r.net_weight || 0, tonsPerBrass).toFixed(2)),
                    }));
                    await exportToFormattedExcel({
                        title: `Raw Material Report`,
                        subtitle,
                        sheetName: "Raw Material Report",
                        rows,
                        fileName: "raw_material_report.xlsx"
                    });
                } else {
                    generateRawMaterialReportPdf(filtered, { dateFrom: f.dateFrom, dateTo: f.dateTo, month: f.monthFilter, vehicle: f.vehicleFilter }, tonsPerBrass);
                }
            }
        } catch (err) {
            console.error("Failed to generate report:", err);
            alert("Error generating report. Please try again.");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleOpenResubmitModal = (item) => {
        setResubmitItem(item);
        setResubmitFormData(item.reference_data || {});
        setResubmitError("");
        setResubmitModal(true);
    };

    const handleResubmit = async (e) => {
        e.preventDefault();
        setResubmitSubmitting(true);
        setResubmitError("");

        try {
            if (resubmitItem.request_type === "ADD_VEHICLE") {
                await addVehicle({
                    ...resubmitFormData,
                    vehicle_number: resubmitFormData.vehicle_number ? capitalizeWords(resubmitFormData.vehicle_number.trim()) : "",
                    owner_name: resubmitFormData.owner_name ? capitalizeWords(resubmitFormData.owner_name.trim()) : ""
                });
            } else if (resubmitItem.request_type === "ADD_PARTY") {
                await addParty({
                    ...resubmitFormData,
                    party_name: resubmitFormData.party_name ? capitalizeWords(resubmitFormData.party_name.trim()) : "",
                    contact_person: resubmitFormData.contact_person ? capitalizeWords(resubmitFormData.contact_person.trim()) : ""
                });
            }

            alert("Request re-submitted successfully for Manager approval!");
            setResubmitModal(false);
            fetchMyRequests();
        } catch (err) {
            setResubmitError(err.response?.data?.message || "Failed to re-submit request.");
        } finally {
            setResubmitSubmitting(false);
        }
    };

    const filteredRequests = requests.filter(item => {
        if (activeTab === "all") return true;
        return item.status === activeTab;
    });

    const statusCounts = {
        all: requests.length,
        pending: requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved").length,
        rejected: requests.filter(r => r.status === "rejected").length,
    };

    return (
        <Layout>
            <div className="page-header" style={{ marginBottom: "1.5rem" }}>
                <h2>My Pending Work &amp; Approval Requests</h2>
                <p style={{ color: "var(--text-muted, #888)", marginTop: "0.25rem" }}>
                    Track all your submitted requests, view approval statuses, and access approved report downloads.
                </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                {[
                    { key: "all", label: `All Requests (${statusCounts.all})` },
                    { key: "pending", label: `⏳ Pending (${statusCounts.pending})` },
                    { key: "approved", label: `✅ Approved (${statusCounts.approved})` },
                    { key: "rejected", label: `❌ Rejected (${statusCounts.rejected})` },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: "0.6rem 1.2rem",
                            borderRadius: "8px",
                            border: activeTab === tab.key ? "none" : "1px solid #cbd5e1",
                            backgroundColor: activeTab === tab.key ? "#2563eb" : "white",
                            color: activeTab === tab.key ? "white" : "#475569",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Requests Table */}
            <div className="table-container">
                {loading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading your requests...</div>
                ) : filteredRequests.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                        No requests found under the "{activeTab}" filter.
                    </div>
                ) : (
                    <>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Submitted Date</th>
                                    <th>Request Type</th>
                                    <th>Summary / Reference</th>
                                    <th>Clerk Reason</th>
                                    <th>Status</th>
                                    <th>Manager Decision</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((item, i) => {
                                        const isReport = item.request_type === "PRINT_REPORT";
                                        const refData = item.reference_data || {};

                                        return (
                                            <tr key={item.approval_id}>
                                                <td>{(currentPage - 1) * pageSize + i + 1}</td>
                                                <td>{formatDate(item.created_at)}</td>
                                                <td>
                                                    <span style={{
                                                        padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700,
                                                        backgroundColor: isReport ? "#eff6ff" : "#f0fdf4",
                                                        color: isReport ? "#1d4ed8" : "#15803d",
                                                        border: isReport ? "1px solid #bfdbfe" : "1px solid #bbf7d0"
                                                    }}>
                                                        {item.request_type.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: "240px" }}>
                                                    {isReport ? (
                                                        <div>
                                                            <strong>{refData.report_type}</strong>
                                                            <div style={{ fontSize: "0.8em", color: "#64748b" }}>
                                                                {refData.parameters?.records_count ? `${refData.parameters.records_count} records` : "Full export"}
                                                            </div>
                                                        </div>
                                                    ) : item.request_type === "EDIT_SALE" ? (
                                                        <div>
                                                            <strong>Sale #{refData.sales_id || item.reference_id}</strong>
                                                            <div style={{ fontSize: "0.8em", color: "#64748b" }}>
                                                                {refData.party_name || "Party"} ({refData.quantity || refData.quantity_tons} {refData.unit || "tons"})
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <strong>{refData.vehicle_number || refData.party_name || `Ref #${item.reference_id}`}</strong>
                                                            {refData.owner_name && <div style={{ fontSize: "0.8em", color: "#64748b" }}>Owner: {refData.owner_name}</div>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ maxWidth: "180px", fontSize: "0.85rem", color: "#475569" }}>
                                                    {item.reason || "—"}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700,
                                                        backgroundColor: item.status === "approved" ? "#d1fae5" : item.status === "rejected" ? "#fee2e2" : "#fef3c7",
                                                        color: item.status === "approved" ? "#065f46" : item.status === "rejected" ? "#991b1b" : "#92400e"
                                                    }}>
                                                        {item.status === "approved" ? "✅ Approved" : item.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: "0.85rem" }}>
                                                    {item.status !== "pending" ? (
                                                        <div>
                                                            <div style={{ color: "#334155", fontWeight: 600 }}>
                                                                By {item.reviewed_by_name || "Manager"} on {formatDate(item.reviewed_at)}
                                                            </div>
                                                            {item.rejection_reason && (
                                                                <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "2px" }}>
                                                                    <strong>Note:</strong> {item.rejection_reason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>Awaiting review...</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.request_type === "EDIT_SALE" ? (
                                                        <button
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "6px",
                                                                border: "1px solid #cbd5e1",
                                                                backgroundColor: "#f8fafc",
                                                                color: "#334155",
                                                                fontWeight: 600,
                                                                fontSize: "0.8rem",
                                                                cursor: "pointer"
                                                            }}
                                                            onClick={() => setSelectedRequest(item)}
                                                        >
                                                            👁️ View Changes
                                                        </button>
                                                    ) : isReport && item.status === "approved" ? (
                                                        <div style={{ display: "flex", gap: "6px" }}>
                                                            <button
                                                                onClick={() => handleDownloadReport(item, "pdf")}
                                                                disabled={downloadingId === item.approval_id}
                                                                style={{
                                                                    padding: "4px 8px", borderRadius: "6px", border: "none",
                                                                    backgroundColor: "#dc2626", color: "white", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer"
                                                                }}
                                                            >
                                                                {downloadingId === item.approval_id ? "..." : "📄 PDF"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadReport(item, "excel")}
                                                                disabled={downloadingId === item.approval_id}
                                                                style={{
                                                                    padding: "4px 8px", borderRadius: "6px", border: "none",
                                                                    backgroundColor: "#16a34a", color: "white", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer"
                                                                }}
                                                            >
                                                                {downloadingId === item.approval_id ? "..." : "📥 Excel"}
                                                            </button>
                                                        </div>
                                                    ) : item.status === "rejected" && (item.request_type === "ADD_VEHICLE" || item.request_type === "ADD_PARTY") ? (
                                                        <button
                                                            onClick={() => handleOpenResubmitModal(item)}
                                                            style={{
                                                                padding: "4px 10px", borderRadius: "6px", border: "none",
                                                                backgroundColor: "#2563eb", color: "white", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer"
                                                            }}
                                                        >
                                                            🔄 Edit &amp; Resubmit
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: "#cbd5e1" }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>

                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredRequests.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </>
                )}
            </div>

            {/* View Changes Modal for Edit Requests */}
            {selectedRequest && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "550px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#1e1b4b" }}>
                            👁️ Change Comparison Details (Sale #{selectedRequest.reference_id})
                        </h3>

                        <ApprovalChangeDetails referenceData={selectedRequest.reference_data} />

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                            <button
                                style={{
                                    padding: "0.6rem 1.2rem", borderRadius: "6px", border: "1px solid #cbd5e1",
                                    backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 600, cursor: "pointer"
                                }}
                                onClick={() => setSelectedRequest(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit & Resubmit Modal for Rejected Entries */}
            {resubmitModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "480px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e1b4b" }}>
                            🔄 Edit &amp; Resubmit Rejected Request
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                            Update your submission details below based on Manager feedback and resubmit for approval.
                        </p>

                        {resubmitError && (
                            <div style={{ padding: "0.75rem", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                                {resubmitError}
                            </div>
                        )}

                        <form onSubmit={handleResubmit}>
                            {resubmitItem.request_type === "ADD_VEHICLE" && (
                                <>
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Vehicle Number *</label>
                                        <input
                                            type="text"
                                            required
                                            value={resubmitFormData.vehicle_number || ""}
                                            onChange={(e) => setResubmitFormData({ ...resubmitFormData, vehicle_number: e.target.value })}
                                            style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", textTransform: "uppercase" }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Owner Name</label>
                                        <input
                                            type="text"
                                            value={resubmitFormData.owner_name || ""}
                                            onChange={(e) => setResubmitFormData({ ...resubmitFormData, owner_name: e.target.value })}
                                            style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                </>
                            )}

                            {resubmitItem.request_type === "ADD_PARTY" && (
                                <>
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Party Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={resubmitFormData.party_name || ""}
                                            onChange={(e) => setResubmitFormData({ ...resubmitFormData, party_name: e.target.value })}
                                            style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Contact Person</label>
                                        <input
                                            type="text"
                                            value={resubmitFormData.contact_person || ""}
                                            onChange={(e) => setResubmitFormData({ ...resubmitFormData, contact_person: e.target.value })}
                                            style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                </>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                                <button
                                    type="button"
                                    onClick={() => setResubmitModal(false)}
                                    disabled={resubmitSubmitting}
                                    style={{ padding: "0.6rem 1.2rem", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 600, cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resubmitSubmitting}
                                    style={{ padding: "0.6rem 1.2rem", borderRadius: "6px", border: "none", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" }}
                                >
                                    {resubmitSubmitting ? "Submitting..." : "Resubmit for Approval"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
