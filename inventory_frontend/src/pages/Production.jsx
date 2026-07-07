import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import {
    getProduction,
    addProduction,
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
                            <input
                                type="date"
                                value={newProduction.production_date}
                                onChange={(e) =>
                                    setNewProduction({
                                        ...newProduction,
                                        production_date: e.target.value,
                                    })
                                }
                            />
                            <select
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

                            <input
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

                            <select
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

                            <input
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
                                className="primary-btn"
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
                            <th>Production ID</th>
                            <th>Product ID</th>
                            <th>Production Date</th>
                            <th>Quantity</th>
                            <th>Units</th>
                            <th>Production Cost</th>

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
                            productions.map((product) => (
                                <tr key={product.production_id}>
                                    <td>{product.production_id}</td>
                                    <td>{product.product_name}</td>
                                    <td>{product.production_date}</td>
                                    <td>{product.quantity_tons}</td>
                                    <td>{product.unit}</td>
                                    <td>{product.production_cost}</td>
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