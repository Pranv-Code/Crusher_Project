import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import api from "../services/api";

function Production() {
    const [productions, setProduction] = useState([]);

    useEffect(() => {
        api.get("/production")
            .then((res) => {
                setProduction(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    return (
        <Layout>
            <div className="page-header">
                <h1>Production</h1>

                <button className="primary-btn">
                    + Add Item
                </button>
            </div>

            <div className="table-container">

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