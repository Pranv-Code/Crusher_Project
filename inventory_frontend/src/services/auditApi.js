import api from "./api";

export const getAuditLogs = (params) => {
    return api.get("/audit-logs", { params });
};
