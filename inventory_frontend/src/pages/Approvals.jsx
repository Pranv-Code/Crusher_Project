import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getApprovals, actionApproval } from "../services/approvalApi";

export default function Approvals() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectId, setRejectId] = useState(null);
    const [remark, setRemark] = useState("");

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const res = await getApprovals();
            setRequests(res.data);
        } catch (err) {
            console.error("Failed to load approvals:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm("Approve this request?")) return;
        try {
            await actionApproval(id, { status: "approved" });
            alert("Request approved successfully.");
            fetchPendingApprovals();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to approve request.");
        }
    };

    const handleRejectClick = (id) => {
        setRejectId(id);
        setRemark("");
    };

    const handleRejectSave = async () => {
        if (!remark.trim()) {
            alert("Remark is compulsory for rejections.");
            return;
        }
        try {
            await actionApproval(rejectId, { status: "rejected", remark });
            alert("Request rejected successfully.");
            setRejectId(null);
            fetchPendingApprovals();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to reject request.");
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <h1>Pending Approvals</h1>
                <span style={{ fontSize: "0.9em", color: "var(--text-muted, #888)" }}>
                    Process pending vehicle additions and unloading delay requests
                </span>
            </div>

            <div className="table-container">
                {loading ? (
                    <p style={{ textAlign: "center", padding: "2rem" }}>Loading approvals...</p>
                ) : requests.length === 0 ? (
                    <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                        No pending approval requests found.
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Requester</th>
                                <th>Type</th>
                                <th>Reference</th>
                                <th>Details</th>
                                <th>Created At</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.request_id}>
                                    <td>{req.request_id}</td>
                                    <td>{req.requester_name}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: req.request_type === "vehicle" 
                                                ? "#dbeafe" 
                                                : req.request_type === "user_registration" 
                                                    ? "#f3e8ff" 
                                                    : req.request_type.includes("edit") 
                                                        ? "#fef3c7" 
                                                        : req.request_type.includes("delete") 
                                                            ? "#fee2e2" 
                                                            : "#e0f2fe",
                                            color: req.request_type === "vehicle" 
                                                ? "#1e40af" 
                                                : req.request_type === "user_registration" 
                                                    ? "#6b21a8" 
                                                    : req.request_type.includes("edit") 
                                                        ? "#b45309" 
                                                        : req.request_type.includes("delete") 
                                                            ? "#b91c1c" 
                                                            : "#0369a1",
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "4px",
                                            fontSize: "0.85em",
                                            fontWeight: "500",
                                            textTransform: "capitalize"
                                        }}>
                                            {req.request_type.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>{req.reference_id}</td>
                                    <td style={{ maxWidth: "300px", wordBreak: "break-all" }}>{req.details}</td>
                                    <td>{new Date(req.created_at).toLocaleString()}</td>
                                    <td>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button
                                                className="edit-btn"
                                                style={{ backgroundColor: "#10b981", color: "white" }}
                                                onClick={() => handleApprove(req.request_id)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleRejectClick(req.request_id)}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Rejection Remark Prompt */}
            {rejectId !== null && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div style={{
                        background: "white", padding: "2rem", borderRadius: "12px",
                        width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                    }}>
                        <h3 style={{ margin: "0 0 1rem 0" }}>Reject Request</h3>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9em", fontWeight: 500 }}>
                                Compulsory Rejection Remark
                            </label>
                            <textarea
                                style={{
                                    width: "100%", height: "100px", padding: "0.75rem",
                                    borderRadius: "8px", border: "1px solid #d1d5db",
                                    outline: "none", fontSize: "0.95rem", resize: "none",
                                    boxSizing: "border-box"
                                }}
                                placeholder="Enter reason for rejection..."
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                className="primary-btn"
                                style={{ backgroundColor: "#ef4444", border: "none" }}
                                onClick={handleRejectSave}
                            >
                                Reject
                            </button>
                            <button
                                className="primary-btn"
                                style={{ backgroundColor: "#9ca3af", color: "white", border: "none" }}
                                onClick={() => setRejectId(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
