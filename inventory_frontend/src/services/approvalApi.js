import api from "./api";

export const getApprovals = () =>
    api.get("/approvals");

export const actionApproval = (id, data) =>
    api.put(`/approvals/${id}`, data);

export const getMyPendingApprovals = () =>
    api.get("/approvals/my-pending");

export const requestReportPrint = (data) =>
    api.post("/approvals/request-report", data);

