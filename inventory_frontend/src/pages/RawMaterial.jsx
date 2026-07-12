import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";

import {
    addVehicleActivity,
    updateVehicleActivity,
    deleteVehicleActivity,
} from "../services/vehicleActivityApi";

// Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";
import SearchBar from "../components/common/SearchBar";

import CrudTable from "../components/table/CrudTable";
import ActionButtons from "../components/table/ActionButtons";

import ConfirmModal from "../components/modal/ConfirmModal";
import EditModal from "../components/modal/EditModal";

// Helper utilities for date & weight calculation
const formatTimeToHM = (timeStr) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return timeStr;
};

const calculateTurnaround = (arrival, unloading) => {
    if (!arrival || !unloading) return "00:00:00";
    const getParts = (str) => {
        const parts = str.split(":");
        return [Number(parts[0]) || 0, Number(parts[1]) || 0];
    };
    const [arrH, arrM] = getParts(arrival);
    const [unlH, unlM] = getParts(unloading);

    let arrMinutes = arrH * 60 + arrM;
    let unlMinutes = unlH * 60 + unlM;

    // Handle overnight cross-day turnaround
    if (unlMinutes < arrMinutes) {
        unlMinutes += 24 * 60;
    }

    const diffMinutes = unlMinutes - arrMinutes;
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

function RawMaterial() {
    const { isManager } = useAuth();
    const {
        vehicleActivities,
        fetchVehicleActivities,
        vehicles,
        fetchVehicles,
    } = useInventory();

    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);

    const [newActivity, setNewActivity] = useState({
        activity_date: "",
        vehicle_number: "",
        arrival_time: "",
        loading_start_time: "",
        unloading_end_time: "",
        total_weight: "",
        vehicle_weight: "",
        site: "",
    });

    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({
        activity_date: "",
        vehicle_number: "",
        arrival_time: "",
        loading_start_time: "",
        unloading_end_time: "",
        total_weight: "",
        vehicle_weight: "",
        site: "",
    });

    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    useEffect(() => {
        fetchVehicleActivities();
        fetchVehicles();
    }, []);

    const filteredActivities = vehicleActivities.filter((activity) =>
        activity.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
        activity.site?.toLowerCase().includes(search.toLowerCase())
    );

    // Calculated fields preview
    const newNetWeight = newActivity.total_weight && newActivity.vehicle_weight
        ? (Number(newActivity.total_weight) - Number(newActivity.vehicle_weight)).toFixed(2)
        : "";

    const newTurnaround = newActivity.arrival_time && newActivity.unloading_end_time
        ? formatTimeToHM(calculateTurnaround(newActivity.arrival_time, newActivity.unloading_end_time))
        : "";

    const editNetWeight = editData.total_weight && editData.vehicle_weight
        ? (Number(editData.total_weight) - Number(editData.vehicle_weight)).toFixed(2)
        : "";

    const editTurnaround = editData.arrival_time && editData.unloading_end_time
        ? formatTimeToHM(calculateTurnaround(editData.arrival_time, editData.unloading_end_time))
        : "";

    const handleAddActivity = async () => {
        if (
            !newActivity.activity_date ||
            !newActivity.vehicle_number ||
            !newActivity.arrival_time ||
            !newActivity.loading_start_time ||
            !newActivity.unloading_end_time ||
            newActivity.total_weight === "" ||
            newActivity.vehicle_weight === "" ||
            !newActivity.site.trim()
        ) {
            alert("Please fill all fields.");
            return;
        }

        const net_weight = parseFloat(newActivity.total_weight) - parseFloat(newActivity.vehicle_weight);
        if (net_weight < 0) {
            alert("Total Weight cannot be less than Vehicle Weight.");
            return;
        }

        const turnaround_time = calculateTurnaround(newActivity.arrival_time, newActivity.unloading_end_time);

        const payload = {
            ...newActivity,
            net_weight: net_weight.toFixed(2),
            turnaround_time,
        };

        try {
            await addVehicleActivity(payload);
            await fetchVehicleActivities(true);
            setNewActivity({
                activity_date: "",
                vehicle_number: "",
                arrival_time: "",
                loading_start_time: "",
                unloading_end_time: "",
                total_weight: "",
                vehicle_weight: "",
                site: "",
            });
            setShowAddForm(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to add raw material entry.");
        }
    };

    const handleEdit = (activity) => {
        setEditingId(activity.activity_id);
        setEditData({
            activity_date: activity.activity_date,
            vehicle_number: activity.vehicle_number,
            arrival_time: formatTimeToHM(activity.arrival_time),
            loading_start_time: formatTimeToHM(activity.loading_start_time),
            unloading_end_time: formatTimeToHM(activity.unloading_end_time),
            total_weight: activity.total_weight,
            vehicle_weight: activity.vehicle_weight,
            site: activity.site,
        });
    };

    const handleSave = async () => {
        if (
            !editData.activity_date ||
            !editData.vehicle_number ||
            !editData.arrival_time ||
            !editData.loading_start_time ||
            !editData.unloading_end_time ||
            editData.total_weight === "" ||
            editData.vehicle_weight === "" ||
            !editData.site.trim()
        ) {
            alert("Please fill all fields.");
            return;
        }

        const net_weight = parseFloat(editData.total_weight) - parseFloat(editData.vehicle_weight);
        if (net_weight < 0) {
            alert("Total Weight cannot be less than Vehicle Weight.");
            return;
        }

        const turnaround_time = calculateTurnaround(editData.arrival_time, editData.unloading_end_time);

        const payload = {
            ...editData,
            net_weight: net_weight.toFixed(2),
            turnaround_time,
        };

        try {
            await updateVehicleActivity(editingId, payload);
            await fetchVehicleActivities(true);
            setEditingId(null);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to update raw material entry.");
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteTargetId(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        setShowConfirm(false);
        try {
            await deleteVehicleActivity(deleteTargetId);
            await fetchVehicleActivities(true);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete raw material entry.");
        } finally {
            setDeleteTargetId(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const columns = [
        { key: "activity_date", label: "Date" },
        { key: "vehicle_number", label: "Vehicle Number" },
        {
            key: "arrival_time",
            label: "Arrival",
            render: (row) => formatTimeToHM(row.arrival_time),
        },
        {
            key: "loading_start_time",
            label: "Loading Start",
            render: (row) => formatTimeToHM(row.loading_start_time),
        },
        {
            key: "unloading_end_time",
            label: "Unloading End",
            render: (row) => formatTimeToHM(row.unloading_end_time),
        },
        {
            key: "turnaround_time",
            label: "Turnaround",
            render: (row) => formatTimeToHM(row.turnaround_time),
        },
        {
            key: "total_weight",
            label: "Total Wt (T)",
            render: (row) => Number(row.total_weight).toFixed(2),
        },
        {
            key: "vehicle_weight",
            label: "Vehicle Wt (T)",
            render: (row) => Number(row.vehicle_weight).toFixed(2),
        },
        {
            key: "net_weight",
            label: "Net Wt (T)",
            render: (row) => Number(row.net_weight).toFixed(2),
        },
        { key: "site", label: "Site" },
    ];

    return (
        <Layout>
            <PageHeader
                title="Raw Material"
                subtitle="Manage raw material arrivals and vehicle turnaround"
                actions={
                    <Button
                        variant={showAddForm ? "secondary" : "primary"}
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "Cancel" : "+ Add Raw Material"}
                    </Button>
                }
            />

            {showAddForm && (
                <div className="form-card">
                    <div className="form-grid">
                        <InputField
                            label="Activity Date"
                            name="activity_date"
                            type="date"
                            value={newActivity.activity_date}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    activity_date: e.target.value,
                                })
                            }
                        />

                        <SelectField
                            label="Vehicle"
                            name="vehicle_number"
                            value={newActivity.vehicle_number}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    vehicle_number: e.target.value,
                                })
                            }
                            options={vehicles.map((v) => ({
                                value: v.vehicle_number,
                                label: v.vehicle_number,
                            }))}
                        />

                        <InputField
                            label="Arrival Time"
                            name="arrival_time"
                            type="time"
                            value={newActivity.arrival_time}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    arrival_time: e.target.value,
                                })
                            }
                        />

                        <InputField
                            label="Loading Start"
                            name="loading_start_time"
                            type="time"
                            value={newActivity.loading_start_time}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    loading_start_time: e.target.value,
                                })
                            }
                        />

                        <InputField
                            label="Unloading End"
                            name="unloading_end_time"
                            type="time"
                            value={newActivity.unloading_end_time}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    unloading_end_time: e.target.value,
                                })
                            }
                        />

                        <InputField
                            label="Total Weight (T)"
                            name="total_weight"
                            type="number"
                            step="0.01"
                            value={newActivity.total_weight}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    total_weight: e.target.value,
                                })
                            }
                        />

                        <InputField
                            label="Vehicle Weight (T)"
                            name="vehicle_weight"
                            type="number"
                            step="0.01"
                            value={newActivity.vehicle_weight}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    vehicle_weight: e.target.value,
                                })
                            }
                        />

                        <InputField
                            label="Site"
                            name="site"
                            type="text"
                            placeholder="Quarry or Plant name"
                            value={newActivity.site}
                            onChange={(e) =>
                                setNewActivity({
                                    ...newActivity,
                                    site: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div style={{ marginTop: "15px", display: "flex", gap: "20px", fontSize: "14px", color: "#555" }}>
                        {newNetWeight && (
                            <div>
                                <strong>Calculated Net Weight:</strong> {newNetWeight} Tons
                            </div>
                        )}
                        {newTurnaround && (
                            <div>
                                <strong>Calculated Turnaround Time:</strong> {newTurnaround}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: "15px" }}>
                        <Button variant="success" onClick={handleAddActivity}>
                            Save Raw Material Entry
                        </Button>
                    </div>
                </div>
            )}

            <div className="table-container">
                <SearchBar
                    placeholder="Search by Vehicle or Site..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {filteredActivities.length === 0 ? (
                    <EmptyState
                        title="No Raw Material Entries Found"
                        message="Click Add Raw Material to record an arrival."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={filteredActivities}
                        keyField="activity_id"
                        renderActions={isManager ? (row) => (
                            <ActionButtons
                                onEdit={() => handleEdit(row)}
                                onDelete={() => handleDeleteClick(row.activity_id)}
                            />
                        ) : null}
                    />
                )}
            </div>

            <EditModal
                isOpen={editingId !== null}
                title="Edit Raw Material Entry"
                onSave={handleSave}
                onClose={handleCancel}
            >
                <InputField
                    label="Activity Date"
                    name="edit_activity_date"
                    type="date"
                    value={editData.activity_date || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            activity_date: e.target.value,
                        })
                    }
                />

                <SelectField
                    label="Vehicle"
                    name="edit_vehicle_number"
                    value={editData.vehicle_number || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            vehicle_number: e.target.value,
                        })
                    }
                    options={vehicles.map((v) => ({
                        value: v.vehicle_number,
                        label: v.vehicle_number,
                    }))}
                />

                <InputField
                    label="Arrival Time"
                    name="edit_arrival_time"
                    type="time"
                    value={editData.arrival_time || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            arrival_time: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Loading Start"
                    name="edit_loading_start_time"
                    type="time"
                    value={editData.loading_start_time || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            loading_start_time: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Unloading End"
                    name="edit_unloading_end_time"
                    type="time"
                    value={editData.unloading_end_time || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            unloading_end_time: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Total Weight (T)"
                    name="edit_total_weight"
                    type="number"
                    step="0.01"
                    value={editData.total_weight || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            total_weight: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Vehicle Weight (T)"
                    name="edit_vehicle_weight"
                    type="number"
                    step="0.01"
                    value={editData.vehicle_weight || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            vehicle_weight: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Site"
                    name="edit_site"
                    type="text"
                    value={editData.site || ""}
                    onChange={(e) =>
                        setEditData({
                            ...editData,
                            site: e.target.value,
                        })
                    }
                />

                <div style={{ marginTop: "15px", fontSize: "14px", color: "#555" }}>
                    {editNetWeight && (
                        <div>
                            <strong>Calculated Net Weight:</strong> {editNetWeight} Tons
                        </div>
                    )}
                    {editTurnaround && (
                        <div>
                            <strong>Calculated Turnaround Time:</strong> {editTurnaround}
                        </div>
                    )}
                </div>
            </EditModal>

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Entry"
                message="Are you sure you want to delete this raw material entry?"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteTargetId(null);
                }}
            />
        </Layout>
    );
}

export default RawMaterial;
