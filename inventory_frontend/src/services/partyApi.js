import api from "./api";

export const getParties = () => api.get("/parties");

export const addParty = (data) => api.post("/parties", data);

export const updateParty = (id, data) =>
    api.put(`/parties/${id}`, data);

export const deleteParty = (id) =>
    api.delete(`/parties/${id}`);