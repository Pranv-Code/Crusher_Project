import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addSale,
    addSalesBulk,
    updateSale,
    deleteSale,
    completeUnloading,
} from "../services/salesApi";

// Reusable Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import EditModal from "../components/modal/EditModal";
import Pagination from "../components/common/Pagination";

// ─── Helper: format a quantity cell with dual-unit display ───────────────────
const QtyCell = ({ displayQty, displayUnit, convertedQty, convertedUnit }) => (
    <div style={{ lineHeight: "1.3" }}>
        <span>{Number(displayQty).toFixed(2)} {displayUnit}</span>
        <br />
        <span style={{ fontSize: "0.75em", color: "var(--text-muted, #888)" }}>
            ≈ {Number(convertedQty).toFixed(2)} {convertedUnit}
        </span>
    </div>
);

// ─── Helper: format vehicle cell with owner in small text ────────────────────
const VehicleCell = ({ vehicleNumber, owner }) => (
    <div style={{ lineHeight: "1.3" }}>
        <span>{vehicleNumber}</span>
        {owner && (
            <>
                <br />
                <span style={{ fontSize: "0.75em", color: "var(--text-muted, #888)" }}>
                    {owner}
                </span>
            </>
        )}
    </div>
);

const getPendingSince = (salesDate, loadingTime) => {
    try {
        const now = new Date();
        const saleDateParts = salesDate.split("-");
        const yr = parseInt(saleDateParts[0], 10);
        const mo = parseInt(saleDateParts[1], 10) - 1;
        const dy = parseInt(saleDateParts[2], 10);
        
        let hr = 0, mn = 0;
        if (loadingTime) {
            const timeParts = loadingTime.split(":");
            hr = parseInt(timeParts[0], 10);
            mn = parseInt(timeParts[1], 10);
        }
        
        const loadingDt = new Date(yr, mo, dy, hr, mn);
        const diffMs = now - loadingDt;
        if (isNaN(diffMs) || diffMs < 0) return "0h";
        
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) {
            return `${diffHours}h`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            const remainingHours = diffHours % 24;
            return `${diffDays}d ${remainingHours}h`;
        }
    } catch (e) {
        return "—";
    }
};

const emptyNewSale = {
    sales_date: "",
    party_id: "",
    product_id: "",
    vehicle_number: "",
    quantity: "",
    unit: "",
    site: "",
    price: "",
    loading_time: "",
    unloading_time: "",
    remarks: "",
};

const Sales = () => {
    const capitalizeWords = (str) => {
        if (!str) return "";
        return str
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    };

    // --- Context Hook ---
    const {
        sales,
        pendingSales,
        fetchSales,
        fetchPendingSales,
        activeProducts,
        fetchActiveProducts,
        parties,
        fetchParties,
        vehicles,
        fetchVehicles,
        fetchProducts,
    } = useInventory();

    const products = activeProducts;

    // --- State Declarations ---
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [entryMode, setEntryMode] = useState("single"); // "single" or "bulk"

    // --- Pagination States ---
    const [pendingPage, setPendingPage] = useState(1);
    const [pendingPageSize, setPendingPageSize] = useState(5);
    const [completedPage, setCompletedPage] = useState(1);
    const [completedPageSize, setCompletedPageSize] = useState(10);

    // Reset pagination when data or search changes
    useEffect(() => {
        setPendingPage(1);
    }, [pendingSales.length, search]);

    useEffect(() => {
        setCompletedPage(1);
    }, [sales.length, search]);

    // --- Single Sale Entry State ---
    const [newSale, setNewSale] = useState(emptyNewSale);
    const [editData, setEditData] = useState({});

    // --- Bulk Sales Entry State ---
    const [bulkCommon, setBulkCommon] = useState({
        sales_date: "",
        party_id: "",
        site: "",
    });
    const [bulkRows, setBulkRows] = useState([
        { product_id: "", vehicle_number: "", quantity: "", unit: "", loading_time: "", price: "" }
    ]);

    // --- Unloading Modal State ---
    const [unloadingSaleId, setUnloadingSaleId] = useState(null);
    const [unloadingDate, setUnloadingDate] = useState("");
    const [unloadingTime, setUnloadingTime] = useState("");

    // --- Lifecycle Hook ---
    useEffect(() => {
        fetchSales();
        fetchPendingSales();
        fetchActiveProducts();
        fetchParties();
        fetchVehicles();
    }, []);

    // --- Client Side Filtering ---
    const filteredSales = sales.filter((sale) =>
        sale.party_name?.toLowerCase().includes(search.toLowerCase()) ||
        sale.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
        sale.product_name?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredPendingSales = pendingSales.filter((sale) =>
        sale.party_name?.toLowerCase().includes(search.toLowerCase()) ||
        sale.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
        sale.product_name?.toLowerCase().includes(search.toLowerCase())
    );

    // --- Action Handlers ---
    const handleAddSale = async () => {
        if (!newSale.unit) {
            alert("Please select a unit.");
            return;
        }
        if (parseFloat(newSale.quantity) <= 0) {
            alert("Quantity must be greater than zero.");
            return;
        }
        if (newSale.price && parseFloat(newSale.price) < 0) {
            alert("Price cannot be negative.");
            return;
        }
        try {
            await addSale({
                ...newSale,
                site: capitalizeWords(newSale.site)
            });
            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setShowAddForm(false);
            setNewSale(emptyNewSale);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Failed to add sale.";
            console.error("Add sale error:", err.response?.data || err);
            alert(msg);
        }
    };

    const handleAddBulkRow = () => {
        setBulkRows([
            ...bulkRows,
            { product_id: "", vehicle_number: "", quantity: "", unit: "", loading_time: "", price: "" }
        ]);
    };

    const handleDeleteBulkRow = (index) => {
        const rows = [...bulkRows];
        rows.splice(index, 1);
        setBulkRows(rows);
    };

    const handleBulkRowChange = (index, field, value) => {
        const rows = [...bulkRows];
        rows[index][field] = value;
        setBulkRows(rows);
    };

    const handleAddSalesBulk = async () => {
        try {
            if (!bulkCommon.sales_date || !bulkCommon.party_id) {
                alert("Sales date and Party are required in common section.");
                return;
            }
            if (bulkRows.length === 0) {
                alert("Please add at least one row.");
                return;
            }
            // Basic validation
            for (let i = 0; i < bulkRows.length; i++) {
                const r = bulkRows[i];
                if (!r.product_id || !r.vehicle_number || !r.quantity || !r.unit) {
                    alert(`Row ${i + 1} is missing required fields (Product, Vehicle, Quantity, or Unit).`);
                    return;
                }
                if (parseFloat(r.quantity) <= 0) {
                    alert(`Row ${i + 1} quantity must be greater than zero.`);
                    return;
                }
                if (r.price && parseFloat(r.price) < 0) {
                    alert(`Row ${i + 1} price cannot be negative.`);
                    return;
                }
            }

            const payload = {
                common: {
                    ...bulkCommon,
                    site: capitalizeWords(bulkCommon.site)
                },
                rows: bulkRows.map(r => ({
                    ...r,
                    quantity: parseFloat(r.quantity),
                    price: r.price ? parseFloat(r.price) : 0.0
                }))
            };

            const res = await addSalesBulk(payload);
            const msg = res.data?.message || `${res.data?.created} sale(s) added successfully.`;
            
            if (res.data?.errors && res.data.errors.length > 0) {
                alert(`${msg}\n\nErrors encountered:\n${res.data.errors.join("\n")}`);
            } else {
                alert(msg);
            }

            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setShowAddForm(false);
            setBulkCommon({ sales_date: "", party_id: "", site: "" });
            setBulkRows([{ product_id: "", vehicle_number: "", quantity: "", unit: "", loading_time: "", price: "" }]);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Failed to add bulk sales.";
            console.error("Add bulk sales error:", err.response?.data || err);
            alert(msg);
        }
    };

    const handleEdit = (sale) => {
        setEditingId(sale.sales_id);
        setEditData({
            sales_date: sale.sales_date,
            party_id: sale.party_id,
            product_id: sale.product_id,
            vehicle_number: sale.vehicle_number,
            quantity: sale.display_quantity,
            unit: sale.unit,
            site: sale.site,
            price: sale.price,
            loading_time: sale.loading_time || "",
            unloading_time: sale.unloading_time || "",
            remarks: sale.remarks || "",
        });
    };

    const handleSave = async (id) => {
        try {
            const res = await updateSale(id, {
                ...editData,
                site: capitalizeWords(editData.site)
            });
            alert(res.data?.message || "Sale Updated Successfully");
            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setEditingId(null);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Failed to update sale.";
            console.error("Update sale error:", err.response?.data || err);
            alert(msg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete Sale?")) return;
        try {
            const res = await deleteSale(id);
            alert(res.data?.message || "Sale Deleted Successfully");
            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Failed to delete sale.";
            console.error("Delete sale error:", err.response?.data || err);
            alert(msg);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleUnloadClick = (sale) => {
        setUnloadingSaleId(sale.sales_id);
        setUnloadingDate(sale.sales_date);
        const timeStr = new Date().toTimeString().split(" ")[0].substring(0, 5);
        setUnloadingTime(timeStr);
    };

    const handleCompleteUnloadingSave = async () => {
        try {
            if (!unloadingDate || !unloadingTime) {
                alert("Unloading Date and Time are required.");
                return;
            }
            const res = await completeUnloading(unloadingSaleId, {
                unloading_date: unloadingDate,
                unloading_time: unloadingTime
            });
            alert(res.data?.message || "Unloading completed successfully.");
            setUnloadingSaleId(null);
            await fetchSales(true);
            await fetchPendingSales(true);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Failed to complete unloading.";
            console.error("Complete unloading error:", err.response?.data || err);
            alert(msg);
        }
    };

    // --- UI Render ---
    return (
        <Layout>
            <div className="page-header">
                <h1>Sales</h1>
                <button
                    className="primary-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? "Cancel" : "+ Add Sale"}
                </button>
            </div>

            {showAddForm && (
                <div className="form-card">
                    {/* Toggle Entry Mode Tabs */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem" }}>
                        <button
                            type="button"
                            className="primary-btn"
                            style={{
                                background: entryMode === "single" ? "var(--primary-color, #4f46e5)" : "#f3f4f6",
                                color: entryMode === "single" ? "white" : "#4b5563",
                                border: "1px solid #d1d5db",
                                padding: "0.5rem 1.25rem",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                                transition: "all 0.2s"
                            }}
                            onClick={() => setEntryMode("single")}
                        >
                            Single Sale
                        </button>
                        <button
                            type="button"
                            className="primary-btn"
                            style={{
                                background: entryMode === "bulk" ? "var(--primary-color, #4f46e5)" : "#f3f4f6",
                                color: entryMode === "bulk" ? "white" : "#4b5563",
                                border: "1px solid #d1d5db",
                                padding: "0.5rem 1.25rem",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                                transition: "all 0.2s"
                            }}
                            onClick={() => setEntryMode("bulk")}
                        >
                            Bulk Sales
                        </button>
                    </div>

                    {entryMode === "single" ? (
                        <>
                            <div className="form-grid">
                                {/* Sale Date */}
                                <div className="form-group">
                                    <label>Sale Date</label>
                                    <input
                                        type="date"
                                        value={newSale.sales_date}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, sales_date: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Party */}
                                <div className="form-group">
                                    <label>Party</label>
                                    <select
                                        value={newSale.party_id}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, party_id: e.target.value })
                                        }
                                    >
                                        <option value="">Select Party</option>
                                        {parties
                                            .filter(p => p.status === "Active")
                                            .map((party) => (
                                                <option key={party.party_id} value={party.party_id}>
                                                    {party.party_name}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {/* Product */}
                                <div className="form-group">
                                    <label>Product</label>
                                    <select
                                        value={newSale.product_id}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, product_id: e.target.value })
                                        }
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((product) => (
                                            <option key={product.product_id} value={product.product_id}>
                                                {product.product_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Vehicle */}
                                <div className="form-group">
                                    <label>Vehicle</label>
                                    <select
                                        value={newSale.vehicle_number}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, vehicle_number: e.target.value })
                                        }
                                    >
                                        <option value="">Select Vehicle</option>
                                        {vehicles
                                            .filter(v => v.status === "Active")
                                            .map((vehicle) => (
                                                <option key={vehicle.vehicle_number} value={vehicle.vehicle_number}>
                                                    {vehicle.vehicle_number}{vehicle.owner ? ` — ${vehicle.owner}` : ""}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {/* Unit */}
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select
                                        value={newSale.unit}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, unit: e.target.value })
                                        }
                                    >
                                        <option value="">Select Unit</option>
                                        <option value="tons">MT</option>
                                        <option value="brass">Brass</option>
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div className="form-group">
                                    <label>Quantity ({newSale.unit})</label>
                                    <input
                                        type="number"
                                        value={newSale.quantity}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, quantity: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Site */}
                                <div className="form-group">
                                    <label>Site</label>
                                    <input
                                        type="text"
                                        value={newSale.site}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, site: e.target.value })
                                        }
                                        onBlur={(e) =>
                                            setNewSale({ ...newSale, site: capitalizeWords(e.target.value) })
                                        }
                                    />
                                </div>

                                {/* Price */}
                                <div className="form-group">
                                    <label>Price</label>
                                    <input
                                        type="number"
                                        value={newSale.price}
                                        placeholder="0.00"
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, price: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Loading Time */}
                                <div className="form-group">
                                    <label>Loading Time</label>
                                    <input
                                        type="time"
                                        value={newSale.loading_time}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, loading_time: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Unloading Time */}
                                <div className="form-group">
                                    <label>Unloading Time</label>
                                    <input
                                        type="time"
                                        value={newSale.unloading_time}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, unloading_time: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                    <label>Remarks</label>
                                    <input
                                        type="text"
                                        value={newSale.remarks}
                                        placeholder="Optional notes..."
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, remarks: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <button className="primary-btn" onClick={() => {
                                if(!newSale.sales_date || !newSale.party_id || !newSale.product_id || !newSale.vehicle_number || !newSale.unit || !newSale.quantity) {
                                    alert("Please fill all required fields.");
                                    return;
                                }
                                handleAddSale();
                            }} style={{ marginTop: "1rem" }}>
                                Save Sale
                            </button>
                        </>
                    ) : (
                        <div>
                            <h3 style={{ margin: "0 0 1rem 0" }}>Common Information</h3>
                            <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
                                <div className="form-group">
                                    <label>Sale Date</label>
                                    <input
                                        type="date"
                                        value={bulkCommon.sales_date}
                                        onChange={(e) =>
                                            setBulkCommon({ ...bulkCommon, sales_date: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Party</label>
                                    <select
                                        value={bulkCommon.party_id}
                                        onChange={(e) =>
                                            setBulkCommon({ ...bulkCommon, party_id: e.target.value })
                                        }
                                    >
                                        <option value="">Select Party</option>
                                        {parties
                                            .filter(p => p.status === "Active")
                                            .map((party) => (
                                                <option key={party.party_id} value={party.party_id}>
                                                    {party.party_name}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Site</label>
                                    <input
                                        type="text"
                                        value={bulkCommon.site}
                                        onChange={(e) =>
                                            setBulkCommon({ ...bulkCommon, site: e.target.value })
                                        }
                                        onBlur={(e) =>
                                            setBulkCommon({ ...bulkCommon, site: capitalizeWords(e.target.value) })
                                        }
                                    />
                                </div>
                            </div>

                            <h3 style={{ margin: "0 0 1rem 0" }}>Cart Items</h3>
                            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflowX: "auto", marginBottom: "1.5rem" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead style={{ backgroundColor: "#f9fafb" }}>
                                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.85em" }}>Product</th>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.85em" }}>Vehicle</th>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.85em" }}>Quantity</th>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.85em" }}>Unit</th>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.85em" }}>Loading Time</th>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.85em" }}>Price (Opt)</th>
                                            <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontSize: "0.85em" }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkRows.map((row, index) => (
                                            <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <select
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                                        value={row.product_id}
                                                        onChange={(e) => handleBulkRowChange(index, "product_id", e.target.value)}
                                                    >
                                                        <option value="">Select Product</option>
                                                        {products.map((p) => (
                                                            <option key={p.product_id} value={p.product_id}>
                                                                {p.product_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <select
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                                        value={row.vehicle_number}
                                                        onChange={(e) => handleBulkRowChange(index, "vehicle_number", e.target.value)}
                                                    >
                                                        <option value="">Select Vehicle</option>
                                                        {vehicles
                                                            .filter(v => v.status === "Active")
                                                            .map((v) => (
                                                                <option key={v.vehicle_number} value={v.vehicle_number}>
                                                                    {v.vehicle_number}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                </td>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <input
                                                        type="number"
                                                        style={{ width: "90px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                                        value={row.quantity}
                                                        placeholder="Qty"
                                                        onChange={(e) => handleBulkRowChange(index, "quantity", e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <select
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                                        value={row.unit}
                                                        onChange={(e) => handleBulkRowChange(index, "unit", e.target.value)}
                                                    >
                                                        <option value="">Select Unit</option>
                                                        <option value="tons">MT</option>
                                                        <option value="brass">Brass</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <input
                                                        type="time"
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                                        value={row.loading_time}
                                                        onChange={(e) => handleBulkRowChange(index, "loading_time", e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: "0.5rem" }}>
                                                    <input
                                                        type="number"
                                                        style={{ width: "90px", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                                        value={row.price}
                                                        placeholder="0.0"
                                                        onChange={(e) => handleBulkRowChange(index, "price", e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.85em" }}
                                                        onClick={() => handleDeleteBulkRow(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button
                                    type="button"
                                    className="primary-btn"
                                    style={{ backgroundColor: "#10b981", color: "white", border: "none" }}
                                    onClick={handleAddBulkRow}
                                >
                                    + Add Row
                                </button>
                                <button
                                    type="button"
                                    className="primary-btn"
                                    onClick={handleAddSalesBulk}
                                >
                                    Save All Bulk
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Search Filter Box */}
            <div className="table-container" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
                <input
                    className="search-box"
                    style={{ margin: 0, width: "100%", maxWidth: "400px" }}
                    placeholder="Search Party, Vehicle, Product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* ─── Pending Unloading Table ─── */}
            <div className="table-container" style={{ marginBottom: "2rem" }}>
                <h2 style={{ padding: "1rem 1rem 0.5rem 1rem", margin: 0, fontSize: "1.25rem", color: "#374151" }}>Pending Unloading</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Sale ID</th>
                            <th>Date</th>
                            <th>Party</th>
                            <th>Site</th>
                            <th>Vehicle</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Loading</th>
                            <th>Pending Since</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPendingSales.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                                    No Pending Sales Found
                                </td>
                            </tr>
                        ) : (
                            filteredPendingSales
                                .slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize)
                                .map((sale) => (
                                    <tr key={sale.sales_id}>
                                        <td>{sale.sales_id}</td>
                                        <td>{sale.sales_date}</td>
                                        <td>{sale.party_name}</td>
                                        <td>{sale.site || "—"}</td>
                                        <td>
                                            <VehicleCell
                                                vehicleNumber={sale.vehicle_number}
                                                owner={sale.vehicle_owner}
                                            />
                                        </td>
                                        <td>{sale.product_name}</td>
                                        <td>
                                            <QtyCell
                                                displayQty={sale.display_quantity}
                                                displayUnit={sale.unit.toLowerCase()==="tons"?"MT":"Brass"}
                                                convertedQty={sale.converted_quantity}
                                                convertedUnit={sale.converted_unit.toLowerCase()==="tons"?"MT":"Brass"}
                                            />
                                        </td>
                                        <td>{sale.loading_time || "—"}</td>
                                        <td>{getPendingSince(sale.sales_date, sale.loading_time)}</td>
                                        <td>
                                            <span style={{
                                                backgroundColor: sale.unloading_status === "pending_approval" ? "#fee2e2" : "#fef3c7",
                                                color: sale.unloading_status === "pending_approval" ? "#dc2626" : "#d97706",
                                                padding: "0.25rem 0.5rem",
                                                borderRadius: "4px",
                                                fontSize: "0.85em",
                                                fontWeight: "500",
                                                display: "inline-block"
                                            }}>
                                                {sale.unloading_status === "pending_approval" ? "Pending Approval" : "Pending Unloading"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                                <button
                                                    className="edit-btn"
                                                    style={{ backgroundColor: "#3b82f6", color: "white" }}
                                                    onClick={() => handleUnloadClick(sale)}
                                                >
                                                    Complete
                                                </button>
                                                <button className="edit-btn" onClick={() => handleEdit(sale)}>
                                                    Edit
                                                </button>
                                                <button className="delete-btn" onClick={() => handleDelete(sale.sales_id)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
                <Pagination
                    currentPage={pendingPage}
                    totalItems={filteredPendingSales.length}
                    pageSize={pendingPageSize}
                    onPageChange={setPendingPage}
                    onPageSizeChange={setPendingPageSize}
                    pageSizeOptions={[5, 10, 15, 20]}
                />
            </div>

            {/* ─── Sales History (Completed) Table ─── */}
            <div className="table-container">
                <h2 style={{ padding: "1rem 1rem 0.5rem 1rem", margin: 0, fontSize: "1.25rem", color: "#374151" }}>Sales History (Completed)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Party</th>
                            <th>Product</th>
                            <th>Vehicle</th>
                            <th>Quantity</th>
                            <th>Site</th>
                            <th>Price</th>
                            <th>Loading</th>
                            <th>Unloading</th>
                            <th>Remarks</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                                    No Completed Sales Found
                                </td>
                            </tr>
                        ) : (
                            filteredSales
                                .slice((completedPage - 1) * completedPageSize, completedPage * completedPageSize)
                                .map((sale) => (
                                    <tr key={sale.sales_id}>
                                        <td>{sale.sales_date}</td>
                                        <td>{sale.party_name}</td>
                                        <td>{sale.product_name}</td>
                                        <td>
                                            <VehicleCell
                                                vehicleNumber={sale.vehicle_number}
                                                owner={sale.vehicle_owner}
                                            />
                                        </td>
                                        <td>
                                            <QtyCell
                                                displayQty={sale.display_quantity}
                                                displayUnit={sale.unit.toLowerCase()==="tons"?"MT":"Brass"}
                                                convertedQty={sale.converted_quantity}
                                                convertedUnit={sale.converted_unit.toLowerCase()==="tons"?"MT":"Brass"}
                                            />
                                        </td>
                                        <td>{sale.site || "—"}</td>
                                        <td>{sale.price}</td>
                                        <td>{sale.loading_time || "—"}</td>
                                        <td>{sale.unloading_time || "—"}</td>
                                        <td>{sale.remarks || "—"}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                                <button className="edit-btn" onClick={() => handleEdit(sale)}>
                                                    Edit
                                                </button>
                                                <button className="delete-btn" onClick={() => handleDelete(sale.sales_id)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
                <Pagination
                    currentPage={completedPage}
                    totalItems={filteredSales.length}
                    pageSize={completedPageSize}
                    onPageChange={setCompletedPage}
                    onPageSizeChange={setCompletedPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                />
            </div>

            {/* Edit modal */}
            <EditModal
                isOpen={editingId !== null}
                title="Edit Sale"
                onSave={() => handleSave(editingId)}
                onClose={handleCancel}
            >
                <InputField
                    label="Sale Date"
                    type="date"
                    value={editData.sales_date || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, sales_date: e.target.value })
                    }
                />

                <SelectField
                    label="Party"
                    name="party_id"
                    value={editData.party_id || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, party_id: e.target.value })
                    }
                    options={parties
                        .filter(p => p.status === "Active")
                        .map((p) => ({
                            value: p.party_id,
                            label: p.party_name,
                        }))}
                />

                <SelectField
                    label="Product"
                    name="product_id"
                    value={editData.product_id || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, product_id: e.target.value })
                    }
                    options={products.map((p) => ({
                        value: p.product_id,
                        label: p.product_name,
                    }))}
                />

                <SelectField
                    label="Vehicle"
                    name="vehicle_number"
                    value={editData.vehicle_number || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, vehicle_number: e.target.value })
                    }
                    options={vehicles
                        .filter(v => v.status === "Active")
                        .map((v) => ({
                            value: v.vehicle_number,
                            label: v.owner
                                ? `${v.vehicle_number} — ${v.owner}`
                                : v.vehicle_number,
                        }))}
                />

                <SelectField
                    label="Unit"
                    name="unit"
                    value={editData.unit || "tons"}
                    onChange={(e) =>
                        setEditData({ ...editData, unit: e.target.value })
                    }
                    options={[
                        { value: "tons", label: "MT" },
                        { value: "brass", label: "Brass" },
                    ]}
                />

                <InputField
                    label="Quantity"
                    type="number"
                    value={editData.quantity || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, quantity: e.target.value })
                    }
                />

                <InputField
                    label="Site"
                    type="text"
                    value={editData.site || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, site: e.target.value })
                    }
                    onBlur={(e) =>
                        setEditData({ ...editData, site: capitalizeWords(e.target.value) })
                    }
                />

                <InputField
                    label="Price"
                    type="number"
                    value={editData.price || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, price: e.target.value })
                    }
                />

                <InputField
                    label="Loading Time"
                    type="time"
                    value={editData.loading_time || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, loading_time: e.target.value })
                    }
                />

                <InputField
                    label="Unloading Time"
                    type="time"
                    value={editData.unloading_time || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, unloading_time: e.target.value })
                    }
                />

                <InputField
                    label="Remarks"
                    type="text"
                    value={editData.remarks || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, remarks: e.target.value })
                    }
                />
            </EditModal>

            {/* Complete Unloading Modal */}
            <EditModal
                isOpen={unloadingSaleId !== null}
                title="Complete Unloading"
                onSave={handleCompleteUnloadingSave}
                onClose={() => setUnloadingSaleId(null)}
            >
                <InputField
                    label="Unloading Date"
                    type="date"
                    value={unloadingDate}
                    onChange={(e) => setUnloadingDate(e.target.value)}
                />
                <InputField
                    label="Unloading Time"
                    type="time"
                    value={unloadingTime}
                    onChange={(e) => setUnloadingTime(e.target.value)}
                />
            </EditModal>
        </Layout>
    );
};

export default Sales;