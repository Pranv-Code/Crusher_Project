import api from "./api";

export const getSales = () =>
    api.get("/sales");

export const addSale = (data) =>
    api.post("/sales", data);

export const updateSale = (id, data) =>
    api.put(`/sales/${id}`, data);

export const deleteSale = (id) =>
    api.delete(`/sales/${id}`);