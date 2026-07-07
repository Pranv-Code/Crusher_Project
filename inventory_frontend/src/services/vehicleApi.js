import api from "./api";

export const getVehicle = () => api.get("/vehicles");

export const addVehicle = (data) =>
    api.post("/vehicles", data);

export const updateVehicle = (id, data) =>
    api.put(`/vehicles/${id}`, data);

export const deleteVehicle = (id) =>
    api.delete(`/vehicles/${id}`);