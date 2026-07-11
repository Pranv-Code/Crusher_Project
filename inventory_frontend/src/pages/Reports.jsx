import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import "./reports/Reports.css";

import SalesReport from "./reports/SalesReport";
import ProductionReport from "./reports/ProductionReport";
import PartyReport from "./reports/PartyReport";
import RawMaterialReport from "./reports/RawMaterialReport";

import { getSales } from "../services/salesApi";
import { getParties } from "../services/partyApi";
import { getVehicles } from "../services/vehicleApi";
import { getProduction } from "../services/productionApi";
import { getProducts } from "../services/productApi";
import { getVehicleActivities } from "../services/vehicleActivityApi";

const TABS = [
    { id: "sales", label: "Sales" },
    { id: "production", label: "Production" },
    { id: "party", label: "Party" },
    { id: "raw", label: "Raw Material" },
];

export default function Reports() {
    const [activeTab, setActiveTab] = useState("sales");

    const [sales, setSales] = useState([]);
    const [parties, setParties] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [productions, setProductions] = useState([]);
    const [products, setProducts] = useState([]);
    const [activities, setActivities] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setError(null);

        if (activeTab === "sales") {
            if (sales.length > 0 && parties.length > 0 && vehicles.length > 0) {
                setLoading(false);
                return;
            }
            setLoading(true);
            Promise.all([
                sales.length === 0 ? getSales() : Promise.resolve(null),
                parties.length === 0 ? getParties() : Promise.resolve(null),
                vehicles.length === 0 ? getVehicles() : Promise.resolve(null),
            ])
                .then(([salesRes, partiesRes, vehiclesRes]) => {
                    if (cancelled) return;
                    if (salesRes) setSales(salesRes.data?.sales || salesRes.data || []);
                    if (partiesRes) setParties(partiesRes.data || []);
                    if (vehiclesRes) setVehicles(vehiclesRes.data || []);
                })
                .catch((err) => {
                    if (!cancelled) {
                        console.error(err);
                        setError("Failed to load sales report data.");
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else if (activeTab === "production") {
            if (productions.length > 0 && products.length > 0) {
                setLoading(false);
                return;
            }
            setLoading(true);
            Promise.all([
                productions.length === 0 ? getProduction() : Promise.resolve(null),
                products.length === 0 ? getProducts() : Promise.resolve(null),
            ])
                .then(([prodRes, productsRes]) => {
                    if (cancelled) return;
                    if (prodRes) setProductions(prodRes.data || []);
                    if (productsRes) setProducts(productsRes.data || []);
                })
                .catch((err) => {
                    if (!cancelled) {
                        console.error(err);
                        setError("Failed to load production report data.");
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else if (activeTab === "party") {
            if (parties.length > 0) {
                setLoading(false);
                return;
            }
            setLoading(true);
            getParties()
                .then((partiesRes) => {
                    if (cancelled) return;
                    setParties(partiesRes.data || []);
                })
                .catch((err) => {
                    if (!cancelled) {
                        console.error(err);
                        setError("Failed to load party list data.");
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        } else if (activeTab === "raw") {
            if (activities.length > 0 && vehicles.length > 0) {
                setLoading(false);
                return;
            }
            setLoading(true);
            Promise.all([
                activities.length === 0 ? getVehicleActivities() : Promise.resolve(null),
                vehicles.length === 0 ? getVehicles() : Promise.resolve(null),
            ])
                .then(([actRes, vehiclesRes]) => {
                    if (cancelled) return;
                    if (actRes) setActivities(actRes.data || []);
                    if (vehiclesRes) setVehicles(vehiclesRes.data || []);
                })
                .catch((err) => {
                    if (!cancelled) {
                        console.error(err);
                        setError("Failed to load raw material report data.");
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }

        return () => {
            cancelled = true;
        };
    }, [activeTab]);

    const handleSwitchToSales = () => setActiveTab("sales");

    return (
        <Layout>
            <div className="page-header">
                <h1>Reports</h1>
                <span style={{ fontSize: "0.9em", color: "var(--text-muted, #888)" }}>
                    Analyze sales, production, parties &amp; raw material activity
                </span>
            </div>

            <div className="report-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`report-tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading && <div className="report-loading">Loading report data…</div>}
            {error && <div className="report-empty" style={{ color: "#dc2626" }}>{error}</div>}

            {!loading && !error && (
                <>
                    {activeTab === "sales" && (
                        <SalesReport
                            sales={sales}
                            parties={parties}
                            vehicles={vehicles}
                        />
                    )}
                    {activeTab === "production" && (
                        <ProductionReport
                            productions={productions}
                            products={products}
                        />
                    )}
                    {activeTab === "party" && (
                        <PartyReport
                            parties={parties}
                            onSwitchToSales={handleSwitchToSales}
                        />
                    )}
                    {activeTab === "raw" && (
                        <RawMaterialReport
                            activities={activities}
                            vehicles={vehicles}
                        />
                    )}
                </>
            )}
        </Layout>
    );
}
