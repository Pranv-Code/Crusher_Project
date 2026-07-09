import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";

import {
    getSales,
    addSale,
    updateSale,
    deleteSale,
} from "../services/salesApi";

import { getActiveProducts } from "../services/productApi";
import { getParties } from "../services/partyApi";
import { getVehicles } from "../services/vehicleApi";

const Sales = () => {
    // --- State Declarations ---
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [parties, setParties] = useState([]);
    const [vehicles, setVehicles] = useState([]);
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

    // --- API Fetching Functions ---
    const fetchSales = async () => {
        try {
            const res = await getSales();
            setSales(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await getActiveProducts();
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchParties = async () => {
        try {
            const res = await getParties();
            setParties(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchVehicles = async () => {
        try {
            const res = await getVehicles();
            setVehicles(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // --- Lifecycle Hook ---
    useEffect(() => {
        fetchSales();
        fetchProducts();
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
            fetchSales();
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
            fetchSales();
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete Sale?")) return;
        try {
            await deleteSale(id);
            fetchSales();
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
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <input
                                                className="edit-input"
                                                type="date"
                                                value={editData.sales_date || ""}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        sales_date: e.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            sale.sales_date
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <select
                                                className="edit-select"
                                                value={editData.party_id || ""}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        party_id: e.target.value,
                                                    })
                                                }
                                            >
                                                {parties.map((party) => (
                                                    <option key={party.party_id} value={party.party_id}>
                                                        {party.party_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            sale.party_name
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <select
                                                className="edit-select"
                                                value={editData.product_id || ""}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        product_id: e.target.value,
                                                    })
                                                }
                                            >
                                                {products.map((product) => (
                                                    <option key={product.product_id} value={product.product_id}>
                                                        {product.product_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            sale.product_name
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <select
                                                className="edit-select"
                                                value={editData.vehicle_number || ""}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        vehicle_number: e.target.value,
                                                    })
                                                }
                                            >
                                                {vehicles.map((vehicle) => (
                                                    <option key={vehicle.vehicle_number} value={vehicle.vehicle_number}>
                                                        {vehicle.vehicle_number}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            sale.vehicle_number
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <>
                                                <input
                                                    className="edit-input"
                                                    type="number"
                                                    value={editData.quantity || ""}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            quantity: e.target.value,
                                                        })
                                                    }
                                                />
                                                <select
                                                    className="edit-select"
                                                    value={editData.unit || "tons"}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            unit: e.target.value,
                                                        })
                                                    }
                                                >
                                                    <option value="tons">Tons</option>
                                                    <option value="brass">Brass</option>
                                                </select>
                                            </>
                                        ) : (
                                            `${sale.display_quantity || sale.quantity} ${sale.unit}`
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <input
                                                className="edit-input"
                                                value={editData.site || ""}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        site: e.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            sale.site
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <input
                                                className="edit-input"
                                                type="number"
                                                value={editData.price || ""}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        price: e.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            sale.price
                                        )}
                                    </td>
                                    <td>
                                        {editingId === sale.sales_id ? (
                                            <>
                                                <button className="save-btn" onClick={() => handleSave(sale.sales_id)}>
                                                    Save
                                                </button>
                                                <button className="cancel-btn" onClick={handleCancel}>
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="edit-btn" onClick={() => handleEdit(sale)}>
                                                    Edit
                                                </button>
                                                <button className="delete-btn" onClick={() => handleDelete(sale.sales_id)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
};

export default Sales;