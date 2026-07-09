import api from "./api";

export const getVehicleActivities = () =>
    api.get("/vehicle-activity");

export const addVehicleActivity = (data) =>
    api.post("/vehicle-activity", data);

export const updateVehicleActivity = (id, data) =>
    api.put(`/vehicle-activity/${id}`, data);

export const deleteVehicleActivity = (id) =>
    api.delete(`/vehicle-activity/${id}`);
