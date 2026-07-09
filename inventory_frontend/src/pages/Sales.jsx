import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addSale,
    updateSale,
    deleteSale,
} from "../services/salesApi";

// Reusable Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import EditModal from "../components/modal/EditModal";

const Sales = () => {
    // --- Context Hook ---
    const {
        sales,
        fetchSales,
        activeProducts,
        fetchActiveProducts,
        parties,
        fetchParties,
        vehicles,
        fetchVehicles,
        fetchProducts
    } = useInventory();

    const products = activeProducts;

    // --- State Declarations ---
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [newSale, setNewSale] = useState({
        sales_date: "",
        party_id: "",
        product_id: "",
        vehicle_number: "",
        quantity: "",
        unit: "tons",
        site: "",
        price: "",
    });

    const [editData, setEditData] = useState({});

    // --- Lifecycle Hook ---
    useEffect(() => {
        fetchSales();
        fetchActiveProducts();
        fetchParties();
        fetchVehicles();
    }, []);

    // --- Client Side Filtering ---
    const filteredSales = sales.filter((sale) =>
        sale.party_name?.toLowerCase().includes(search.toLowerCase())
    );

    // --- Action Handlers ---
    const handleAddSale = async () => {
        try {
            await addSale(newSale);
            await fetchSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setShowAddForm(false);
            setNewSale({
                sales_date: "",
                party_id: "",
                product_id: "",
                vehicle_number: "",
                quantity: "",
                unit: "tons",
                site: "",
                price: "",
            });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add sale.");
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
        });
    };

    const handleSave = async (id) => {
        try {
            await updateSale(id, editData);
            await fetchSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete Sale?")) return;
        try {
            await deleteSale(id);
            await fetchSales(true);
            await fetchProducts(true);
            await fetchActiveProducts(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
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
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Sale Date</label>
                            <input
                                type="date"
                                value={newSale.sales_date}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        sales_date: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Party</label>
                            <select
                                value={newSale.party_id}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        party_id: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select Party</option>
                                {parties.map((party) => (
                                    <option key={party.party_id} value={party.party_id}>
                                        {party.party_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Product</label>
                            <select
                                value={newSale.product_id}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        product_id: e.target.value,
                                    })
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

                        <div className="form-group">
                            <label>Vehicle</label>
                            <select
                                value={newSale.vehicle_number}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        vehicle_number: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select Vehicle</option>
                                {vehicles.map((vehicle) => (
                                    <option key={vehicle.vehicle_number} value={vehicle.vehicle_number}>
                                        {vehicle.vehicle_number}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Quantity</label>
                            <input
                                type="number"
                                value={newSale.quantity}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        quantity: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Unit</label>
                            <select
                                value={newSale.unit}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        unit: e.target.value,
                                    })
                                }
                            >
                                <option value="tons">Tons</option>
                                <option value="brass">Brass</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Site</label>
                            <input
                                type="text"
                                value={newSale.site}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        site: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Price</label>
                            <input
                                type="number"
                                value={newSale.price}
                                onChange={(e) =>
                                    setNewSale({
                                        ...newSale,
                                        price: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <button className="primary-btn" onClick={handleAddSale}>
                        Save Sale
                    </button>
                </div>
            )}

            <div className="table-container">
                <input
                    className="search-box"
                    placeholder="Search Party..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

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
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: "center" }}>
                                    No Sales Found
                                </td>
                            </tr>
                        ) : (
                            filteredSales.map((sale) => (
                                <tr key={sale.sales_id}>
                                    <td>{sale.sales_date}</td>
                                    <td>{sale.party_name}</td>
                                    <td>{sale.product_name}</td>
                                    <td>{sale.vehicle_number}</td>
                                    <td>
                                        {`${sale.display_quantity || sale.quantity} ${sale.unit}`}
                                    </td>
                                    <td>{sale.site}</td>
                                    <td>{sale.price}</td>
                                    <td>
                                        <>
                                            <button className="edit-btn" onClick={() => handleEdit(sale)}>
                                                Edit
                                            </button>
                                            <button className="delete-btn" onClick={() => handleDelete(sale.sales_id)}>
                                                Delete
                                            </button>
                                        </>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit modal (replaces inline row editing) */}
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
                        setEditData({
                            ...editData,
                            sales_date: e.target.value,
                        })
                    }
                />

                <SelectField
                    label="Party"
                    name="party_id"
                    value={editData.party_id || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            party_id: e.target.value,
                        })
                    }
                    options={parties.map((p) => ({
                        value: p.party_id,
                        label: p.party_name,
                    }))}
                />

                <SelectField
                    label="Product"
                    name="product_id"
                    value={editData.product_id || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            product_id: e.target.value,
                        })
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
                        setEditData({
                            ...editData,
                            vehicle_number: e.target.value,
                        })
                    }
                    options={vehicles.map((v) => ({
                        value: v.vehicle_number,
                        label: v.vehicle_number,
                    }))}
                />

                <InputField
                    label="Quantity"
                    type="number"
                    value={editData.quantity || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            quantity: e.target.value,
                        })
                    }
                />

                <SelectField
                    label="Unit"
                    name="unit"
                    value={editData.unit || "tons"}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            unit: e.target.value,
                        })
                    }
                    options={[
                        { value: "tons", label: "Tons" },
                        { value: "brass", label: "Brass" },
                    ]}
                />

                <InputField
                    label="Site"
                    type="text"
                    value={editData.site || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            site: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Price"
                    type="number"
                    value={editData.price || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            price: e.target.value,
                        })
                    }
                />
            </EditModal>
        </Layout>
    );
};


export default Sales;