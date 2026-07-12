import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useAuth } from "../context/AuthContext";
import { getProducts } from "../services/productApi";
import { getProduction } from "../services/productionApi";
import { getSales } from "../services/salesApi";
import { getVehicles } from "../services/vehicleApi";
import { getParties } from "../services/partyApi";

import "../css/dashboard.css";

export default function Dashboard() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [production, setProduction] = useState([]);
    const [sales, setSales] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [parties, setParties] = useState([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            try {
                const [productsRes, productionRes, salesRes, vehiclesRes, partiesRes] = await Promise.all([
                    getProducts(),
                    getProduction(),
                    getSales(),
                    getVehicles(),
                    getParties()
                ]);

                setProducts(productsRes.data || []);
                setProduction(productionRes.data || []);
                setSales(salesRes.data.sales || (Array.isArray(salesRes.data) ? salesRes.data : []));
                setVehicles(vehiclesRes.data || []);
                setParties(partiesRes.data || []);
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <Layout>
                <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                    <h2>Loading Dashboard...</h2>
                    <p>Fetching latest metrics and inventory records</p>
                </div>
            </Layout>
        );
    }

    // Calculations
    // Total Sales
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
const totalSalesTons = sales.reduce(
    (sum, item) => sum + parseFloat(item.quantity_tons || 0),
    0
);

const totalSalesRevenue = sales.reduce(
    (sum, item) =>
        sum +
        parseFloat(item.quantity_tons || 0) * parseFloat(item.price || 0),
    0
);

// Monthly Sales (Current Month)
const monthlySalesTons = sales.reduce((sum, item) => {
    const recordDate = new Date(item.sales_date); // Change if your field is named differently

    if (
        recordDate.getFullYear() === currentYear &&
        recordDate.getMonth() === currentMonth
    ) {
        return sum + parseFloat(item.quantity_tons || 0);
    }

    return sum;
}, 0);

// Total Production
const totalProductionTons = production.reduce(
    (sum, item) => sum + parseFloat(item.quantity_tons || 0),
    0
);

    // Monthly track: production in the current calendar month as of today's date
    
    const monthlyProductionTons = production.reduce((sum, item) => {
        const recordDate = new Date(item.production_date);
        if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth) {
            return sum + parseFloat(item.quantity_tons || 0);
        }
        return sum;
    }, 0);

    const activeVehiclesCount = vehicles.filter(v => v.status === "Active").length;
    const totalPartiesCount = parties.length;

    // Last 5 Sales
    const recentSales = sales.slice(0, 5);

    // Last 5 Productions
    const recentProduction = production.slice(0, 5);

    // Active Products Stock Levels
    // const activeProducts = products.filter(p => p.status === "Active");
    const activeProducts = products.filter(p => p.status === "Active").sort((a, b) => b.quantity_tons - a.quantity_tons);

    return (
        <Layout>
            <div className="dashboard-container">
                {/* Welcome Card Banner */}
                <div className="welcome-card">
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", backgroundColor: "rgba(48, 155, 232, 0.1)", padding: "10px 20px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
                        🕒 {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Key Metrics Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-card-title">Montly Sales</span>
                        <span className="stat-card-value">{monthlySalesTons.toFixed(2)} T</span>
                        {/* <span className="stat-card-subtitle">Revenue: ₹{totalSalesRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> */}
                        <span className="stat-card-subtitle">Monthly (as of Today)</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-title">Total Sales</span>
                        <span className="stat-card-value">{totalSalesTons.toFixed(2)} T</span>
                        {/* <span className="stat-card-subtitle">Revenue: ₹{totalSalesRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> */}
                        <span className="stat-card-subtitle">Cumulative till today</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-title">Active Production</span>
                        <span className="stat-card-value">{monthlyProductionTons.toFixed(2)} T</span>
                        <span className="stat-card-subtitle">Monthly (as of today)</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-title">Total Production</span>
                        <span className="stat-card-value">{totalProductionTons.toFixed(2)} T</span>
                        <span className="stat-card-subtitle">Cumulative till date</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-card-title">Active Vehicles</span>
                        <span className="stat-card-value">{activeVehiclesCount}</span>
                        <span className="stat-card-subtitle">Out of {vehicles.length} registered</span>
                    </div>
                    {/* <div className="stat-card">
                        <span className="stat-card-title">Total Customers</span>
                        <span className="stat-card-value">{totalPartiesCount}</span>
                        <span className="stat-card-subtitle">Registered parties/accounts</span>
                    </div> */}
                </div>

                {/* Main Widgets layout */}
                <div className="dashboard-grid-layout">
                    {/* Current Stock Levels */}
                    <div className="dashboard-card stock-card">
                        <div className="dashboard-card-header">
                            <h3>Current Stock Levels</h3>
                        </div>
                        <div className="dashboard-card-body">
                            {activeProducts.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#64748b" }}>No active products in database.</p>
                            ) : (
                                <div className="stock-bar-container">
                                    {activeProducts.map(prod => {
                                        const qty = parseFloat(prod.quantity_tons || 0);
                                        const percent = Math.min((qty / totalProductionTons) * 100, 100);

                                        let fillClass = "fill-high";
                                        if (qty < 150) fillClass = "fill-low";
                                        else if (qty < 500) fillClass = "fill-medium";

                                        return (
                                            <div className="stock-item" key={prod.product_id}>
                                                <div className="stock-item-info">
                                                    <span>{prod.product_name}</span>
                                                    <span>{qty.toFixed(2)} Tons</span>
                                                </div>
                                                <div className="stock-progress-bg">
                                                    <div
                                                        className={`stock-progress-fill ${fillClass}`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    {/* <div className="dashboard-card"> */}
                        {/* <div className="dashboard-card-header">
                            <h3>System Overview</h3>
                        </div> */}
                        {/* <div className="dashboard-card-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}> */}
                            {/* <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ color: "#64748b", fontWeight: "500" }}>Registered Users</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>Active Accounts</span>
                            </div> */}
                            {/* <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ color: "#64748b", fontWeight: "500" }}>Total Sales Transactions</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{sales.length} logs</span>
                            </div> */}
                            {/* <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ color: "#64748b", fontWeight: "500" }}>Total Production Logs</span>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>{production.length} entries</span>
                            </div> */}
                            {/* <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}> */}
                                {/* <span style={{ color: "#64748b", fontWeight: "500" }}>Role Level</span> */}
                                {/* <span style={{ fontWeight: "700", color: "#4f46e5", textTransform: "uppercase", fontSize: "0.85rem" }}>
                                    🛡️ {user?.role}
                                </span> */}
                            {/* </div> */}
                        {/* </div> */}
                    </div>
                {/* </div> */}

                {/* Recent Activities Section */}
                <div className="dashboard-grid-layout">
                    {/* Recent Sales */}
                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h3>Recent Sales Entries</h3>
                        </div>
                        <div className="dashboard-card-body" style={{ padding: "0" }}>
                            {recentSales.length === 0 ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No sales transactions yet.</p>
                            ) : (
                                <table className="db-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Vehicle</th>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentSales.map(item => (
                                            <tr key={item.sales_id}>
                                                <td>{item.sales_date}</td>
                                                <td><strong>{item.vehicle_number}</strong></td>
                                                <td>{item.product_name || `ID: ${item.product_id}`}</td>
                                                <td>
                                                    <span className="db-badge db-badge-tons">
                                                        {parseFloat(item.quantity_tons).toFixed(2)} {item.unit}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Recent Production */}
                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h3>Recent Production Logs</h3>
                        </div>
                        <div className="dashboard-card-body" style={{ padding: "0" }}>
                            {recentProduction.length === 0 ? (
                                <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No production logs recorded yet.</p>
                            ) : (
                                <table className="db-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentProduction.map(item => (
                                            <tr key={item.production_id}>
                                                <td>{item.production_date}</td>
                                                <td>{item.product_name || `ID: ${item.product_id}`}</td>
                                                <td>
                                                    <span className="db-badge db-badge-brass">
                                                        {parseFloat(item.quantity_tons).toFixed(2)} {item.unit}
                                                    </span>
                                                </td>
                                                <td>₹{parseFloat(item.production_cost).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}