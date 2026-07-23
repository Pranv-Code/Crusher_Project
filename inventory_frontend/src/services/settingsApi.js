import api from "./api";

export const getSettings = () => api.get("/settings");

export const updateSettings = (data) => api.post("/settings", data);

export const getSettingsLogs = () => api.get("/settings/logs");
