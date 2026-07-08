import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import {
    getVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
} from "../services/vehicleApi";

function Vehicles() {
    const [vehicles, setVehicles] = useState([]);

    const [showAddForm, setShowAddForm] = useState(false);

    const [newVehicle, setNewVehicle] = useState({
        vehicle_number: "",
        owner: "",
    });

    const [editingVehicle, setEditingVehicle] = useState(null);

    const [editData, setEditData] = useState({
        vehicle_number: "",
        owner: "",
    });
    const fetchVehicles = async () => {

        try {

            const res = await getVehicles();

            setVehicles(res.data);

        } catch (err) {

            console.error(err);

        }

    };

    useEffect(() => {

        fetchVehicles();

    }, []);
    const handleAddVehicle = async () => {

        if (
            !newVehicle.vehicle_number.trim() ||
            !newVehicle.owner.trim()
        ) {
            alert("Please fill all fields.");
            return;
        }

        try {

            await addVehicle(newVehicle);

            fetchVehicles();

            setNewVehicle({
                vehicle_number: "",
                owner: "",
            });

            setShowAddForm(false);

        } catch (err) {

            console.error(err);

        }

    };
    const handleEdit = (vehicle) => {

        setEditingVehicle(vehicle.vehicle_number);

        setEditData({
            vehicle_number: vehicle.vehicle_number,
            owner: vehicle.owner,
        });

    };
    const handleSave = async () => {

        try {

            await updateVehicle(
                editingVehicle,
                editData
            );

            fetchVehicles();

            setEditingVehicle(null);

        } catch (err) {

            console.error(err);

        }

    };
    const handleDelete = async (vehicleNumber) => {

        if (!window.confirm("Delete this vehicle?"))
            return;

        try {

            await deleteVehicle(vehicleNumber);

            fetchVehicles();

        } catch (err) {

            console.error(err);

        }

    };
    const handleCancel = () => {

        setEditingVehicle(null);

    };

    return (
        <Layout>
            <div className="page-header">

                <h1>Vehicles</h1>

                <button
                    className="primary-btn"
                    onClick={() =>
                        setShowAddForm(!showAddForm)
                    }
                >
                    {showAddForm
                        ? "Cancel"
                        : "+ Add Vehicle"}
                </button>

            </div>

            <div className="table-container">
                {
                    showAddForm && (

                        <div className="add-form">

                            <input className="edit-input"
                                type="text"
                                placeholder="Vehicle Number"
                                value={newVehicle.vehicle_number}
                                onChange={(e) =>
                                    setNewVehicle({
                                        ...newVehicle,
                                        vehicle_number: e.target.value.toUpperCase()
                                    })
                                }
                            />

                            <input className="edit-input"
                                type="text"
                                placeholder="Owner"
                                value={newVehicle.owner}
                                onChange={(e) =>
                                    setNewVehicle({
                                        ...newVehicle,
                                        owner: e.target.value
                                    })
                                }
                            />

                            <button
                                className="save-btn"
                                onClick={handleAddVehicle}
                            >
                                Save Vehicle
                            </button>

                        </div>

                    )
                }
                <table>

                    <thead>
                        <tr>
                            <th>Vehicle Number</th>
                            <th>Owner</th>
                            <th>Action</th>
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
                                    <td>
    {editingVehicle === vehicle.vehicle_number ? (
        <input className="edit-input"
            value={editData.vehicle_number}
            onChange={(e) =>
                setEditData({
                    ...editData,
                    vehicle_number: e.target.value.toUpperCase(),
                })
            }
        />
    ) : (
        vehicle.vehicle_number
    )}
</td>
                                   <td>
    {editingVehicle === vehicle.vehicle_number ? (
        <input className="edit-input"
            value={editData.owner}
            onChange={(e) =>
                setEditData({
                    ...editData,
                    owner: e.target.value,
                })
            }
        />
    ) : (
        vehicle.owner
    )}
</td>
<td>

    {editingVehicle === vehicle.vehicle_number ? (

        <>

            <button className="save-btn"
                onClick={handleSave}
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

            <button
            className="edit-btn"
                onClick={() => handleEdit(vehicle)}
            >
                Edit
            </button>

            <button
            className="delete-btn"
                onClick={() =>
                    handleDelete(vehicle.vehicle_number)
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

export default Vehicles;