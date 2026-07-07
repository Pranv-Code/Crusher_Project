import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import api from "../services/api";

function Vehicles() {
    const [vehicles, setVehicles] = useState([]);

    useEffect(() => {
        api.get("/vehicles")
            .then((res) => {
                setVehicles(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    return (
        <Layout>
            <div className="page-header">
                <h1>Vehicles</h1>

                <button className="primary-btn">
                    + Add Vehicles
                </button>
            </div>

            <div className="table-container">

                <table>

                    <thead>
                        <tr>
                            <th>Vehicle Number</th>
                            <th>Owner</th>
                        </tr>
                    </thead>

                    <tbody>

                        {vehicles.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center" }}>
                                    No Vehicle Found
                                </td>
                            </tr>
                        ) : (
                            vehicles.map((vehicle) => (
                                <tr key={vehicle.vehicle_number}>
                                    <td>{vehicle.vehicle_number}</td>
                                    <td>{vehicle.owner}</td>
                                </tr>
                            ))
                        )}

                    </tbody>

                </table>

            </div>

        </Layout>
    );
}

export default Vehicles;