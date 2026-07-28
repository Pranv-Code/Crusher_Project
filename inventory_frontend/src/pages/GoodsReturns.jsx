import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useAuth } from "../context/AuthContext";
import { getParties } from "../services/partyApi";
import { getProducts } from "../services/productApi";
import { getSales } from "../services/salesApi";
import { getSettings } from "../services/settingsApi";
import {
    getGoodsReturns,
    getGoodsReturnStats,
    addGoodsReturn,
    deleteGoodsReturn
} from "../services/goodsReturnApi";
import { formatDate, tonToBrass, brassToTon } from "../utils/formatUtils";
import Button from "../components/common/Button";
import Pagination from "../components/common/Pagination";
import "../css/dashboard.css";

const QtyCell = ({ displayQty, displayUnit, convertedQty, convertedUnit }) => (
    <div style={{ lineHeight: "1.3", color: "#dc2626", fontWeight: "700" }}>
        <span>-{Number(displayQty).toFixed(2)} {displayUnit}</span>
        <br />
        <span style={{ fontSize: "0.75em", color: "#ef4444", fontWeight: "600" }}>
            ≈ -{Number(convertedQty).toFixed(2)} {convertedUnit}
        </span>
    </div>
);

export default function GoodsReturns() {
    const { isManager } = useAuth();

    // Data state
    const [loading, setLoading] = useState(true);
    const [returns, setReturns] = useState([]);
    const [stats, setStats] = useState({
        total_count: 0,
        total_returned_tons: 0,
        restocked_tons: 0,
        damaged_tons: 0
    });
    const [parties, setParties] = useState([]);
    const [products, setProducts] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [settings, setSettings] = useState({ inventory_mode: "COMMON_POOL" });

    // Filter state
    const [search, setSearch] = useState("");
    const [filterParty, setFilterParty] = useState("");
    const [filterProduct, setFilterProduct] = useState("");
    const [filterCondition, setFilterCondition] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // Modal Form inputs
    const [selectedSaleId, setSelectedSaleId] = useState("");
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
    const [partyId, setPartyId] = useState("");
    const [productId, setProductId] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("tons");
    const [conditionType, setConditionType] = useState("GOOD");
    const [reason, setReason] = useState("");
    const [selectedSaleInfo, setSelectedSaleInfo] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [returnsRes, statsRes, partiesRes, productsRes, salesRes, settingsRes] = await Promise.all([
                getGoodsReturns({
                    page,
                    limit: 20,
                    search,
                    party_id: filterParty,
                    product_id: filterProduct,
                    condition: filterCondition,
                    start_date: startDate,
                    end_date: endDate
                }),
                getGoodsReturnStats(),
                getParties(),
                getProducts(),
                getSales({ limit: 100 }),
                getSettings()
            ]);

            setReturns(returnsRes.data.goods_returns || []);
            setTotalPages(returnsRes.data.total_pages || 1);
            setStats(statsRes.data || {});
            setParties(partiesRes.data || []);
            setProducts(productsRes.data || []);
            setRecentSales(salesRes.data.sales || (Array.isArray(salesRes.data) ? salesRes.data : []));
            setSettings(settingsRes.data || { inventory_mode: "COMMON_POOL" });
        } catch (err) {
            console.error("Failed to load goods return data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, filterParty, filterProduct, filterCondition, startDate, endDate]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        loadData();
    };

    const handleResetFilters = () => {
        setSearch("");
        setFilterParty("");
        setFilterProduct("");
        setFilterCondition("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const handleSaleSelectChange = (e) => {
        const sId = e.target.value;
        setSelectedSaleId(sId);
        if (!sId) {
            setSelectedSaleInfo(null);
            return;
        }

        const sale = recentSales.find(s => String(s.sales_id) === String(sId));
        if (sale) {
            setSelectedSaleInfo(sale);
            setPartyId(sale.party_id || "");
            setProductId(sale.product_id || "");
            setVehicleNumber(sale.vehicle_number || "");
        }
    };

    const handleOpenModal = () => {
        setFormError("");
        setSelectedSaleId("");
        setSelectedSaleInfo(null);
        setReturnDate(new Date().toISOString().split("T")[0]);
        setPartyId("");
        setProductId("");
        setVehicleNumber("");
        setQuantity("");
        setUnit("tons");
        setConditionType("GOOD");
        setReason("");
        setShowModal(true);
    };

    const handleCreateReturn = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!returnDate) {
            setFormError("Return date is required.");
            return;
        }
        if (!partyId) {
            setFormError("Party selection is required.");
            return;
        }
        if (settings.inventory_mode !== "COMMON_POOL" && conditionType === "GOOD" && !productId) {
            setFormError("Product is required when system is in Product-Wise mode.");
            return;
        }
        if (!quantity || parseFloat(quantity) <= 0) {
            setFormError("Please enter a valid positive returned quantity.");
            return;
        }

        setSubmitting(true);
        try {
            await addGoodsReturn({
                return_date: returnDate,
                sale_id: selectedSaleId ? parseInt(selectedSaleId, 10) : null,
                party_id: parseInt(partyId, 10),
                product_id: productId ? parseInt(productId, 10) : null,
                vehicle_number: vehicleNumber,
                quantity: parseFloat(quantity),
                unit,
                condition_type: conditionType,
                reason
            });

            setShowModal(false);
            loadData();
        } catch (err) {
            setFormError(err.response?.data?.message || "Failed to record goods return.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (returnId) => {
        if (!window.confirm("Are you sure you want to delete this goods return record? If marked as Good to Use, stock addition will be reverted.")) {
            return;
        }

        try {
            await deleteGoodsReturn(returnId);
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete return record.");
        }
    };

    return (
        <Layout>
            <div className="dashboard-container" style={{ gap: "20px" }}>
                {/* Summary Metrics Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-card-title">Total Goods Returned</span>
                        <span className="stat-card-value">{Number(stats.total_returned_tons || 0).toFixed(2)} MT</span>
                        <span className="stat-card-subtitle">≈ {Number(stats.total_returned_brass || 0).toFixed(2)} Brass across {stats.total_count || 0} entries</span>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid #10b981" }}>
                        <span className="stat-card-title" style={{ color: "#000000ff" }}>🟢 Good to Use (Restocked)</span>
                        <span className="stat-card-value" style={{ color: "#000000ff" }}>{Number(stats.restocked_tons || 0).toFixed(2)} MT</span>
                        <span className="stat-card-subtitle">Added back to {settings.inventory_mode === "COMMON_POOL" ? "Quarry Material" : "Product Stock"}</span>
                    </div>

                    <div className="stat-card" style={{ borderLeft: "4px solid #ef4444" }}>
                        <span className="stat-card-title" style={{ color: "#090808ff" }}>🔴 Damaged / Wastage</span>
                        <span className="stat-card-value" style={{ color: "#000000ff" }}>{Number(stats.damaged_tons || 0).toFixed(2)} MT</span>
                        <span className="stat-card-subtitle">Discarded (not added to inventory)</span>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div style={{
                    backgroundColor: "white",
                    padding: "16px 20px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                }}>
                    <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: "220px" }}>
                            <input
                                type="text"
                                placeholder="Search by Party, Vehicle, Sale # or Remarks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "0.9rem",
                                    boxSizing: "border-box"
                                }}
                            />
                        </div>

                        <select
                            value={filterParty}
                            onChange={(e) => setFilterParty(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        >
                            <option value="">All Parties</option>
                            {parties.map(p => (
                                <option key={p.party_id} value={p.party_id}>{p.party_name}</option>
                            ))}
                        </select>

                        <select
                            value={filterProduct}
                            onChange={(e) => setFilterProduct(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        >
                            <option value="">All Products</option>
                            {products.map(pr => (
                                <option key={pr.product_id} value={pr.product_id}>{pr.product_name}</option>
                            ))}
                        </select>

                        <select
                            value={filterCondition}
                            onChange={(e) => setFilterCondition(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        >
                            <option value="">All Conditions</option>
                            <option value="GOOD">🟢 Good to Use (Restocked)</option>
                            <option value="DAMAGED">🔴 Damaged / Wastage</option>
                        </select>

                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Start Date"
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        />

                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="End Date"
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                        />

                        <Button
                            type="submit"
                            className="btn-primary"
                        >
                            Search
                        </Button>

                        <Button
                            type="button"
                            className="btn-danger"
                            onClick={handleResetFilters}
                        >
                            Reset
                        </Button>
                    </form>
                </div>

                {/* Returns Table */}
                <div style={{
                    backgroundColor: "white",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                    overflowX: "auto"
                }}>
                    <table className="db-table">
                        <thead>
                            <tr>
                                <th>Return Date</th>
                                {/* <th>Sale Ref</th> */}
                                <th>Party Name</th>
                                <th>Product</th>
                                <th>Vehicle #</th>
                                <th>Returned Quantity</th>
                                <th>Condition Status</th>
                                <th>Reason / Remarks</th>
                                <th>Recorded By</th>
                                {isManager && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={isManager ? 10 : 9} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                                        Loading goods returns...
                                    </td>
                                </tr>
                            ) : returns.length === 0 ? (
                                <tr>
                                    <td colSpan={isManager ? 10 : 9} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                                        No goods return records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                returns.map((item) => (
                                    <tr key={item.return_id}>
                                        <td>{formatDate(item.return_date)}</td>
                                        {/* <td>
                                            {item.sale_id ? (
                                                <span style={{ fontWeight: "600", color: "#2563eb" }}>
                                                    Sale #{item.sale_id}
                                                    {item.original_quantity_tons && (
                                                        <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", fontWeight: "normal" }}>
                                                            Orig: {item.original_quantity_tons.toFixed(2)} MT
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span style={{ color: "#94a3b8" }}>— (Direct)</span>
                                            )}
                                        </td> */}
                                        <td><strong>{item.party_name}</strong></td>
                                        <td>{item.product_name}</td>
                                        <td>{item.vehicle_number || "—"}</td>
                                        <td>
                                            <QtyCell
                                                displayQty={item.display_quantity}
                                                displayUnit={item.unit}
                                                convertedQty={item.converted_quantity}
                                                convertedUnit={item.converted_unit}
                                            />
                                        </td>
                                        <td>
                                            {item.condition_type === "GOOD" ? (
                                                <span style={{
                                                    backgroundColor: "#d1fae5",
                                                    color: "#065f46",
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "0.8rem",
                                                    fontWeight: "700"
                                                }}>
                                                    🟢 Good (Restocked)
                                                </span>
                                            ) : (
                                                <span style={{
                                                    backgroundColor: "#fee2e2",
                                                    color: "#991b1b",
                                                    padding: "4px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "0.8rem",
                                                    fontWeight: "700"
                                                }}>
                                                    🔴 Damaged (Wastage)
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: "200px" }}>{item.reason || "—"}</td>
                                        <td>{item.created_by_name || "System"}</td>
                                        {isManager && (
                                            <td>
                                                <button
                                                    onClick={() => handleDelete(item.return_id)}
                                                    style={{
                                                        backgroundColor: "#fee2e2",
                                                        color: "#b91c1c",
                                                        border: "1px solid #fca5a5",
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        fontSize: "0.8rem",
                                                        fontWeight: "600"
                                                    }}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {totalPages > 1 && (
                        <div style={{ padding: "16px" }}>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>

                {/* Record Goods Return Modal */}
                {showModal && (
                    <div style={{
                        position: "fixed",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000
                    }}>
                        <div style={{
                            background: "white",
                            padding: "2rem",
                            borderRadius: "14px",
                            width: "100%",
                            maxWidth: "520px",
                            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
                            maxHeight: "90vh",
                            overflowY: "auto"
                        }}>
                            <h3 style={{ margin: "0 0 1rem 0", color: "#0f172a", fontSize: "1.25rem" }}>
                                📦 Record Goods Return
                            </h3>

                            {formError && (
                                <div style={{
                                    backgroundColor: "#fee2e2",
                                    border: "1px solid #fca5a5",
                                    color: "#b91c1c",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    marginBottom: "1rem",
                                    fontSize: "0.875rem"
                                }}>
                                    ⚠️ {formError}
                                </div>
                            )}

                            <form onSubmit={handleCreateReturn} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {/* Optional Sale Linking */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Link to Recent Sale (Optional):
                                    </label>
                                    <select
                                        value={selectedSaleId}
                                        onChange={handleSaleSelectChange}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    >
                                        <option value="">-- Direct Return (No Sale Link) --</option>
                                        {recentSales.map(s => (
                                            <option key={s.sales_id} value={s.sales_id}>
                                                Sale #{s.sales_id}{s.chalan_no ? ` [Chalan: ${s.chalan_no}]` : ""} | {formatDate(s.sales_date)} | {s.party_name} | {s.quantity_tons} MT (≈ {tonToBrass(s.quantity_tons, settings.tons_per_brass || 4.2).toFixed(2)} Brass) ({s.vehicle_number})
                                            </option>
                                        ))}
                                    </select>
                                    {selectedSaleInfo && (
                                        <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#0284c7", backgroundColor: "#e0f2fe", padding: "6px 10px", borderRadius: "6px" }}>
                                            ℹ️ Original Sale: <strong>{selectedSaleInfo.quantity_tons} MT</strong> <span style={{ fontWeight: "600" }}>(≈ {tonToBrass(selectedSaleInfo.quantity_tons, settings.tons_per_brass || 4.2).toFixed(2)} Brass)</span> of {selectedSaleInfo.product_name} sold to <strong>{selectedSaleInfo.party_name}</strong>.
                                        </div>
                                    )}
                                </div>

                                {/* Return Date */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Return Date: *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={returnDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    />
                                </div>

                                {/* Party Select */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Party Name: *
                                    </label>
                                    <select
                                        required
                                        value={partyId}
                                        onChange={(e) => setPartyId(e.target.value)}
                                        disabled={!!selectedSaleId}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    >
                                        <option value="">-- Select Party --</option>
                                        {parties.map(p => (
                                            <option key={p.party_id} value={p.party_id}>{p.party_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Product Select */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Product: {settings.inventory_mode !== "COMMON_POOL" && conditionType === "GOOD" ? "*" : "(Optional in Quarry Material Mode)"}
                                    </label>
                                    <select
                                        value={productId}
                                        onChange={(e) => setProductId(e.target.value)}
                                        disabled={!!selectedSaleId}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    >
                                        <option value="">-- Select Product / Quarry Material --</option>
                                        {products.map(pr => (
                                            <option key={pr.product_id} value={pr.product_id}>{pr.product_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Vehicle Number */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Vehicle Number:
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. MH12 AB 1234"
                                        value={vehicleNumber}
                                        onChange={(e) => setVehicleNumber(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    />
                                </div>

                                {/* Quantity & Unit */}
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                            Returned Quantity: *
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            placeholder="Enter quantity"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                            Unit:
                                        </label>
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                        >
                                            <option value="tons">Tons (MT)</option>
                                            <option value="brass">Brass</option>
                                        </select>
                                    </div>
                                </div>

                                {quantity && parseFloat(quantity) > 0 && (
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
                                        💡 Live Conversion: {unit === "tons" ? (
                                            <><strong>{tonToBrass(quantity, settings.tons_per_brass || 4.2).toFixed(2)} Brass</strong> (at {settings.tons_per_brass || 4.2} MT/Brass)</>
                                        ) : (
                                            <><strong>{brassToTon(quantity, settings.tons_per_brass || 4.2).toFixed(2)} MT</strong> (at {settings.tons_per_brass || 4.2} MT/Brass)</>
                                        )}
                                    </div>
                                )}

                                {/* Condition radio / selection */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Condition & Stock Action: *
                                    </label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "10px 12px",
                                            borderRadius: "8px",
                                            border: conditionType === "GOOD" ? "2px solid #10b981" : "1px solid #cbd5e1",
                                            backgroundColor: conditionType === "GOOD" ? "#ecfdf5" : "white",
                                            cursor: "pointer"
                                        }}>
                                            <input
                                                type="radio"
                                                name="conditionType"
                                                value="GOOD"
                                                checked={conditionType === "GOOD"}
                                                onChange={(e) => setConditionType(e.target.value)}
                                            />
                                            <div>
                                                <strong style={{ color: "#065f46" }}>🟢 Good to Use (Restock)</strong>
                                                <div style={{ fontSize: "0.75rem", color: "#047857" }}>
                                                    Returned material will be added back to {settings.inventory_mode === "COMMON_POOL" ? "Quarry Material stock" : "product stock"}.
                                                </div>
                                            </div>
                                        </label>

                                        <label style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "10px 12px",
                                            borderRadius: "8px",
                                            border: conditionType === "DAMAGED" ? "2px solid #ef4444" : "1px solid #cbd5e1",
                                            backgroundColor: conditionType === "DAMAGED" ? "#fef2f2" : "white",
                                            cursor: "pointer"
                                        }}>
                                            <input
                                                type="radio"
                                                name="conditionType"
                                                value="DAMAGED"
                                                checked={conditionType === "DAMAGED"}
                                                onChange={(e) => setConditionType(e.target.value)}
                                            />
                                            <div>
                                                <strong style={{ color: "#991b1b" }}>🔴 Damaged / Wastage (Discard)</strong>
                                                <div style={{ fontSize: "0.75rem", color: "#b91c1c" }}>
                                                    Material is damaged/unusable. Will NOT be added to inventory stock.
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Reason / Remarks */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                                        Reason / Remarks:
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Reason for return or quality notes..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                    />
                                </div>

                                {/* Modal Actions */}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "1rem" }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: "#f1f5f9",
                                            color: "#475569",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            padding: "8px 20px",
                                            backgroundColor: "#2563eb",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontWeight: 600,
                                            cursor: submitting ? "not-allowed" : "pointer"
                                        }}
                                    >
                                        {submitting ? "Submitting..." : "Save Goods Return"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
