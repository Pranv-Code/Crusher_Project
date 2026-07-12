import api from "./api";

export const getUsers = () =>
    api.get("/users");

export const updateUserStatus = (userId, status) =>
    api.put(`/users/${userId}/status`, { status });

export const resetUserPassword = (userId, password) =>
    api.put(`/users/${userId}/reset-password`, { password });
