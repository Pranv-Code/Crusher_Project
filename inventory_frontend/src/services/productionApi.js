import api from "./api";

export const getProduction = () => api.get("/production");

export const addProduction = (data) =>
    api.post("/production", data);

export const updateProduction = (id, data) =>
    api.put(`/production/${id}`, data);

export const deleteProduction = (id) =>
    api.delete(`/production/${id}`);