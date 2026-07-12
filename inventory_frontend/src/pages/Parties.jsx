import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { useInventory } from "../context/InventoryContext";

import {
    addParty,
    updateParty,
    deleteParty,
} from "../services/partyApi";

// Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SearchBar from "../components/common/SearchBar";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

import CrudTable from "../components/table/CrudTable";
import ActionButtons from "../components/table/ActionButtons";

import ConfirmModal from "../components/modal/ConfirmModal";
import EditModal from "../components/modal/EditModal";

function Parties() {
    const { parties, fetchParties } = useInventory();
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);

    const [newParty, setNewParty] = useState({
        party_name: "",
        gst_no: "",
        address: "",
        pan_no: "",
    });

    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({
        party_name: "",
        gst_no: "",
        address: "",
        pan_no: "",
    });

    // Confirmation modal states to replace window.confirm
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    useEffect(() => {
        fetchParties();
    }, []);

    const filteredParties = parties.filter((party) =>
        party.party_name.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddParty = async () => {
        if (!newParty.party_name.trim()) {
            alert("Party Name is required");
            return;
        }
        try {
            await addParty(newParty);
            await fetchParties(true);
            setNewParty({
                party_name: "",
                gst_no: "",
                address: "",
                pan_no: "",
            });
            setShowAddForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (party) => {
        setEditingId(party.party_id);
        setEditData({
            party_name: party.party_name,
            gst_no: party.gst_no,
            address: party.address,
            pan_no: party.pan_no,
        });
    };

    const handleSave = async () => {
        try {
            await updateParty(editingId, editData);
            await fetchParties(true);
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteTargetId(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        setShowConfirm(false);
        try {
            await deleteParty(deleteTargetId);
            await fetchParties(true);
        } catch (err) {
            console.error(err);
            alert(
                err.response?.data?.message ||
                "Failed to delete party."
            );
        } finally {
            setDeleteTargetId(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    // Configuration schema for CrudTable structural mapping
    const columns = [
        { key: "party_name", label: "Party Name" },
        { key: "gst_no", label: "GST No" },
        { key: "pan_no", label: "PAN No" },
        { key: "address", label: "Address" },
        { key: "status", label: "Status" }
    ];

    return (
        <Layout>
            <PageHeader
                title="Parties"
                subtitle="Manage Parties"
                actions={
                    <Button
                        variant={showAddForm ? "secondary" : "primary"}
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "Cancel" : "+ Add Party"}
                    </Button>
                }
            />

            {showAddForm && (
                <div className="form-card">
                    <div className="form-grid">
                        <InputField
                            label="Party Name"
                            name="party_name"
                            type="text"
                            value={newParty.party_name}
                            onChange={(e) =>
                                setNewParty({ ...newParty, party_name: e.target.value })
                            }
                        />
                        <InputField
                            label="GST No"
                            name="gst_no"
                            type="text"
                            value={newParty.gst_no}
                            onChange={(e) =>
                                setNewParty({ ...newParty, gst_no: e.target.value })
                            }
                        />
                        <InputField
                            label="PAN No"
                            name="pan_no"
                            type="text"
                            value={newParty.pan_no}
                            onChange={(e) =>
                                setNewParty({ ...newParty, pan_no: e.target.value })
                            }
                        />
                        <InputField
                            label="Address"
                            name="address"
                            type="text"
                            value={newParty.address}
                            onChange={(e) =>
                                setNewParty({ ...newParty, address: e.target.value })
                            }
                        />
                    </div>
                    <Button variant="success" onClick={handleAddParty}>
                        Save Party
                    </Button>
                </div>
            )}

            <div className="table-container">
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Party..."
                />

                {filteredParties.length === 0 ? (
                    <EmptyState
                        title="No Parties Found"
                        message="Click Add Party to create one."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={filteredParties}
                        keyField="party_id"
                        renderActions={(row) => (
                            <ActionButtons
                                onEdit={() => handleEdit(row)}
                                onDelete={() => handleDeleteClick(row.party_id)}
                            />
                        )}
                    />
                )}
            </div>

            {/* Edit Modal (Replaces old primitive table row layout inline inputs) */}
            <EditModal
                isOpen={editingId !== null}
                title="Edit Party"
                onSave={handleSave}
                onClose={handleCancel}
            >
                <InputField
                    label="Party Name"
                    name="party_name"
                    type="text"
                    value={editData.party_name}
                    onChange={(e) =>
                        setEditData({ ...editData, party_name: e.target.value })
                    }
                />
                <InputField
                    label="GST No"
                    name="gst_no"
                    type="text"
                    value={editData.gst_no}
                    onChange={(e) =>
                        setEditData({ ...editData, gst_no: e.target.value })
                    }
                />
                <InputField
                    label="PAN No"
                    name="pan_no"
                    type="text"
                    value={editData.pan_no}
                    onChange={(e) =>
                        setEditData({ ...editData, pan_no: e.target.value })
                    }
                />
                <InputField
                    label="Address"
                    name="address"
                    type="text"
                    value={editData.address}
                    onChange={(e) =>
                        setEditData({ ...editData, address: e.target.value })
                    }
                />
            </EditModal>

            {/* Confirm Modal (Replaces old window.confirm popup dialog) */}
            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Party"
                message="Are you sure you want to delete this party?"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteTargetId(null);
                }}
            />
        </Layout>
    );
}

export default Parties;