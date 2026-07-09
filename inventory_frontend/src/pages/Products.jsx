import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addProduct,
    updateProduct,
    deleteProduct,
} from "../services/productApi";

// Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

import CrudTable from "../components/table/CrudTable";
import ActionButtons from "../components/table/ActionButtons";

import ConfirmModal from "../components/modal/ConfirmModal";
import EditModal from "../components/modal/EditModal";

function Products() {
    const { products, fetchProducts, fetchActiveProducts } = useInventory();
    const [showAddForm, setShowAddForm] = useState(false);

    const [newProduct, setNewProduct] = useState({
        product_name: "",
        quantity_tons: "",
        unit: "Tons",
    });

    const [editingId, setEditingId] = useState(null);

    const [editData, setEditData] = useState({
        product_name: "",
        status: "",
    });

    // Confirmation modal states to replace window.confirm
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    // ---------------- Add Product ----------------

    const handleAddProduct = async () => {
        if (
            newProduct.product_name.trim() === "" ||
            newProduct.quantity_tons === ""
        ) {
            alert("Please fill all fields.");
            return;
        }

        try {
            await addProduct(newProduct);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setNewProduct({
                product_name: "",
                quantity_tons: "",
                unit: "Tons",
            });
            setShowAddForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    // ---------------- Edit ----------------

    const handleEdit = (product) => {
        setEditingId(product.product_id);
        setEditData({
            product_name: product.product_name,
            status: product.status,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({
            product_name: "",
            status: "",
        });
    };

    const handleSave = async () => {
        try {
            await updateProduct(editingId, editData);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    // ---------------- Delete ----------------

    const handleDeleteClick = (id) => {
        setDeleteTargetId(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        setShowConfirm(false);
        try {
            await deleteProduct(deleteTargetId);
            await fetchProducts(true);
            await fetchActiveProducts(true);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteTargetId(null);
        }
    };

    // Configuration schemas for structural mapping
    const unitOptions = [
        { value: "Tons", label: "Tons" },
        { value: "Brass", label: "Brass" },
    ];

    const statusOptions = [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
    ];

    const columns = [
        { key: "product_id", label: "ID" },
        { key: "product_name", label: "Product Name" },
        { key: "quantity_tons", label: "Quantity" },
        { key: "status", label: "Status" },
    ];

    return (
        <Layout>
            <PageHeader
                title="Products"
                subtitle="Manage Products"
                actions={
                    <Button
                        variant={showAddForm ? "secondary" : "primary"}
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "Cancel" : "+ Add Product"}
                    </Button>
                }
            />

            {showAddForm && (
                <div className="add-form">
                    <InputField
                        type="text"
                        placeholder="Product Name"
                        value={newProduct.product_name}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                product_name: e.target.value,
                            })
                        }
                    />

                    <InputField
                        type="number"
                        placeholder="Quantity"
                        value={newProduct.quantity_tons}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                quantity_tons: e.target.value,
                            })
                        }
                    />

                    <SelectField
                        label="Unit"
                        name="unit"
                        value={newProduct.unit}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                unit: e.target.value,
                            })
                        }
                        options={unitOptions}
                    />

                    <Button variant="success" onClick={handleAddProduct}>
                        Save Product
                    </Button>
                </div>
            )}

            <div className="table-container">
                {products.length === 0 ? (
                    <EmptyState
                        title="No Products Found"
                        message="Click Add Product to create one."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={products}
                        keyField="product_id"
                        renderActions={(row) => (
                            <ActionButtons
                                onEdit={() => handleEdit(row)}
                                onDelete={() => handleDeleteClick(row.product_id)}
                            />
                        )}
                    />
                )}
            </div>

            {/* Edit Modal (Replaces old primitive table row layout inline inputs) */}
            <EditModal
                isOpen={editingId !== null}
                title="Edit Product"
                onSave={handleSave}
                onClose={handleCancel}
            >
                <InputField
                    label="Product Name"
                    name="product_name"
                    type="text"
                    value={editData.product_name}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            product_name: e.target.value,
                        })
                    }
                />

                <SelectField
                    label="Status"
                    name="status"
                    value={editData.status}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            status: e.target.value,
                        })
                    }
                    options={statusOptions}
                />
            </EditModal>

            {/* Confirm Modal (Replaces old window.confirm popup dialog) */}
            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Product"
                message="Delete this product?"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteTargetId(null);
                }}
            />
        </Layout>
    );
}

export default Products;