import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import api from "../services/api";

function Products() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        api.get("/products")
            .then((res) => {
                setProducts(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    return (
        <Layout>
            <div className="page-header">
                <h1>Products</h1>

                <button className="primary-btn">
                    + Add Product
                </button>
            </div>

            <div className="table-container">

                <table>

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Product Name</th>
                            <th>Quantity (Tons)</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        {products.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center" }}>
                                    No Products Found
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product.product_id}>
                                    <td>{product.product_id}</td>
                                    <td>{product.product_name}</td>
                                    <td>{product.quantity_tons}</td>
                                    <td>{product.status}</td>
                                    <td>
                                        <button>Edit</button>
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