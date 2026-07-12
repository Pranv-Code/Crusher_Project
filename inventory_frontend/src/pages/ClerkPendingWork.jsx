import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getMyPendingApprovals } from "../services/approvalApi";
import { addVehicle } from "../services/vehicleApi";

export default function ClerkPendingWork() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Vehicle request states
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ vehicle_number: "", owner: "" });
    const [submitting, setSubmitting] = useState(false);

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
                        Monitor approval status of your vehicle creations and unloading requests
                    </span>
                </div>
                <button className="primary-btn" onClick={() => setShowRequestModal(true)}>
                    + Request New Vehicle
                </button>
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
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.request_id}>
                                    <td>{req.request_id}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: req.request_type === "vehicle" ? "#dbeafe" : "#e0f2fe",
                                            color: req.request_type === "vehicle" ? "#1e40af" : "#0369a1",
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "4px",
                                            fontSize: "0.85em",
                                            fontWeight: "500",
                                            textTransform: "capitalize"
                                        }}>
                                            {req.request_type.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td><strong>{req.reference_id}</strong></td>
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
        </Layout>
    );
}
