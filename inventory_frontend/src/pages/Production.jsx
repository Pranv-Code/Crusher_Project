import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addProduction,
    updateProduction,
    deleteProduction
} from "../services/productionApi";

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
        fetchProducts
    } = useInventory();

    const [showAddForm, setShowAddForm] = useState(false);

    const [newProduction, setNewProduction] = useState({
        production_date: "",
        product_id: "",
        quantity_tons: "",
        unit: "",
        production_cost: "",
    });
    
    const [editingId, setEditingId] = useState(null);

    const [editData, setEditData] = useState({
        production_date: "",
        product_id: "",
        quantity_tons: "",
        unit: "",
        production_cost: "",
    });

    // Modal Confirmation local state variables
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const handleAddProduction = async () => {
        if (
            !newProduction.product_id ||
            newProduction.quantity_tons === "" ||
            newProduction.production_cost === ""
        ) {
            alert("Please fill all fields.");
            return;
        }
        console.log("Sending to backend:", newProduction);
        try {
            await addProduction(newProduction);
            await fetchProduction(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setNewProduction({
                product_id: "",
                quantity_tons: "",
                unit: "Tons",
                production_cost: "",
            });
            setShowAddForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (production) => {
        setEditingId(production.production_id);
        setEditData({
            production_date: production.production_date,
            product_id: production.product_id,
            quantity_tons: production.quantity_tons,
            unit: production.unit,
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
    }, []);

    // Configuration formatting structures
    const productOptions = activeProducts.map((p) => ({
        value: p.product_id,
        label: p.product_name,
    }));

    const unitOptions = [
        { value: "tons", label: "Tons" },
        { value: "brass", label: "Brass" },
    ];

    const columns = [
        { key: "production_date", label: "Production Date" },
        { key: "product_name", label: "Product Name" },
        { key: "quantity_tons", label: "Quantity" },
        { key: "unit", label: "Units" },
        { key: "production_cost", label: "Production Cost" },
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
                {showAddForm && (
                    <div className="form-card">
                        <div className="form-grid">
                        <InputField
                            label="Production Date"
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
                        <SelectField
                            label="Select Product"
                            name="product_id"
                            value={newProduction.product_id}
                            onChange={(e) =>
                                setNewProduction({
                                    ...newProduction,
                                    product_id: e.target.value,
                                })
                            }
                            options={productOptions}
                        />
                        <InputField
                            label="Quantity"
                            name="quantity_tons"
                            type="number"
                            placeholder="Enter quantity"
                            value={newProduction.quantity_tons}
                            onChange={(e) =>
                                setNewProduction({
                                    ...newProduction,
                                    quantity_tons: e.target.value,
                                })
                            }
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
                            label="Production Cost"
                            name="production_cost"
                            type="number"
                            placeholder="Enter cost"
                            value={newProduction.production_cost}
                            onChange={(e) =>
                                setNewProduction({
                                    ...newProduction,
                                    production_cost: e.target.value,
                                })
                            }
                        />
                        </div>
                        <Button variant="success" onClick={handleAddProduction}>
                            Save Production
                        </Button>
                    </div>
                )}

                {productions.length === 0 ? (
                    <EmptyState
                        title="No Products Found"
                        message="Click Add Production to create a record."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={productions}
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
                    label="Product Name"
                    name="product_id"
                    value={editData.product_id}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            product_id: e.target.value,
                        })
                    }
                    options={productOptions}
                />
                <InputField
                    label="Quantity"
                    type="number"
                    value={editData.quantity_tons}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            quantity_tons: e.target.value,
                        })
                    }
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
                    label="Production Cost"
                    type="number"
                    value={editData.production_cost}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            production_cost: e.target.value,
                        })
                    }
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