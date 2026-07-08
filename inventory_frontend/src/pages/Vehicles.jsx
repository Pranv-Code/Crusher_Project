import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";

import {
    getVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
} from "../services/vehicleApi";

// Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

import CrudTable from "../components/table/CrudTable";
import ActionButtons from "../components/table/ActionButtons";

import ConfirmModal from "../components/modal/ConfirmModal";
import EditModal from "../components/modal/EditModal";

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

    // Confirmation modal states to replace window.confirm
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTargetNumber, setDeleteTargetNumber] = useState(null);

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

    const handleDeleteClick = (vehicleNumber) => {
        setDeleteTargetNumber(vehicleNumber);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        setShowConfirm(false);
        try {
            await deleteVehicle(deleteTargetNumber);
            fetchVehicles();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteTargetNumber(null);
        }
    };

    const handleCancel = () => {
        setEditingVehicle(null);
    };

    // Table mapping configurations
    const columns = [
        { key: "vehicle_number", label: "Vehicle Number" },
        { key: "owner", label: "Owner" }
    ];

    return (
        <Layout>
            <PageHeader
                title="Vehicles"
                subtitle="Manage Vehicles"
                actions={
                    <Button
                        variant={showAddForm ? "secondary" : "primary"}
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "Cancel" : "+ Add Vehicle"}
                    </Button>
                }
            />

            <div className="table-container">
                {showAddForm && (
                    <div className="add-form">
                        <InputField
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

                        <InputField
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

                        <Button variant="success" onClick={handleAddVehicle}>
                            Save Vehicle
                        </Button>
                    </div>
                )}

                {vehicles.length === 0 ? (
                    <EmptyState
                        title="No Vehicles Found"
                        message="Click Add Vehicle to create one."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={vehicles}
                        keyField="vehicle_number"
                        renderActions={(row) => (
                            <ActionButtons
                                onEdit={() => handleEdit(row)}
                                onDelete={() => handleDeleteClick(row.vehicle_number)}
                            />
                        )}
                    />
                )}
            </div>

            {/* Edit Modal (Replaces old inline fields) */}
            <EditModal
                isOpen={editingVehicle !== null}
                title="Edit Vehicle"
                onSave={handleSave}
                onClose={handleCancel}
            >
                <InputField
                    label="Vehicle Number"
                    name="vehicle_number"
                    type="text"
                    value={editData.vehicle_number}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            vehicle_number: e.target.value.toUpperCase()
                        })
                    }
                />
                <InputField
                    label="Owner"
                    name="owner"
                    type="text"
                    value={editData.owner}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            owner: e.target.value
                        })
                    }
                />
            </EditModal>

            {/* Confirm Modal (Replaces old window.confirm popup dialog) */}
            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Vehicle"
                message="Delete this vehicle?"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteTargetNumber(null);
                }}
            />
        </Layout>
    );
}

export default Vehicles;