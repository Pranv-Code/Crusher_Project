import api from "./api";

export const getGoodsReturns = (params = {}) =>
    api.get("/goods-returns", { params });

export const getGoodsReturnStats = () =>
    api.get("/goods-returns/stats");

export const addGoodsReturn = (data) =>
    api.post("/goods-returns", data);

export const deleteGoodsReturn = (id) =>
    api.delete(`/goods-returns/${id}`);
