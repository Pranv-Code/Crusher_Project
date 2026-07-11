import api from "./api";

export const getVehicles = () =>
    api.get("/vehicles");

export const getActiveVehicles = () =>
    api.get("/vehicles/active");

export const addVehicle = (data) =>
    api.post("/vehicles", data);

export const updateVehicle = (vehicleNumber, data) =>
    api.put(`/vehicles/${vehicleNumber}`, data);

export const deleteVehicle = (vehicleNumber) =>
    api.delete(`/vehicles/${vehicleNumber}`);