import React, { createContext, useContext, useState } from "react";
import { getProducts, getActiveProducts } from "../services/productApi";
import { getProduction } from "../services/productionApi";
import { getSales } from "../services/salesApi";
import { getParties } from "../services/partyApi";
import { getVehicles } from "../services/vehicleApi";
import { getVehicleActivities } from "../services/vehicleActivityApi";

const InventoryContext = createContext();

export const useInventory = () => {
    return useContext(InventoryContext);
};

export const InventoryProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [activeProducts, setActiveProducts] = useState([]);
    const [production, setProduction] = useState([]);
    const [sales, setSales] = useState([]);
    const [parties, setParties] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [vehicleActivities, setVehicleActivities] = useState([]);

    const [productsLoaded, setProductsLoaded] = useState(false);
    const [activeProductsLoaded, setActiveProductsLoaded] = useState(false);
    const [productionLoaded, setProductionLoaded] = useState(false);
    const [salesLoaded, setSalesLoaded] = useState(false);
    const [partiesLoaded, setPartiesLoaded] = useState(false);
    const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
    const [vehicleActivitiesLoaded, setVehicleActivitiesLoaded] = useState(false);

    const fetchProducts = async (force = false) => {
        if (productsLoaded && !force) return;
        try {
            const res = await getProducts();
            setProducts(res.data);
            setProductsLoaded(true);
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    const fetchActiveProducts = async (force = false) => {
        if (activeProductsLoaded && !force) return;
        try {
            const res = await getActiveProducts();
            setActiveProducts(res.data);
            setActiveProductsLoaded(true);
        } catch (err) {
            console.error("Error fetching active products:", err);
        }
    };

    const fetchProduction = async (force = false) => {
        if (productionLoaded && !force) return;
        try {
            const res = await getProduction();
            setProduction(res.data);
            setProductionLoaded(true);
        } catch (err) {
            console.error("Error fetching production:", err);
        }
    };

    const fetchSales = async (force = false) => {
        if (salesLoaded && !force) return;
        try {
            const res = await getSales();
            setSales(res.data);
            setSalesLoaded(true);
        } catch (err) {
            console.error("Error fetching sales:", err);
        }
    };

    const fetchParties = async (force = false) => {
        if (partiesLoaded && !force) return;
        try {
            const res = await getParties();
            setParties(res.data);
            setPartiesLoaded(true);
        } catch (err) {
            console.error("Error fetching parties:", err);
        }
    };

    const fetchVehicles = async (force = false) => {
        if (vehiclesLoaded && !force) return;
        try {
            const res = await getVehicles();
            setVehicles(res.data);
            setVehiclesLoaded(true);
        } catch (err) {
            console.error("Error fetching vehicles:", err);
        }
    };

    const fetchVehicleActivities = async (force = false) => {
        if (vehicleActivitiesLoaded && !force) return;
        try {
            const res = await getVehicleActivities();
            setVehicleActivities(res.data);
            setVehicleActivitiesLoaded(true);
        } catch (err) {
            console.error("Error fetching vehicle activities:", err);
        }
    };

    return (
        <InventoryContext.Provider
            value={{
                products,
                activeProducts,
                production,
                sales,
                parties,
                vehicles,
                vehicleActivities,
                fetchProducts,
                fetchActiveProducts,
                fetchProduction,
                fetchSales,
                fetchParties,
                fetchVehicles,
                fetchVehicleActivities,
            }}
        >
            {children}
        </InventoryContext.Provider>
    );
};
