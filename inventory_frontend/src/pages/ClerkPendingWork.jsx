import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getMyPendingApprovals } from "../services/approvalApi";
import { addVehicle } from "../services/vehicleApi";
import { addParty } from "../services/partyApi";
import * as XLSX from "xlsx";
import { getSales } from "../services/salesApi";
import { getParties } from "../services/partyApi";
import { getProduction } from "../services/productionApi";
import { getProducts } from "../services/productApi";
import { getPartyReport } from "../services/reportsApi";
import { getVehicleActivities } from "../services/vehicleActivityApi";
import {
    generateSalesReportPdf,
    generateProductionReportPdf,
    generatePartyReportPdf,
    generateRawMaterialReportPdf
} from "../utils/pdfGenerator";

export default function ClerkPendingWork() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    
    // Vehicle request states
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ vehicle_number: "", owner: "" });
    const [submitting, setSubmitting] = useState(false);
    
    // Party request states
    const [showPartyModal, setShowPartyModal] = useState(false);
    const [newParty, setNewParty] = useState({ party_name: "", gst_no: "", address: "", pan_no: "" });
    const [submittingParty, setSubmittingParty] = useState(false);

    const handleDownloadReport = async (req) => {
        if (!req.reference_data) return;
        setDownloadingId(req.request_id);
        try {
            const { report_type, format, filters: f, pdf_unit } = req.reference_data;
            
            const exportToExcelLocal = (rows, filename, sheetName) => {
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                XLSX.writeFile(wb, filename);
            };

            if (report_type === "sales") {
                const salesRes = await getSales();
                const salesData = salesRes.data?.sales || salesRes.data || [];
                const filtered = salesData.filter((s) => {
                    if (f.dateFrom && s.sales_date < f.dateFrom) return false;
                    if (f.dateTo   && s.sales_date > f.dateTo)   return false;
                    if (f.monthFilter) {
                        const rowMonth = s.sales_date?.slice(0, 7);
                        if (rowMonth !== f.monthFilter) return false;
                    }
                    if (f.partyFilter && String(s.party_id) !== f.partyFilter) return false;
                    if (f.vehicleFilter && s.vehicle_number !== f.vehicleFilter) return false;
                    if (f.searchQuery) {
                        const q = f.searchQuery.toLowerCase();
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

                if (format === "excel") {
                    const rows = filtered.map(s => ({
                        "Date":           s.sales_date,
                        "Party":          s.party_name,
                        "Product":        s.product_name,
                        "Vehicle":        s.vehicle_number || "",
                        "Vehicle Owner":  s.vehicle_owner || "",
                        "Quantity (Tons)": s.quantity_tons ? Number(s.quantity_tons).toFixed(2) : "0.00",
                        "Unit":           s.unit,
                        "Site":           s.site || "",
                        "Price":          s.price || "",
                        "Loading Time":   s.loading_time || "",
                        "Unloading Time": s.unloading_time || "",
                        "Remarks":        s.remarks || "",
                    }));
                    exportToExcelLocal(rows, "sales_report.xlsx", "Sales Report");
                } else {
                    const partiesRes = await getParties();
                    const partiesList = partiesRes.data || [];
                    const partyName = partiesList.find(p => String(p.party_id) === f.partyFilter)?.party_name || "All";
                    generateSalesReportPdf(filtered, {
                        dateFrom: f.dateFrom,
                        dateTo: f.dateTo,
                        month: f.monthFilter,
                        party: partyName,
                        vehicle: f.vehicleFilter
                    }, pdf_unit);
                }
            } else if (report_type === "production") {
                const prodRes = await getProduction();
                const prodData = prodRes.data || [];
                const filtered = prodData.filter((p) => {
                    if (f.dateFrom && p.production_date < f.dateFrom) return false;
                    if (f.dateTo   && p.production_date > f.dateTo)   return false;
                    if (f.monthFilter && p.production_date?.slice(0,7) !== f.monthFilter) return false;
                    if (f.productFilter && String(p.product_id) !== f.productFilter) return false;
                    if (f.searchQuery) {
                        const q = f.searchQuery.toLowerCase();
                        const match = 
                            p.product_name?.toLowerCase().includes(q) ||
                            p.unit?.toLowerCase().includes(q) ||
                            String(p.production_cost || "").includes(q);
                        if (!match) return false;
                    }
                    return true;
                });

                if (format === "excel") {
                    const rows = filtered.map(r => ({
                        "Date":            r.production_date,
                        "Product":         r.product_name,
                        "Quantity (Tons)": r.quantity_tons ? Number(r.quantity_tons).toFixed(2) : "0.00",
                        "Unit":            r.unit,
                        "Production Cost": r.production_cost,
                    }));
                    exportToExcelLocal(rows, "production_report.xlsx", "Production Report");
                } else {
                    const productsRes = await getProducts();
                    const productsList = productsRes.data || [];
                    const productName = productsList.find(p => String(p.product_id) === f.productFilter)?.product_name || "All";
                    generateProductionReportPdf(filtered, {
                        dateFrom: f.dateFrom,
                        dateTo: f.dateTo,
                        month: f.monthFilter,
                        product: productName
                    }, pdf_unit);
                }
            } else if (report_type === "party") {
                const partyRes = await getPartyReport(f.party_id);
                const partyData = partyRes.data;
                if (format === "excel") {
                    const rows = partyData.sales.map(s => ({
                        "Date":           s.sales_date,
                        "Product":        s.product_name,
                        "Vehicle":        s.vehicle_number || "",
                        "Vehicle Owner":  s.vehicle_owner || "",
                        "Quantity (Tons)": s.quantity_tons ? Number(s.quantity_tons).toFixed(2) : "0.00",
                        "Unit":           s.unit,
                        "Site":           s.site || "",
                        "Price":          s.price || "",
                        "Remarks":        s.remarks || "",
                    }));
                    exportToExcelLocal(rows, `party_${partyData.party.party_name.replace(/\s/g,"_")}_report.xlsx`, "Party Report");
                } else {
                    generatePartyReportPdf(partyData, pdf_unit);
                }
            } else if (report_type === "raw") {
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
                    const rows = filtered.map(r => ({
                        "Date":                r.activity_date,
                        "Vehicle":             r.vehicle_number,
                        "Site":                r.site || "",
                        "Arrival Time":        r.arrival_time || "",
                        "Loading Start":       r.loading_start_time || "",
                        "Unloading End":       r.unloading_end_time || "",
                        "Turnaround Time":     r.turnaround_time || "",
                        "Total Weight (T)":    r.total_weight ? Number(r.total_weight).toFixed(2) : "0.00",
                        "Vehicle Weight (T)":  r.vehicle_weight ? Number(r.vehicle_weight).toFixed(2) : "0.00",
                        "Net Weight (T)":      r.net_weight ? Number(r.net_weight).toFixed(2) : "0.00",
                    }));
                    exportToExcelLocal(rows, "raw_material_report.xlsx", "Raw Material Report");
                } else {
                    generateRawMaterialReportPdf(filtered, {
                        dateFrom: f.dateFrom,
                        dateTo: f.dateTo,
                        month: f.monthFilter,
                        vehicle: f.vehicleFilter
                    }, pdf_unit);
                }
            }
        } catch (err) {
            console.error("Failed to generate report:", err);
            alert("Failed to download report. Please check server status or contact support.");
        } finally {
            setDownloadingId(null);
        }
    };

    const fetchMyRequests = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await getMyPendingApprovals();
            setRequests(res.data);
        } catch (err) {
            console.error("Failed to load requests:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRequests(false);

        const interval = setInterval(() => {
            fetchMyRequests(true);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleRequestVehicle = async (e) => {
        e.preventDefault();
        if (!newVehicle.vehicle_number.trim() || !newVehicle.owner.trim()) {
            alert("Vehicle Number and Owner are required.");
            return;
        }
        setSubmitting(true);
        try {
            await addVehicle(newVehicle);
            alert("Vehicle request submitted successfully!");
            setShowRequestModal(false);
            setNewVehicle({ vehicle_number: "", owner: "" });
            fetchMyRequests();
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data?.error || "Failed to submit request.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestParty = async (e) => {
        e.preventDefault();
        if (!newParty.party_name.trim()) {
            alert("Party Name is required.");
            return;
        }
        setSubmittingParty(true);
        try {
            await addParty(newParty);
            alert("Party request submitted successfully!");
            setShowPartyModal(false);
            setNewParty({ party_name: "", gst_no: "", address: "", pan_no: "" });
            fetchMyRequests();
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data?.error || "Failed to submit request.");
        } finally {
            setSubmittingParty(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "approved":
                return { backgroundColor: "#d1fae5", color: "#065f46" };
            case "rejected":
                return { backgroundColor: "#fee2e2", color: "#991b1b" };
            default:
                return { backgroundColor: "#fef3c7", color: "#92400e" };
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <div>
                    <h1>My Pending Work</h1>
                    <span style={{ fontSize: "0.9em", color: "var(--text-muted, #888)" }}>
                        Monitor approval status of your vehicle creations, party additions, and unloading requests
                    </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="primary-btn" onClick={() => setShowRequestModal(true)}>
                        + Request New Vehicle
                    </button>
                    <button className="primary-btn" style={{ backgroundColor: "#8b5cf6" }} onClick={() => setShowPartyModal(true)}>
                        + Request New Party
                    </button>
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <p style={{ textAlign: "center", padding: "2rem" }}>Loading requests...</p>
                ) : requests.length === 0 ? (
                    <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                        No pending request history found.
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Request ID</th>
                                <th>Type</th>
                                <th>Reference</th>
                                <th>Created At</th>
                                <th>Reviewed At</th>
                                <th>Status</th>
                                <th>Reviewed By</th>
                                <th>Manager Remark</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.request_id}>
                                    <td>{req.request_id}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: req.request_type === "vehicle" ? "#dbeafe" : req.request_type === "party" ? "#f3e8ff" : "#e0f2fe",
                                            color: req.request_type === "vehicle" ? "#1e40af" : req.request_type === "party" ? "#6b21a8" : "#0369a1",
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "4px",
                                            fontSize: "0.85em",
                                            fontWeight: "500",
                                            textTransform: "capitalize"
                                        }}>
                                            {req.request_type.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: "300px", wordBreak: "break-word" }}>
                                        {req.request_type === "report_print" ? (
                                            req.reference_data?.label || req.reference_id
                                        ) : (
                                            <strong>{req.reference_id}</strong>
                                        )}
                                    </td>
                                    <td>{req.created_at}</td>
                                    <td>{req.reviewed_at || "—"}</td>
                                    <td>
                                        <span style={{
                                            ...getStatusStyle(req.status),
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "4px",
                                            fontSize: "0.85em",
                                            fontWeight: "500",
                                            textTransform: "capitalize"
                                        }}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td>{req.manager_name || "—"}</td>
                                    <td style={{
                                        color: req.status === "rejected" ? "#dc2626" : "inherit",
                                        fontWeight: req.status === "rejected" ? "500" : "normal",
                                        maxWidth: "250px",
                                        wordBreak: "break-word"
                                    }}>
                                        {req.remark || "—"}
                                    </td>
                                    <td>
                                        {req.request_type === "report_print" && req.status === "approved" && (
                                            <button
                                                className="primary-btn"
                                                style={{
                                                    padding: "0.25rem 0.5rem",
                                                    fontSize: "0.8rem",
                                                    backgroundColor: downloadingId === req.request_id ? "#9ca3af" : "#10b981"
                                                }}
                                                onClick={() => handleDownloadReport(req)}
                                                disabled={downloadingId === req.request_id}
                                            >
                                                {downloadingId === req.request_id ? "Generating..." : "⬇ Download"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Request Vehicle Modal */}
            {showRequestModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <form onSubmit={handleRequestVehicle} style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 1.5rem 0", color: "#1e1b4b" }}>Request New Vehicle</h3>
                        <div style={{ marginBottom: "1.2rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                Vehicle Number
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%", padding: "0.75rem", borderRadius: "8px",
                                    border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box"
                                }}
                                placeholder="e.g. MH12AB1234"
                                value={newVehicle.vehicle_number}
                                onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_number: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                Owner Name
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%", padding: "0.75rem", borderRadius: "8px",
                                    border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box"
                                }}
                                placeholder="e.g. John Doe"
                                value={newVehicle.owner}
                                onChange={(e) => setNewVehicle({ ...newVehicle, owner: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Submit Request"}
                            </button>
                            <button
                                type="button"
                                className="primary-btn"
                                style={{ backgroundColor: "#9ca3af", color: "white", border: "none" }}
                                onClick={() => setShowRequestModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Request Party Modal */}
            {showPartyModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <form onSubmit={handleRequestParty} style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 1.5rem 0", color: "#1e1b4b" }}>Request New Party</h3>
                        <div style={{ marginBottom: "1.2rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                Party Name
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%", padding: "0.75rem", borderRadius: "8px",
                                    border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box"
                                }}
                                placeholder="e.g. ABC Enterprises"
                                value={newParty.party_name}
                                onChange={(e) => setNewParty({ ...newParty, party_name: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: "1.2rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                GST No
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%", padding: "0.75rem", borderRadius: "8px",
                                    border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box"
                                }}
                                placeholder="e.g. 27AAAAA1111A1Z1"
                                value={newParty.gst_no}
                                onChange={(e) => setNewParty({ ...newParty, gst_no: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: "1.2rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                PAN No
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%", padding: "0.75rem", borderRadius: "8px",
                                    border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box"
                                }}
                                placeholder="e.g. ABCDE1234F"
                                value={newParty.pan_no}
                                onChange={(e) => setNewParty({ ...newParty, pan_no: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500, color: "#475569" }}>
                                Address
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%", padding: "0.75rem", borderRadius: "8px",
                                    border: "1px solid #d1d5db", fontSize: "0.95rem", boxSizing: "border-box"
                                }}
                                placeholder="e.g. Mumbai, Maharashtra"
                                value={newParty.address}
                                onChange={(e) => setNewParty({ ...newParty, address: e.target.value })}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                type="submit"
                                className="primary-btn"
                                style={{ backgroundColor: "#8b5cf6" }}
                                disabled={submittingParty}
                            >
                                {submittingParty ? "Submitting..." : "Submit Request"}
                            </button>
                            <button
                                type="button"
                                className="primary-btn"
                                style={{ backgroundColor: "#9ca3af", color: "white", border: "none" }}
                                onClick={() => setShowPartyModal(false)}
                                disabled={submittingParty}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </Layout>
    );
}
