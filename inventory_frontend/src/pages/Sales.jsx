import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import api from "../services/api";

function Sales() {
    const [sales, setSales] = useState([]);
    const [newSale, setNewSale] = useState({

        sales_date: "",

        party_id: "",

        product_id: "",

        vehicle_number: "",

        quantity_tons: "",

        unit: "tons",

        site: "",

        price: "",

    });
    useEffect(() => {
        api.get("/sales")
            .then((res) => {
                setSales(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    return (
        <Layout>
            <div className="page-header">
                <h1>Sales</h1>

                <button className="primary-btn">
                    + Add Sales
                </button>
            </div>

            <div className="table-container">

                <table>

                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Party Name</th>
                            <th>Product</th>
                            <th>Vehicle Number</th>
                            <th>Unit</th>
                            <th>Quantity</th>
                            <th>Site</th>
                            <th>Price</th>

                        </tr>
                    </thead>

                    <tbody>

                        {sales.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center" }}>
                                    No Products Found
                                </td>
                            </tr>
                        ) : (
                            sales.map((sale) => (
                                <tr key={sale.sales_id}>
                                    <td>{sale.sales_date}</td>
                                    <td>{sale.party_name}</td>
                                    <td>{sale.product_name}</td>
                                    <td>{sale.vehicle_number}</td>
                                    <td>{sale.unit}</td>
                                    <td>{sale.quantity_tons}</td>
                                    <td>{sale.site}</td>
                                    <td>{sale.price}</td>

                                </tr>
                            ))
                        )}

                    </tbody>

                </table>

            </div>

        </Layout>
    );
}

export default Sales;