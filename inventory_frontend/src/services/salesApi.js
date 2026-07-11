import api from "./api";

export const getSales = () =>
    api.get("/sales");

export const getPendingSales = () =>
    api.get("/sales/pending");

export const addSale = (data) =>
    api.post("/sales", data);

export const addSalesBulk = (data) =>
    api.post("/sales/bulk", data);

export const updateSale = (id, data) =>
    api.put(`/sales/${id}`, data);

export const deleteSale = (id) =>
    api.delete(`/sales/${id}`);

export const completeUnloading = (id, data) =>
    api.put(`/sales/${id}/unload`, data);