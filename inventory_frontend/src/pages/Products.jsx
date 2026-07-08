import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";

import {
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
} from "../services/productApi";

function Products() {
    const [products, setProducts] = useState([]);
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

    // ---------------- Fetch Products ----------------

    const fetchProducts = async () => {
        try {
            const res = await getProducts();
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

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

            fetchProducts();

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

    const handleSave = async (id) => {

        try {

            await updateProduct(id, editData);

            fetchProducts();

            setEditingId(null);

        } catch (err) {

            console.error(err);

        }

    };

    // ---------------- Delete ----------------

    const handleDelete = async (id) => {

        if (!window.confirm("Delete this product?"))
            return;

        try {

            await deleteProduct(id);

            fetchProducts();

        } catch (err) {

            console.error(err);

        }

    };

    return (
        <Layout>

            <div className="page-header">

                <h1>Products</h1>

                <button
                    className="primary-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? "Cancel" : "+ Add Product"}
                </button>

            </div>

            {showAddForm && (

                <div className="add-form">

                    <input 
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

                    <input
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

                    <select 
                        value={newProduct.unit}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                unit: e.target.value,
                            })
                        }
                    >
                        <option value="Tons">Tons</option>
                        <option value="Brass">Brass</option>
                    </select>

                    <button
                        className="primary-btn"
                        onClick={handleAddProduct}
                    >
                        Save Product
                    </button>

                </div>

            )}

            <div className="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>ID</th>
                            <th>Product Name</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Actions</th>

                        </tr>

                    </thead>

                    <tbody>

                        {products.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="5"
                                    style={{ textAlign: "center" }}
                                >
                                    No Products Found
                                </td>

                            </tr>

                        ) : (

                            products.map((product) => (

                                <tr key={product.product_id}>

                                    <td>{product.product_id}</td>

                                    <td>

                                        {editingId === product.product_id ? (

                                            <input className="edit-input"
                                                value={editData.product_name}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        product_name: e.target.value,
                                                    })
                                                }
                                            />

                                        ) : (

                                            product.product_name

                                        )}

                                    </td>

                                    <td>{product.quantity_tons}</td>

                                    <td>

                                        {editingId === product.product_id ? (

                                            <select className="edit-select"
                                                value={editData.status}
                                                onChange={(e) =>
                                                    setEditData({
                                                        ...editData,
                                                        status: e.target.value,
                                                    })
                                                }
                                            >
                                                <option value="Active">
                                                    Active
                                                </option>

                                                <option value="Inactive">
                                                    Inactive
                                                </option>

                                            </select>

                                        ) : (

                                            product.status

                                        )}

                                    </td>

                                    <td>

                                        {editingId === product.product_id ? (

                                            <>

                                                <button
                                                className="save-btn"
                                                    onClick={() => handleSave(product.product_id)}
                                                >
                                                    Save
                                                </button>

                                                <button className="cancel-btn"
                                                    onClick={handleCancel}
                                                >
                                                    Cancel
                                                </button>

                                            </>

                                        ) : (

                                            <>

                                                <button className="edit-btn"
                                                    onClick={() => handleEdit(product)}
                                                >
                                                    Edit
                                                </button>

                                                <button className="delete-btn"
                                                    onClick={() => handleDelete(product.product_id)}
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

export default Products;