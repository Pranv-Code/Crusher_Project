import api from "./api";

export const getCrushers = () => {
    return api.get("/crushers");
};

export const addCrusher = (data) => {
    return api.post("/crushers", data);
};

export const updateCrusher = (id, data) => {
    return api.put(`/crushers/${id}`, data);
};

export const deleteCrusher = (id) => {
    return api.delete(`/crushers/${id}`);
};
