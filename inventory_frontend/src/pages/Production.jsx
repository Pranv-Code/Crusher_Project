import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import {
    getProduction,
    addProduction,
    updateProduction,
    deleteProduction
} from "../services/productionApi";

import {
    getActiveProducts,
} from "../services/productApi";


function Production() {
    const [productions, setProductions] = useState([]);
    const [products, setProducts] = useState([]);

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

    const fetchProduction = async () => {
        try {
            const res = await getProduction();
            setProductions(res.data);
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

            fetchProduction();

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
    const handleSave = async (id) => {

        try {

            await updateProduction(id, editData);

            fetchProduction();

            setEditingId(null);

        } catch (err) {

            console.error(err);

        }

    };
    const handleDelete = async (id) => {

        if (!window.confirm("Delete this production record?"))
            return;

        try {

            await deleteProduction(id);

            fetchProduction();

        } catch (err) {

            console.error(err);

        }

    };
    const handleCancel = () => {

        setEditingId(null);

    };
    useEffect(() => {
        fetchProduction();
        fetchProducts();
    }, []);

    return (
        <Layout>
            <div className="page-header">
                <h1>Production</h1>

                <button
                    className="primary-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? "Cancel" : "+ Add Production"}
                </button>
            </div>

            <div className="table-container">
                {
                    showAddForm && (

                        <div className="add-form">
                            <input className="edit-input"
                                type="date"
                                value={newProduction.production_date}
                                onChange={(e) =>
                                    setNewProduction({
                                        ...newProduction,
                                        production_date: e.target.value,
                                    })
                                }
                            />
                            <select className="edit-select"
                                value={newProduction.product_id}
                                onChange={(e) =>
                                    setNewProduction({
                                        ...newProduction,
                                        product_id: e.target.value
                                    })
                                }
                            >

                                <option value="">
                                    Select Product
                                </option>

                                {products.map(product => (

                                    <option
                                        key={product.product_id}
                                        value={product.product_id}
                                    >
                                        {product.product_name}
                                    </option>

                                ))}

                            </select>

                            <input className="edit-input"
                                type="number"
                                placeholder="Quantity"
                                value={newProduction.quantity_tons}
                                onChange={(e) =>
                                    setNewProduction({
                                        ...newProduction,
                                        quantity_tons: e.target.value
                                    })
                                }
                            />

                            <select className="edit-select"
                                value={newProduction.unit}
                                onChange={(e) =>
                                    setNewProduction({
                                        ...newProduction,
                                        unit: e.target.value
                                    })
                                }
                            >

                                <option value="tons">
                                    Tons
                                </option>

                                <option value="brass">
                                    Brass
                                </option>

                            </select>

                            <input className="edit-input"
                                type="number"
                                placeholder="Production Cost"
                                value={newProduction.production_cost}
                                onChange={(e) =>
                                    setNewProduction({
                                        ...newProduction,
                                        production_cost: e.target.value
                                    })
                                }
                            />

                            <button
                                className="save-btn"
                                onClick={handleAddProduction}
                            >
                                Save Production
                            </button>

                        </div>

                    )
                }
                <table>

                    <thead>
                        <tr>
                            {/* <th>Production ID</th> */}
                            <th>Production Date</th>
                            <th>Product Name</th>
                            <th>Quantity</th>
                            <th>Units</th>
                            <th>Production Cost</th>
                            <th>Action</th>

                        </tr>
                    </thead>

                    <tbody>

                        {productions.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center" }}>
                                    No Products Found
                                </td>
                            </tr>
                        ) : (
                            productions.map((production) => (
                                <tr key={production.production_id}>
                                    {/* <td>{product.production_id}</td> */}
                                    <td>
                                        {editingId === production.production_id ? (
                                            <input className="edit-input"
                                                type="date"
                                                value={editData.production_date}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        production_date: e.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            production.production_date
                                        )}
                                    </td>
                                    <td>
                                        {editingId === production.production_id ? (
                                            <select
                                                value={editData.product_id}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        product_id: e.target.value,
                                                    })
                                                }
                                            >
                                                {products.map((product) => (
                                                    <option
                                                        key={product.product_id}
                                                        value={product.product_id}
                                                    >
                                                        {product.product_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            production.product_name
                                        )}
                                    </td>
                                    <td>
                                        {editingId === production.production_id ? (
                                            <input className="edit-input"
                                                type="number"
                                                value={editData.quantity_tons}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        quantity_tons: e.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            production.quantity_tons
                                        )}
                                    </td>
                                    <td>
                                        {editingId === production.production_id ? (
                                            <select
                                                value={editData.unit}
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
                                        ) : (
                                            production.unit
                                        )}
                                    </td>
                                    <td>
                                        {editingId === production.production_id ? (
                                            <input className="edit-input"
                                                type="number"
                                                value={editData.production_cost}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        production_cost: e.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            production.production_cost
                                        )}
                                    </td>
                                    <td>
                                        {editingId === production.production_id ? (
                                            <>
                                                <button
                                                className="save-btn"
                                                    onClick={() =>
                                                        handleSave(production.production_id)
                                                    }
                                                >
                                                    Save
                                                </button>

                                                <button
                                                className="cancel-btn"
                                                    onClick={handleCancel}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="edit-btn"
                                                    onClick={() =>
                                                        handleEdit(production)
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button className="delete-btn"
                                                    onClick={() =>
                                                        handleDelete(production.production_id)
                                                    }
                                                >
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
}

export default Production;