import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addProduction,
    updateProduction,
    deleteProduction
} from "../services/productionApi";
import { getSettings } from "../services/settingsApi";
import { formatDate, formatInr, tonToBrass } from "../utils/formatUtils";

// Reusable Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

import CrudTable from "../components/table/CrudTable";
import ActionButtons from "../components/table/ActionButtons";

import ConfirmModal from "../components/modal/ConfirmModal";
import EditModal from "../components/modal/EditModal";

function Production() {
    const {
        production: productions,
        fetchProduction,
        activeProducts,
        fetchActiveProducts,
        fetchProducts,
        crushers,
        fetchCrushers
    } = useInventory();

    const [showAddForm, setShowAddForm] = useState(false);
    const [crusherFilter, setCrusherFilter] = useState("");

    const [newProduction, setNewProduction] = useState({
        production_date: "",
        product_id: "",
        crusher_name: "",
        quantity_tons: "",
        unit: "tons",
        cost_per_unit: "",
        production_cost: "",
    });
    
    const [editingId, setEditingId] = useState(null);

    const [editData, setEditData] = useState({
        production_date: "",
        product_id: "",
        crusher_name: "",
        quantity_tons: "",
        unit: "",
        cost_per_unit: "",
        production_cost: "",
    });

    // Modal Confirmation local state variables
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const [settings, setSettings] = useState({ inventory_mode: "PRODUCT_WISE" });

    const handleAddProduction = async () => {
        if (
            newProduction.quantity_tons === "" ||
            newProduction.production_cost === "" ||
            !newProduction.unit
        ) {
            alert("Please fill all required fields (Quantity, Cost, and Unit).");
            return;
        }

        if (!newProduction.production_date) {
            alert("Please select a Production Date.");
            return;
        }

        if (parseFloat(newProduction.quantity_tons) <= 0 || parseFloat(newProduction.production_cost) <= 0) {
            alert("Quantity and Production Cost must be greater than zero.");
            return;
        }

        try {
            await addProduction(newProduction);
            await fetchProduction(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setNewProduction({
                product_id: "",
                quantity_tons: "",
                unit: "",
                cost_per_unit: "",
                production_cost: "",
            });
            setShowAddForm(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || err.response?.data?.error || "Failed to add production record.");
        }
    };

    const handleEdit = (production) => {
        setEditingId(production.production_id);
        const isBrass = production.unit?.toLowerCase() === "brass";
        const enteredQty = production.display_quantity ?? production.entered_quantity ?? (isBrass ? tonToBrass(production.quantity_tons, settings.tons_per_brass || 4.2) : production.quantity_tons);
        const qty = parseFloat(enteredQty) || 0;
        const tot = parseFloat(production.production_cost) || 0;
        const cpu = production.cost_per_unit || (qty > 0 && tot > 0 ? (tot / qty).toFixed(2) : "");
        setEditData({
            production_date: production.production_date,
            product_id: production.product_id,
            crusher_name: production.crusher_name || "",
            quantity_tons: enteredQty,
            unit: production.unit,
            cost_per_unit: cpu,
            production_cost: production.production_cost,
        });
    };

    const handleSave = async () => {
        try {
            const res = await updateProduction(editingId, editData);
            alert(res.data?.message || "Production Updated Successfully");
            await fetchProduction(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setEditingId(null);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || err.response?.data?.message || "Failed to update production record.");
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteTargetId(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        setShowConfirm(false);
        try {
            const res = await deleteProduction(deleteTargetId);
            alert(res.data?.message || "Production Deleted Successfully");
            await fetchProduction(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || err.response?.data?.message || "Failed to delete production record.");
        } finally {
            setDeleteTargetId(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    useEffect(() => {
        fetchProduction();
        fetchActiveProducts();
        fetchCrushers();
        getSettings()
            .then((res) => setSettings(res.data))
            .catch((err) => console.error("Failed to load settings in Production page:", err));
    }, []);

    // Configuration formatting structures
    const crusherOptions = crushers
        .filter(c => c.status === "Active")
        .map((c) => ({
            value: c.crusher_name,
            label: c.crusher_name,
        }));

    const unitOptions = [
        { value: "tons", label: "MT" },
        { value: "brass", label: "Brass" },
    ];

    const columns = [
        { key: "production_date", label: "Production Date", render: (row) => formatDate(row.production_date) },
        { key: "product_name", label: "Product Name", render: (row) => (row.product_name === "Common Pool" || !row.product_name) ? "Quarry Material" : row.product_name },
        { key: "crusher_name", label: "Crusher Name", render: (row) => row.crusher_name || "—" },
        { 
            key: "display_quantity", 
            label: "Quantity", 
            render: (row) => {
                const isBrass = row.unit?.toLowerCase() === "brass";
                const displayQty = row.display_quantity ?? row.entered_quantity ?? (isBrass ? tonToBrass(row.quantity_tons, settings.tons_per_brass || 4.2) : row.quantity_tons);
                return Number(displayQty || 0).toFixed(2);
            } 
        },
        { 
            key: "unit",
            label: "Units",
            render: (row) => row.unit?.toLowerCase() === "tons" ? "MT" : "Brass"
        },
        { key: "cost_per_unit", label: "Cost / Unit (₹)", render: (row) => row.cost_per_unit ? `₹${formatInr(row.cost_per_unit)}` : (row.production_cost && row.quantity_tons ? `₹${formatInr((parseFloat(row.production_cost)/parseFloat(row.quantity_tons)).toFixed(2))}` : "—") },
        { key: "production_cost", label: "Total Cost (₹)", render: (row) => row.production_cost ? `₹${formatInr(row.production_cost)}` : "—" },
    ];

    return (
        <Layout>
            <PageHeader
                title="Production"
                subtitle="Manage Production Records"
                actions={
                    <Button
                        variant="primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "Cancel" : "+ Add Production"}
                    </Button>
                }
            />

            <div className="table-container">
                {/* Filter Toolbar */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.9rem", color: "#475569" }}>Filter by Crusher:</label>
                    <select
                        value={crusherFilter}
                        onChange={(e) => setCrusherFilter(e.target.value)}
                        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    >
                        <option value="">All Crushers</option>
                        {crushers.map(c => (
                            <option key={c.crusher_id} value={c.crusher_name}>{c.crusher_name}</option>
                        ))}
                    </select>
                </div>

                {showAddForm && (
                    <div className="form-card">
                        <div className="form-grid">
                        <InputField
                            label="Production Date *"
                            name="production_date"
                            type="date"
                            value={newProduction.production_date}
                            onChange={(e) =>
                                setNewProduction({
                                    ...newProduction,
                                    production_date: e.target.value,
                                })
                            }
                        />
                        <div className="form-group">
                            <label>Product Name</label>
                            <input
                                type="text"
                                value="Quarry Material"
                                disabled
                                style={{ backgroundColor: "#f1f5f9", cursor: "not-allowed" }}
                            />
                        </div>
                        <SelectField
                            label="Crusher Name"
                            name="crusher_name"
                            value={newProduction.crusher_name}
                            onChange={(e) =>
                                setNewProduction({
                                    ...newProduction,
                                    crusher_name: e.target.value,
                                })
                            }
                            options={[{ value: "", label: "-- Select Crusher --" }, ...crusherOptions]}
                        />
                        <InputField
                            label="Quantity"
                            name="quantity_tons"
                            type="number"
                            placeholder="Enter quantity"
                            value={newProduction.quantity_tons}
                            onChange={(e) => {
                                const qtyVal = e.target.value;
                                const cpu = parseFloat(newProduction.cost_per_unit) || 0;
                                const qty = parseFloat(qtyVal) || 0;
                                const tot = (qty > 0 && cpu > 0) ? (qty * cpu).toFixed(2) : newProduction.production_cost;
                                setNewProduction({
                                    ...newProduction,
                                    quantity_tons: qtyVal,
                                    production_cost: tot
                                });
                            }}
                        />
                        <SelectField
                            label="Unit"
                            name="unit"
                            value={newProduction.unit}
                            onChange={(e) =>
                                setNewProduction({
                                    ...newProduction,
                                    unit: e.target.value,
                                })
                            }
                            options={unitOptions}
                        />
                        <InputField
                            label="Cost per Unit (₹)"
                            name="cost_per_unit"
                            type="number"
                            placeholder="Enter cost per unit"
                            value={newProduction.cost_per_unit}
                            onChange={(e) => {
                                const cpuVal = e.target.value;
                                const cpu = parseFloat(cpuVal) || 0;
                                const qty = parseFloat(newProduction.quantity_tons) || 0;
                                const tot = (qty > 0 && cpu > 0) ? (qty * cpu).toFixed(2) : newProduction.production_cost;
                                setNewProduction({
                                    ...newProduction,
                                    cost_per_unit: cpuVal,
                                    production_cost: tot
                                });
                            }}
                        />
                        <InputField
                            label="Total Cost (₹)"
                            name="production_cost"
                            type="number"
                            placeholder="Calculated automatically"
                            value={newProduction.production_cost}
                            onChange={(e) => {
                                const totVal = e.target.value;
                                const tot = parseFloat(totVal) || 0;
                                const qty = parseFloat(newProduction.quantity_tons) || 0;
                                const cpu = (qty > 0 && tot > 0) ? (tot / qty).toFixed(2) : newProduction.cost_per_unit;
                                setNewProduction({
                                    ...newProduction,
                                    production_cost: totVal,
                                    cost_per_unit: cpu
                                });
                            }}
                        />
                        </div>
                        <Button variant="success" onClick={handleAddProduction}>
                            Save Production
                        </Button>
                    </div>
                )}

                {productions.filter(p => !crusherFilter || p.crusher_name === crusherFilter).length === 0 ? (
                    <EmptyState
                        title="No Production Records Found"
                        message="No production records match the selected crusher filter."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={productions.filter(p => !crusherFilter || p.crusher_name === crusherFilter)}
                        keyField="production_id"
                        renderActions={(row) => (
                            <ActionButtons
                                onEdit={() => handleEdit(row)}
                                onDelete={() => handleDeleteClick(row.production_id)}
                            />
                        )}
                    />
                )}
            </div>

            {/* Edit Modal architecture replacing inline layout table fields */}
            <EditModal
                isOpen={editingId !== null}
                title="Edit Production"
                onSave={handleSave}
                onClose={handleCancel}
            >
                <InputField
                    label="Production Date"
                    type="date"
                    value={editData.production_date}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            production_date: e.target.value,
                        })
                    }
                />
                <SelectField
                    label="Crusher Name"
                    name="crusher_name"
                    value={editData.crusher_name}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            crusher_name: e.target.value,
                        })
                    }
                    options={[{ value: "", label: "-- Select Crusher --" }, ...crusherOptions]}
                />
                <SelectField
                    label="Units"
                    name="unit"
                    value={editData.unit}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            unit: e.target.value,
                        })
                    }
                    options={unitOptions}
                />
                <InputField
                    label="Quantity"
                    type="number"
                    value={editData.quantity_tons}
                    onChange={(e) => {
                        const qtyVal = e.target.value;
                        const cpu = parseFloat(editData.cost_per_unit) || 0;
                        const qty = parseFloat(qtyVal) || 0;
                        const tot = (qty > 0 && cpu > 0) ? (qty * cpu).toFixed(2) : editData.production_cost;
                        setEditData({ ...editData, quantity_tons: qtyVal, production_cost: tot });
                    }}
                />
                <InputField
                    label="Cost per Unit (₹)"
                    type="number"
                    value={editData.cost_per_unit}
                    onChange={(e) => {
                        const cpuVal = e.target.value;
                        const cpu = parseFloat(cpuVal) || 0;
                        const qty = parseFloat(editData.quantity_tons) || 0;
                        const tot = (qty > 0 && cpu > 0) ? (qty * cpu).toFixed(2) : editData.production_cost;
                        setEditData({ ...editData, cost_per_unit: cpuVal, production_cost: tot });
                    }}
                />
                <InputField
                    label="Total Production Cost (₹)"
                    type="number"
                    value={editData.production_cost}
                    onChange={(e) => {
                        const totVal = e.target.value;
                        const tot = parseFloat(totVal) || 0;
                        const qty = parseFloat(editData.quantity_tons) || 0;
                        const cpu = (qty > 0 && tot > 0) ? (tot / qty).toFixed(2) : editData.cost_per_unit;
                        setEditData({ ...editData, production_cost: totVal, cost_per_unit: cpu });
                    }}
                />
            </EditModal>

            {/* Confirm Modal replacing window.confirm */}
            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Production"
                message="Delete this production record?"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteTargetId(null);
                }}
            />
        </Layout>
    );
}

export default Production;