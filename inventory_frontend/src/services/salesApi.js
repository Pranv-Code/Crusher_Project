import api from "./api";

export const getSales = () => api.get("/sales");

export const addSales = (data) =>
    api.post("/sales", data);

export const updateSales = (id, data) =>
    api.put(`/sales/${id}`, data);

export const deleteSales = (id) =>
    api.delete(`/sales/${id}`);