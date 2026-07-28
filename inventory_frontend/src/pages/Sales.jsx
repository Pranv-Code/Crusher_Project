import React, { useEffect, useState, useMemo } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addSale,
    addSalesBulk,
    updateSale,
    deleteSale,
    completeUnloading,
} from "../services/salesApi";

import {
    getGoodsReturns,
    addGoodsReturn
} from "../services/goodsReturnApi";

// Reusable Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import SearchableSelect from "../components/common/SearchableSelect";
import EditModal from "../components/modal/EditModal";
import Pagination from "../components/common/Pagination";
import { formatDate, formatTime, formatInr, tonToBrass, brassToTon, smartCapitalize } from "../utils/formatUtils";
import { getSettings } from "../services/settingsApi";

// ─── Helper: format a quantity cell with dual-unit display ───────────────────
const QtyCell = ({ displayQty, displayUnit, convertedQty, convertedUnit, returnedTons }) => (
    <div style={{ lineHeight: "1.3" }}>
        <span>{Number(displayQty).toFixed(2)} {displayUnit}</span>
        <br />
        <span style={{ fontSize: "0.75em", color: "var(--text-muted, #888)" }}>
            ≈ {Number(convertedQty).toFixed(2)} {convertedUnit}
        </span>
        {returnedTons > 0 && (
            <div style={{
                marginTop: "4px",
                padding: "2px 6px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: "4px",
                color: "#dc2626",
                fontWeight: "bold",
                fontSize: "0.8em",
                display: "inline-block"
            }}>
                -{Number(returnedTons).toFixed(2)} MT
            </div>
        )}
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

// ─── Helper: calculate pending time duration ────────────────────────────────
const getPendingSince = (salesDate, loadingTime) => {
    if (!salesDate) return "—";
    try {
        let saleDateTime;
        if (loadingTime) {
            saleDateTime = new Date(`${salesDate}T${loadingTime}`);
        } else {
            saleDateTime = new Date(`${salesDate}T00:00:00`);
        }
        const now = new Date();
        const diffMs = now - saleDateTime;
        if (diffMs <= 0) return "Just now";

        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h ago`;
        if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m ago`;
        return `${diffMins} mins ago`;
    } catch (e) {
        return "—";
    }
};

const getTodayDateStr = () => new Date().toISOString().split("T")[0];

const emptyNewSale = {
    sales_date: getTodayDateStr(),
    party_id: "",
    product_id: "",
    vehicle_number: "",
    chalan_no: "",
    quantity: "",
    unit: "tons",
    site: "",
    price: "",
    loading_time: "",
    remarks: "",
};

const Sales = () => {
    const capitalizeWords = smartCapitalize;

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
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [entryMode, setEntryMode] = useState("single"); // "single" or "bulk"

    // --- Goods Returns State ---
    const [goodsReturns, setGoodsReturns] = useState([]);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnSale, setReturnSale] = useState(null);
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
    const [returnQty, setReturnQty] = useState("");
    const [returnUnit, setReturnUnit] = useState("tons");
    const [returnCondition, setReturnCondition] = useState("GOOD");
    const [returnReason, setReturnReason] = useState("");
    const [submittingReturn, setSubmittingReturn] = useState(false);
    const [returnFormError, setReturnFormError] = useState("");

    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    useEffect(() => {
        fetchVehicles(true);
        getSettings()
            .then(res => {
                if (res.data && res.data.tons_per_brass) {
                    setTonsPerBrass(parseFloat(res.data.tons_per_brass) || 4.2);
                }
            })
            .catch(() => { });
    }, []);

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
        sales_date: getTodayDateStr(),
        party_id: "",
        site: "",
        chalan_no: "",
    });
    const [bulkRows, setBulkRows] = useState([
        { product_id: "", vehicle_number: "", chalan_no: "", quantity: "", unit: "tons", loading_time: "", price: "" }
    ]);

    // --- Unloading Modal State ---
    const [unloadingSaleId, setUnloadingSaleId] = useState(null);
    const [unloadingDate, setUnloadingDate] = useState("");
    const [unloadingTime, setUnloadingTime] = useState("");

    // --- Goods Returns Fetching ---
    const fetchGoodsReturnsData = async () => {
        try {
            const res = await getGoodsReturns({ limit: 500 });
            setGoodsReturns(res.data.goods_returns || []);
        } catch (err) {
            console.error("Failed to load goods returns in Sales:", err);
        }
    };

    // --- Lifecycle Hook ---
    useEffect(() => {
        fetchSales();
        fetchPendingSales();
        fetchActiveProducts();
        fetchParties();
        fetchVehicles();
        fetchGoodsReturnsData();
    }, []);

    // --- Map Goods Returns by sale_id ---
    const returnsBySaleId = useMemo(() => {
        const map = {};
        goodsReturns.forEach(ret => {
            if (ret.sale_id) {
                if (!map[ret.sale_id]) map[ret.sale_id] = [];
                map[ret.sale_id].push(ret);
            }
        });
        return map;
    }, [goodsReturns]);

    // --- Client Side Filtering ---
    const filteredSales = sales.filter((sale) => {
        const matchesSearch =
            !search ||
            sale.party_name?.toLowerCase().includes(search.toLowerCase()) ||
            sale.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
            sale.product_name?.toLowerCase().includes(search.toLowerCase());

        const matchesDateFrom = !dateFrom || (sale.sales_date && sale.sales_date >= dateFrom);
        const matchesDateTo = !dateTo || (sale.sales_date && sale.sales_date <= dateTo);
        const matchesMonth = !monthFilter || (sale.sales_date && String(sale.sales_date).startsWith(monthFilter));

        return matchesSearch && matchesDateFrom && matchesDateTo && matchesMonth;
    });

    const filteredPendingSales = pendingSales.filter((sale) => {
        const matchesSearch =
            !search ||
            sale.party_name?.toLowerCase().includes(search.toLowerCase()) ||
            sale.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
            sale.product_name?.toLowerCase().includes(search.toLowerCase());

        const matchesDateFrom = !dateFrom || (sale.sales_date && sale.sales_date >= dateFrom);
        const matchesDateTo = !dateTo || (sale.sales_date && sale.sales_date <= dateTo);
        const matchesMonth = !monthFilter || (sale.sales_date && String(sale.sales_date).startsWith(monthFilter));

        return matchesSearch && matchesDateFrom && matchesDateTo && matchesMonth;
    });

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
            { product_id: "", vehicle_number: "", quantity: "", unit: "tons", loading_time: "", price: "" }
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
            if (bulkRows.length === 0) {
                alert("Please add at least one row.");
                return;
            }

            // Check if any row lacks a party_id or sales_date
            for (let i = 0; i < bulkRows.length; i++) {
                const r = bulkRows[i];
                const rParty = r.party_id || bulkCommon.party_id;
                const rDate = r.sales_date || bulkCommon.sales_date;

                if (!rDate) {
                    alert(`Sales Date is required (please select in Common Information section above or for Row ${i + 1}).`);
                    return;
                }
                if (!rParty) {
                    alert(`Party is required (please select Party in Common Information section above or for Row ${i + 1}).`);
                    return;
                }
                if (!r.vehicle_number || !r.quantity || !r.unit) {
                    alert(`Row ${i + 1} is missing required fields (Vehicle, Quantity, or Unit).`);
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
                    sales_date: bulkCommon.sales_date || null,
                    party_id: bulkCommon.party_id ? parseInt(bulkCommon.party_id) : null,
                    site: capitalizeWords(bulkCommon.site || "")
                },
                rows: bulkRows.map(r => ({
                    party_id: r.party_id ? parseInt(r.party_id) : (bulkCommon.party_id ? parseInt(bulkCommon.party_id) : null),
                    sales_date: r.sales_date || bulkCommon.sales_date || null,
                    product_id: r.product_id ? parseInt(r.product_id) : null,
                    vehicle_number: r.vehicle_number,
                    chalan_no: r.chalan_no ? r.chalan_no : (bulkCommon.chalan_no || null),
                    quantity: parseFloat(r.quantity),
                    unit: r.unit,
                    loading_time: r.loading_time || null,
                    price: r.price ? parseFloat(r.price) : 0,
                    site: r.site ? capitalizeWords(r.site) : (bulkCommon.site ? capitalizeWords(bulkCommon.site) : "")
                }))
            };

            const res = await addSalesBulk(payload);
            const count = res.data.created_count || res.data.created || bulkRows.length;
            let msg = `Successfully created ${count} sales entries.`;
            if (res.data.errors && res.data.errors.length > 0) {
                msg += `\n\nWarnings/Errors:\n` + res.data.errors.join("\n");
            }
            alert(msg);
            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setShowAddForm(false);
            setBulkRows([{ product_id: "", vehicle_number: "", chalan_no: "", quantity: "", unit: "tons", loading_time: "", price: "" }]);
            setBulkCommon({ sales_date: getTodayDateStr(), party_id: "", site: "", chalan_no: "" });

        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to create bulk sales.";
            alert(msg);
        }
    };

    const handleEdit = (sale) => {
        setEditingId(sale.sales_id);
        const qtyVal = (sale.display_quantity !== undefined && sale.display_quantity !== null)
            ? sale.display_quantity
            : (sale.quantity_tons !== undefined && sale.quantity_tons !== null ? sale.quantity_tons : (sale.quantity || ""));

        setEditData({
            sales_date: sale.sales_date || "",
            party_id: sale.party_id || "",
            product_id: sale.product_id || "",
            vehicle_number: sale.vehicle_number || "",
            chalan_no: sale.chalan_no || "",
            quantity: qtyVal !== undefined && qtyVal !== null ? String(qtyVal) : "",
            unit: sale.unit || "tons",
            site: sale.site || "",
            price: sale.price || "",
            loading_time: sale.loading_time || "",
            unloading_time: sale.unloading_time || "",
            remarks: sale.remarks || ""
        });
    };

    const handleSave = async (id) => {
        if (!editData.unit) {
            alert("Please select a unit.");
            return;
        }
        if (parseFloat(editData.quantity) <= 0) {
            alert("Quantity must be greater than zero.");
            return;
        }
        if (editData.price && parseFloat(editData.price) < 0) {
            alert("Price cannot be negative.");
            return;
        }

        try {
            const res = await updateSale(id, {
                ...editData,
                site: capitalizeWords(editData.site)
            });
            if (res.status === 202) {
                alert("Edit request submitted for Manager approval.");
            } else {
                alert("Sale updated successfully.");
            }
            setEditingId(null);
            setEditData({});
            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
        } catch (err) {
            const msg = err.response?.data?.message
                || err.response?.data?.error
                || err.message
                || "Failed to update sale.";
            console.error("Update sale error:", err.response?.data || err);
            alert(msg);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this sale?")) {
            try {
                const res = await deleteSale(id);
                if (res.status === 202) {
                    alert("Delete request submitted for Manager approval.");
                } else {
                    alert("Sale deleted successfully.");
                }
                await fetchSales(true);
                await fetchPendingSales(true);
                await fetchProducts(true);
                await fetchActiveProducts(true);
                await fetchGoodsReturnsData();
            } catch (err) {
                const msg = err.response?.data?.message
                    || err.response?.data?.error
                    || err.message
                    || "Failed to delete sale.";
                console.error("Delete sale error:", err.response?.data || err);
                alert(msg);
            }
        }
    };

    const handleUnloadClick = (sale) => {
        setUnloadingSaleId(sale.sales_id);
        setUnloadingDate(sale.sales_date);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
                || "Failed to complete unloading.";
            console.error("Complete unloading error:", err.response?.data || err);
            alert(msg);
        }
    };

    // --- Goods Return Handlers ---
    const handleOpenReturnModal = (sale) => {
        setReturnSale(sale);
        setReturnDate(new Date().toISOString().split("T")[0]);
        setReturnQty("");
        setReturnUnit(sale.unit?.toLowerCase() === "brass" ? "brass" : "tons");
        setReturnCondition("GOOD");
        setReturnReason("");
        setReturnFormError("");
        setShowReturnModal(true);
    };

    const handleSaveReturnSubmit = async (e) => {
        e.preventDefault();
        setReturnFormError("");

        if (!returnQty || parseFloat(returnQty) <= 0) {
            setReturnFormError("Please enter a valid positive return quantity.");
            return;
        }

        setSubmittingReturn(true);
        try {
            await addGoodsReturn({
                return_date: returnDate,
                sale_id: returnSale.sales_id,
                party_id: returnSale.party_id,
                product_id: returnSale.product_id,
                vehicle_number: returnSale.vehicle_number,
                quantity: parseFloat(returnQty),
                unit: returnUnit,
                condition_type: returnCondition,
                reason: returnReason
            });

            alert("Goods Return recorded successfully!");
            setShowReturnModal(false);
            await fetchGoodsReturnsData();
            await fetchSales(true);
            await fetchPendingSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
        } catch (err) {
            setReturnFormError(err.response?.data?.message || "Failed to record goods return.");
        } finally {
            setSubmittingReturn(false);
        }
    };

    return (
        <Layout>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "1.75rem", color: "var(--text-primary, #1e293b)" }}>Sales Management</h1>
                    <p style={{ margin: "0.25rem 0 0 0", color: "#64748b" }}>Record and track customer sales transactions</p>
                </div>
                {!showAddForm && (
                    <Button variant="primary" onClick={() => setShowAddForm(true)}>
                        + Add Sale
                    </Button>
                )}
            </div>

            {/* ─── Prominent Sales Filter Toolbar ─── */}
            <div
                style={{
                    marginBottom: "1.5rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    backgroundColor: "var(--card-bg, #ffffff)",
                    padding: "1rem 1.25rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
            >
                <div style={{ flex: "1 1 240px" }}>
                    <InputField
                        label="Search Sales"
                        placeholder="Search by party, vehicle, or product..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ flex: "0 1 160px" }}>
                    <InputField
                        label="From Date"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            setMonthFilter("");
                        }}
                    />
                </div>
                <div style={{ flex: "0 1 160px" }}>
                    <InputField
                        label="To Date"
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            setMonthFilter("");
                        }}
                    />
                </div>
                <div style={{ flex: "0 1 160px" }}>
                    <InputField
                        label="Filter Month"
                        type="month"
                        value={monthFilter}
                        onChange={(e) => {
                            setMonthFilter(e.target.value);
                            setDateFrom("");
                            setDateTo("");
                        }}
                    />
                </div>
                {(search || dateFrom || dateTo || monthFilter) && (
                    <div style={{ marginBottom: "2px" }}>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSearch("");
                                setDateFrom("");
                                setDateTo("");
                                setMonthFilter("");
                            }}
                        >
                            ✕ Reset Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Add Sale Form Drawer/Card */}
            {showAddForm && (
                <div className="form-card" style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h2 style={{ margin: 0, color: "var(--text-primary, #1e293b)" }}>Record New Sales</h2>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
                                <button
                                    onClick={() => setEntryMode("single")}
                                    style={{
                                        border: "none",
                                        background: entryMode === "single" ? "#ffffff" : "transparent",
                                        color: entryMode === "single" ? "#2563eb" : "#64748b",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        boxShadow: entryMode === "single" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                                    }}
                                >
                                    Single Entry
                                </button>
                                <button
                                    onClick={() => setEntryMode("bulk")}
                                    style={{
                                        border: "none",
                                        background: entryMode === "bulk" ? "#ffffff" : "transparent",
                                        color: entryMode === "bulk" ? "#2563eb" : "#64748b",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        boxShadow: entryMode === "bulk" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                                    }}
                                >
                                    Bulk Entry
                                </button>
                            </div>
                            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>

                    {entryMode === "single" ? (
                        <>
                            <div className="form-grid">
                                {/* Sale Date */}
                                <div className="form-group">
                                    <label>Sale Date *</label>
                                    <input
                                        type="date"
                                        value={newSale.sales_date}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, sales_date: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Chalan No */}
                                <div className="form-group">
                                    <label>Chalan No.</label>
                                    <input
                                        type="text"
                                        placeholder="Chalan No."
                                        value={newSale.chalan_no}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, chalan_no: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Party */}
                                <div className="form-group">
                                    <label>Party *</label>
                                    <select
                                        value={newSale.party_id}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, party_id: e.target.value })
                                        }
                                    >
                                        <option value="">Select Party</option>
                                        {parties
                                            .filter(p => p.status === "Active")
                                            .map((p) => (
                                                <option key={p.party_id} value={p.party_id}>
                                                    {p.party_name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Product */}
                                <div className="form-group">
                                    <label>Product *</label>
                                    <select
                                        value={newSale.product_id}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, product_id: e.target.value })
                                        }
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((p) => (
                                            <option key={p.product_id} value={p.product_id}>
                                                {p.product_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Vehicle */}
                                <SearchableSelect
                                    label="Vehicle Number *"
                                    name="vehicle_number"
                                    value={newSale.vehicle_number}
                                    onChange={(e) =>
                                        setNewSale({ ...newSale, vehicle_number: e.target.value })
                                    }
                                    options={vehicles
                                        .filter(v => v.status === "Active")
                                        .map((v) => ({
                                            value: v.vehicle_number,
                                            label: v.owner
                                                ? `${v.vehicle_number} — ${v.owner}`
                                                : v.vehicle_number,
                                        }))}
                                    placeholder="Search or enter vehicle..."
                                />

                                {/* Unit */}
                                <div className="form-group">
                                    <label>Unit *</label>
                                    <select
                                        value={newSale.unit}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, unit: e.target.value })
                                        }
                                    >
                                        <option value="tons">MT</option>
                                        <option value="brass">Brass</option>
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={newSale.quantity}
                                        onChange={(e) =>
                                            setNewSale({ ...newSale, quantity: e.target.value })
                                        }
                                    />
                                </div>

                                

                                {/* Price & Automatically Calculated Total Side-by-Side */}
                                <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div className="form-group">
                                        <label>Price/Unit (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={newSale.price}
                                            onChange={(e) =>
                                                setNewSale({ ...newSale, price: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Total Amount (₹) <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal" }}>(Auto Calculated)</span></label>
                                        <input
                                            type="text"
                                            readOnly
                                            disabled
                                            value={
                                                newSale.quantity && newSale.price
                                                    ? `₹${formatInr(parseFloat(newSale.quantity) * parseFloat(newSale.price))}`
                                                    : "₹0.00"
                                            }
                                            style={{
                                                backgroundColor: "#f8fafc",
                                                fontWeight: "700",
                                                color: "#1e293b",
                                                border: "1px solid #cbd5e1"
                                            }}
                                        />
                                    </div>
                                </div>
{/* Delivery Site & Loading Time Side-by-Side */}
                                <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div className="form-group">
                                        <label>Delivery Site</label>
                                        <input
                                            type="text"
                                            value={newSale.site}
                                            placeholder="Location / Site name"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const formatted = val ? val.charAt(0).toUpperCase() + val.slice(1) : "";
                                                setNewSale({ ...newSale, site: formatted });
                                            }}
                                        />
                                    </div>

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
                                if (!newSale.sales_date || !newSale.party_id || !newSale.product_id || !newSale.vehicle_number || !newSale.unit || !newSale.quantity) {
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
                            <div style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                borderRadius: "10px",
                                padding: "1.25rem",
                                marginBottom: "1.5rem"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem" }}>📌 Common Information (Applies to all entries)</h3>
                                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                                        Default values for all bulk rows below
                                    </span>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label style={{ fontWeight: 600 }}>Sale Date <span style={{ color: "#ef4444" }}>*</span></label>
                                        <input
                                            type="date"
                                            value={bulkCommon.sales_date}
                                            onChange={(e) =>
                                                setBulkCommon({ ...bulkCommon, sales_date: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontWeight: 600 }}>Party <span style={{ color: "#ef4444" }}>*</span></label>
                                        <select
                                            value={bulkCommon.party_id}
                                            onChange={(e) =>
                                                setBulkCommon({ ...bulkCommon, party_id: e.target.value })
                                            }
                                            style={{
                                                borderColor: !bulkCommon.party_id ? "#f87171" : "#cbd5e1",
                                                outline: !bulkCommon.party_id ? "1px solid #f87171" : "none"
                                            }}
                                        >
                                            <option value="">-- Select Party (Required) --</option>
                                            {parties
                                                .filter(p => p.status === "Active")
                                                .map((p) => (
                                                    <option key={p.party_id} value={p.party_id}>
                                                        {p.party_name}
                                                    </option>
                                                ))}
                                        </select>
                                        {!bulkCommon.party_id && (
                                            <span style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "2px" }}>
                                                Select Party for all bulk entries
                                            </span>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontWeight: 600 }}>Delivery Site</label>
                                        <input
                                            type="text"
                                            value={bulkCommon.site}
                                            placeholder="Common site name (Optional)"
                                            onChange={(e) =>
                                                setBulkCommon({ ...bulkCommon, site: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontWeight: 600 }}>Chalan No.</label>
                                        <input
                                            type="text"
                                            value={bulkCommon.chalan_no}
                                            placeholder="Common Chalan No. (Optional)"
                                            onChange={(e) =>
                                                setBulkCommon({ ...bulkCommon, chalan_no: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ margin: "0 0 1rem 0" }}>Vehicle & Product Entries</h3>
                            <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
                                <table className="form-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                            <th style={{ padding: "8px" }}>#</th>
                                            <th style={{ padding: "8px" }}>Vehicle *</th>
                                            <th style={{ padding: "8px" }}>Product</th>
                                            <th style={{ padding: "8px" }}>Chalan No.</th>
                                            <th style={{ padding: "8px" }}>Quantity *</th>
                                            <th style={{ padding: "8px" }}>Unit *</th>
                                            <th style={{ padding: "8px" }}>Price (₹)</th>
                                            <th style={{ padding: "8px" }}>Loading Time</th>
                                            <th style={{ padding: "8px" }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkRows.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                                <td style={{ padding: "8px" }}>{idx + 1}</td>
                                                <td style={{ padding: "8px", minWidth: "180px" }}>
                                                    <SearchableSelect
                                                        name="vehicle_number"
                                                        value={row.vehicle_number}
                                                        onChange={(e) => handleBulkRowChange(idx, "vehicle_number", e.target.value)}
                                                        options={vehicles.filter(v => v.status === "Active").map(v => ({
                                                            value: v.vehicle_number,
                                                            label: v.owner ? `${v.vehicle_number} (${v.owner})` : v.vehicle_number
                                                        }))}
                                                        placeholder="Search vehicle..."
                                                    />
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <select
                                                        value={row.product_id}
                                                        onChange={(e) => handleBulkRowChange(idx, "product_id", e.target.value)}
                                                        style={{ width: "100%", padding: "6px" }}
                                                    >
                                                        <option value="">Select Product</option>
                                                        {products.map(p => (
                                                            <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Chalan No."
                                                        value={row.chalan_no || ""}
                                                        onChange={(e) => handleBulkRowChange(idx, "chalan_no", e.target.value)}
                                                        style={{ width: "110px", padding: "6px" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={row.quantity}
                                                        onChange={(e) => handleBulkRowChange(idx, "quantity", e.target.value)}
                                                        style={{ width: "90px", padding: "6px" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <select
                                                        value={row.unit}
                                                        onChange={(e) => handleBulkRowChange(idx, "unit", e.target.value)}
                                                        style={{ padding: "6px" }}
                                                    >
                                                        <option value="tons">MT</option>
                                                        <option value="brass">Brass</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={row.price}
                                                        onChange={(e) => handleBulkRowChange(idx, "price", e.target.value)}
                                                        style={{ width: "90px", padding: "6px" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <input
                                                        type="time"
                                                        value={row.loading_time}
                                                        onChange={(e) => handleBulkRowChange(idx, "loading_time", e.target.value)}
                                                        style={{ padding: "6px" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    {bulkRows.length > 1 && (
                                                        <button
                                                            onClick={() => handleDeleteBulkRow(idx)}
                                                            style={{ background: "#ef4444", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                <Button variant="secondary" onClick={handleAddBulkRow}>
                                    + Add Row
                                </Button>
                                <Button variant="primary" onClick={handleAddSalesBulk}>
                                    Save All Entries
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}



            {/* ─── Pending Unloading Table ─── */}
            <div className="table-container" style={{ marginBottom: "2rem" }}>
                <h2 style={{ padding: "1rem 1rem 0.5rem 1rem", margin: 0, fontSize: "1.25rem", color: "#374151" }}>Pending Unloading</h2>
                <table>
                    <thead>
                        <tr>
                            <th style={{ whiteSpace: "nowrap" }}>Date</th>
                            <th style={{ whiteSpace: "nowrap" }}>Chalan No.</th>
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
                                    No Pending Unloading Entries Found
                                </td>
                            </tr>
                        ) : (
                            filteredPendingSales
                                .slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize)
                                .map((sale) => {
                                    const saleReturns = returnsBySaleId[sale.sales_id] || [];
                                    const totalRetTons = saleReturns.reduce((sum, r) => sum + parseFloat(r.returned_quantity_tons || 0), 0);

                                    return (
                                        <React.Fragment key={sale.sales_id}>
                                            <tr>
                                                <td style={{ whiteSpace: "nowrap" }}>{formatDate(sale.sales_date)}</td>
                                                <td style={{ whiteSpace: "nowrap" }}>
                                                    <strong style={{ color: "#2563eb" }}>{sale.chalan_no || "—"}</strong>
                                                </td>
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
                                                        displayUnit={sale.unit.toLowerCase() === "tons" ? "MT" : "Brass"}
                                                        convertedQty={sale.converted_quantity}
                                                        convertedUnit={sale.converted_unit.toLowerCase() === "tons" ? "MT" : "Brass"}
                                                        returnedTons={totalRetTons}
                                                    />
                                                </td>
                                                <td>{formatTime(sale.loading_time)}</td>
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
                                                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                                                        <button
                                                            className="edit-btn"
                                                            style={{ backgroundColor: "#3b82f6", color: "white" }}
                                                            onClick={() => handleUnloadClick(sale)}
                                                        >
                                                            Complete
                                                        </button>
                                                        <button
                                                            className="export-btn"
                                                            style={{ backgroundColor: "#ea580c", color: "white", padding: "4px 8px", fontSize: "0.8rem" }}
                                                            onClick={() => handleOpenReturnModal(sale)}
                                                        >
                                                            ↩ Return
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

                                            {/* Returned Entries Sub-rows in RED */}
                                            {saleReturns.map((ret) => (
                                                <tr key={`ret-pend-${ret.return_id}`} style={{ backgroundColor: "#fff5f5" }}>
                                                    <td colSpan="11" style={{ padding: "6px 16px", borderBottom: "1px dashed #fca5a5" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#b91c1c", fontSize: "0.85rem" }}>
                                                            <span>↩ <strong>Goods Return #{ret.return_id}</strong> ({formatDate(ret.return_date)}):</span>
                                                            <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "#dc2626" }}>
                                                                -{ret.returned_quantity_tons.toFixed(2)} MT
                                                            </span>
                                                            <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: "600" }}>
                                                                (≈ -{tonToBrass(ret.returned_quantity_tons, tonsPerBrass || 4.2).toFixed(2)} Brass)
                                                            </span>
                                                            <span style={{
                                                                backgroundColor: ret.condition_type === "GOOD" ? "#d1fae5" : "#fee2e2",
                                                                color: ret.condition_type === "GOOD" ? "#065f46" : "#991b1b",
                                                                padding: "2px 8px",
                                                                borderRadius: "10px",
                                                                fontSize: "0.75rem",
                                                                fontWeight: "bold"
                                                            }}>
                                                                {ret.condition_type === "GOOD" ? "🟢 Good to Use (Restocked)" : "🔴 Damaged (Wastage)"}
                                                            </span>
                                                            {ret.reason && <span style={{ fontStyle: "italic", color: "#475569" }}>"{ret.reason}"</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
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
                            <th style={{ whiteSpace: "nowrap" }}>Date</th>
                            <th style={{ whiteSpace: "nowrap" }}>Chalan No.</th>
                            <th>Party</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Price/Unit (₹)</th>
                            <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Total Price (₹)</th>
                            <th>Site</th>
                            <th>Vehicle</th>
                            <th>Loading</th>
                            <th>Unloading</th>
                            <th>Remarks</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan="13" style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                                    No Completed Sales Found
                                </td>
                            </tr>
                        ) : (
                            filteredSales
                                .slice((completedPage - 1) * completedPageSize, completedPage * completedPageSize)
                                .map((sale) => {
                                    const saleReturns = returnsBySaleId[sale.sales_id] || [];
                                    const totalRetTons = saleReturns.reduce((sum, r) => sum + parseFloat(r.returned_quantity_tons || 0), 0);
                                    const lineTotal = parseFloat(sale.display_quantity || 0) * parseFloat(sale.price || 0);

                                    return (
                                        <React.Fragment key={sale.sales_id}>
                                            <tr>
                                                <td style={{ whiteSpace: "nowrap" }}>{formatDate(sale.sales_date)}</td>
                                                <td style={{ whiteSpace: "nowrap" }}>
                                                    <strong style={{ color: "#2563eb" }}>{sale.chalan_no || "—"}</strong>
                                                </td>
                                                <td>{sale.party_name}</td>
                                                <td>{sale.product_name}</td>
                                                <td>
                                                    <QtyCell
                                                        displayQty={sale.display_quantity}
                                                        displayUnit={sale.unit.toLowerCase() === "tons" ? "MT" : "Brass"}
                                                        convertedQty={sale.converted_quantity}
                                                        convertedUnit={sale.converted_unit.toLowerCase() === "tons" ? "MT" : "Brass"}
                                                        returnedTons={totalRetTons}
                                                    />
                                                </td>
                                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                    {sale.price ? `₹${formatInr(sale.price)} / ${sale.unit?.toLowerCase() === "tons" ? "MT" : "Brass"}` : "—"}
                                                </td>
                                                <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: "700", color: "#1e293b" }}>
                                                    {sale.price ? `₹${formatInr(lineTotal)}` : "—"}
                                                </td>
                                                <td>{sale.site || "—"}</td>
                                                <td>
                                                    <VehicleCell
                                                        vehicleNumber={sale.vehicle_number}
                                                        owner={sale.vehicle_owner}
                                                    />
                                                </td>
                                                <td>{formatTime(sale.loading_time)}</td>
                                                <td>{formatTime(sale.unloading_time)}</td>
                                                <td>{sale.remarks || "—"}</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                                                        <button
                                                            className="export-btn"
                                                            style={{ backgroundColor: "#ea580c", color: "white", padding: "4px 8px", fontSize: "0.8rem" }}
                                                            onClick={() => handleOpenReturnModal(sale)}
                                                        >
                                                            ↩ Return
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

                                            {/* Returned Entries Sub-rows in RED */}
                                            {saleReturns.map((ret) => (
                                                <tr key={`ret-comp-${ret.return_id}`} style={{ backgroundColor: "#fff5f5" }}>
                                                    <td colSpan="13" style={{ padding: "6px 16px", borderBottom: "1px dashed #fca5a5" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#b91c1c", fontSize: "0.85rem" }}>
                                                            <span>↩ <strong>Goods Return #{ret.return_id}</strong> ({formatDate(ret.return_date)}):</span>
                                                            <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "#dc2626" }}>
                                                                -{ret.returned_quantity_tons.toFixed(2)} MT
                                                            </span>
                                                            <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: "600" }}>
                                                                (≈ -{tonToBrass(ret.returned_quantity_tons, tonsPerBrass || 4.2).toFixed(2)} Brass)
                                                            </span>
                                                            <span style={{
                                                                backgroundColor: ret.condition_type === "GOOD" ? "#d1fae5" : "#fee2e2",
                                                                color: ret.condition_type === "GOOD" ? "#065f46" : "#991b1b",
                                                                padding: "2px 8px",
                                                                borderRadius: "10px",
                                                                fontSize: "0.75rem",
                                                                fontWeight: "bold"
                                                            }}>
                                                                {ret.condition_type === "GOOD" ? "🟢 Good to Use (Restocked)" : "🔴 Damaged (Wastage)"}
                                                            </span>
                                                            {ret.reason && <span style={{ fontStyle: "italic", color: "#475569" }}>"{ret.reason}"</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
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

                <InputField
                    label="Chalan No."
                    type="text"
                    value={editData.chalan_no || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, chalan_no: e.target.value })
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
                    label="Delivery Site"
                    type="text"
                    value={editData.site || ""}
                    onChange={(e) =>
                        setEditData({ ...editData, site: e.target.value })
                    }
                />

                <InputField
                    label="Price (₹)"
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

            {/* Record Goods Return Modal directly on Sales Page */}
            {showReturnModal && returnSale && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1100
                }}>
                    <div style={{
                        background: "white",
                        padding: "1.75rem",
                        borderRadius: "14px",
                        width: "100%",
                        maxWidth: "520px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                                📦 Record Goods Return (Sale #{returnSale.sales_id})
                            </h2>
                            <button
                                onClick={() => setShowReturnModal(false)}
                                style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#64748b" }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Linked Sale Summary Card */}
                        <div style={{
                            backgroundColor: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            marginBottom: "1.25rem",
                            fontSize: "0.85rem",
                            color: "#0369a1"
                        }}>
                            <div><strong>Party:</strong> {returnSale.party_name}</div>
                            <div><strong>Product:</strong> {returnSale.product_name} | <strong>Vehicle:</strong> {returnSale.vehicle_number}</div>
                            <div>
                                <strong>Original Sale Quantity:</strong> {parseFloat(returnSale.quantity_tons || 0).toFixed(2)} MT <span style={{ color: "#0284c7", fontWeight: "600" }}>(≈ {tonToBrass(returnSale.quantity_tons, tonsPerBrass).toFixed(2)} Brass)</span>
                            </div>
                        </div>

                        {returnFormError && (
                            <div style={{
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                                marginBottom: "1rem"
                            }}>
                                ⚠️ {returnFormError}
                            </div>
                        )}

                        <form onSubmit={handleSaveReturnSubmit}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Return Date: *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={returnDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                            Returned Quantity: *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="e.g. 3.00"
                                            value={returnQty}
                                            onChange={(e) => setReturnQty(e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                            Unit: *
                                        </label>
                                        <select
                                            value={returnUnit}
                                            onChange={(e) => setReturnUnit(e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                                        >
                                            <option value="tons">MT</option>
                                            <option value="brass">Brass</option>
                                        </select>
                                    </div>
                                </div>

                                {returnQty && parseFloat(returnQty) > 0 && (
                                    <div style={{
                                        marginTop: "-6px",
                                        fontSize: "0.85rem",
                                        color: "#0284c7",
                                        backgroundColor: "#f0f9ff",
                                        border: "1px solid #bae6fd",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontWeight: "600"
                                    }}>
                                        💡 Live Conversion: {returnUnit === "tons" ? (
                                            <><strong>{tonToBrass(returnQty, tonsPerBrass).toFixed(2)} Brass</strong> (at {tonsPerBrass} MT/Brass)</>
                                        ) : (
                                            <><strong>{brassToTon(returnQty, tonsPerBrass).toFixed(2)} MT</strong> (at {tonsPerBrass} MT/Brass)</>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Material Condition / Destination: *
                                    </label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 12px",
                                            borderRadius: "8px",
                                            border: returnCondition === "GOOD" ? "2px solid #10b981" : "1px solid #cbd5e1",
                                            backgroundColor: returnCondition === "GOOD" ? "#ecfdf5" : "white",
                                            cursor: "pointer"
                                        }}>
                                            <input
                                                type="radio"
                                                name="returnCond"
                                                value="GOOD"
                                                checked={returnCondition === "GOOD"}
                                                onChange={(e) => setReturnCondition(e.target.value)}
                                            />
                                            <div>
                                                <strong style={{ color: "#065f46", fontSize: "0.9rem" }}>🟢 Good to Use (Restock into Pool)</strong>
                                                <div style={{ fontSize: "0.75rem", color: "#047857" }}>
                                                    Material is in usable condition and will be added back to stock.
                                                </div>
                                            </div>
                                        </label>

                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 12px",
                                            borderRadius: "8px",
                                            border: returnCondition === "DAMAGED" ? "2px solid #ef4444" : "1px solid #cbd5e1",
                                            backgroundColor: returnCondition === "DAMAGED" ? "#fef2f2" : "white",
                                            cursor: "pointer"
                                        }}>
                                            <input
                                                type="radio"
                                                name="returnCond"
                                                value="DAMAGED"
                                                checked={returnCondition === "DAMAGED"}
                                                onChange={(e) => setReturnCondition(e.target.value)}
                                            />
                                            <div>
                                                <strong style={{ color: "#991b1b", fontSize: "0.9rem" }}>🔴 Damaged / Wastage (Discard)</strong>
                                                <div style={{ fontSize: "0.75rem", color: "#b91c1c" }}>
                                                    Material is damaged/unusable. Will NOT be added back to inventory stock.
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Reason / Remarks:
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Enter reason for return or quality notes..."
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                                    />
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "0.5rem" }}>
                                    <Button type="button" variant="secondary" onClick={() => setShowReturnModal(false)} disabled={submittingReturn}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="primary" disabled={submittingReturn}>
                                        {submittingReturn ? "Saving Return..." : "Save Goods Return"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Sales;