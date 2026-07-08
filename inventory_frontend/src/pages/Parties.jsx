import { useEffect, useState } from "react";
import Layout from "../layouts/Layout";

import {
    getParties,
    addParty,
    updateParty,
    deleteParty,
} from "../services/partyApi";

function Parties() {

    const [parties, setParties] = useState([]);

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
        const fetchParties = async () => {

        try {

            const res = await getParties();

            setParties(res.data);

        } catch (err) {

            console.error(err);

        }

    };

    useEffect(() => {

        fetchParties();

    }, []);
        const filteredParties = parties.filter((party) =>

        party.party_name
            .toLowerCase()
            .includes(search.toLowerCase())

    );
        const handleAddParty = async () => {

        if (!newParty.party_name.trim()) {

            alert("Party Name is required");

            return;

        }

        try {

            await addParty(newParty);

            fetchParties();

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
        const handleSave = async (id) => {

        try {

            await updateParty(id, editData);

            fetchParties();

            setEditingId(null);

        } catch (err) {

            console.error(err);

        }};

           const handleDelete = async (id) => {

    const confirmDelete = window.confirm(
        "Are you sure you want to delete this party?"
    );

    if (!confirmDelete) return;

    try {

        await deleteParty(id);

        fetchParties();

    } catch (err) {

        console.error(err);

        alert(
            err.response?.data?.message ||
            "Failed to delete party."
        );

    }

};

        const handleCancel = () => {

        setEditingId(null);

    };
    return (
    <Layout>

        <div className="page-header">

            <h1>Parties</h1>

            <button
                className="primary-btn"
                onClick={() => setShowAddForm(!showAddForm)}
            >
                {showAddForm ? "Cancel" : "+ Add Party"}
            </button>

        </div>

        {showAddForm && (

            <div className="form-card">

                <div className="form-grid">

                    <div className="form-group">

                        <label>Party Name</label>

                        <input
                            type="text"
                            value={newParty.party_name}
                            onChange={(e) =>
                                setNewParty({
                                    ...newParty,
                                    party_name: e.target.value,
                                })
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>GST No</label>

                        <input
                            type="text"
                            value={newParty.gst_no}
                            onChange={(e) =>
                                setNewParty({
                                    ...newParty,
                                    gst_no: e.target.value,
                                })
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>PAN No</label>

                        <input
                            type="text"
                            value={newParty.pan_no}
                            onChange={(e) =>
                                setNewParty({
                                    ...newParty,
                                    pan_no: e.target.value,
                                })
                            }
                        />

                    </div>

                    <div className="form-group">

                        <label>Address</label>

                        <input
                            type="text"
                            value={newParty.address}
                            onChange={(e) =>
                                setNewParty({
                                    ...newParty,
                                    address: e.target.value,
                                })
                            }
                        />

                    </div>

                </div>

                <button
                    className="primary-btn"
                    onClick={handleAddParty}
                >
                    Save Party
                </button>

            </div>

        )}

        <div className="table-container">

            <div style={{ marginBottom: "20px" }}>

                <input
                    className="edit-input"
                    placeholder="Search Party..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

            </div>

            <table>

                <thead>

                    <tr>

                        <th>Party Name</th>

                        <th>GST No</th>

                        <th>PAN No</th>

                        <th>Address</th>

                        <th>Action</th>

                    </tr>

                </thead>

                <tbody>

                    {
                        filteredParties.length === 0 ?

                            <tr>

                                <td
                                    colSpan="5"
                                    style={{ textAlign: "center" }}
                                >

                                    No Parties Found

                                </td>

                            </tr>

                            :

                            filteredParties.map((party) => (

                                <tr key={party.party_id}>

                                    <td>

                                        {

                                            editingId === party.party_id ?

                                                <input
                                                    className="edit-input"
                                                    value={editData.party_name}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            party_name: e.target.value,
                                                        })
                                                    }
                                                />

                                                :

                                                party.party_name

                                        }

                                    </td>

                                    <td>

                                        {

                                            editingId === party.party_id ?

                                                <input
                                                    className="edit-input"
                                                    value={editData.gst_no}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            gst_no: e.target.value,
                                                        })
                                                    }
                                                />

                                                :

                                                party.gst_no

                                        }

                                    </td>

                                    <td>

                                        {

                                            editingId === party.party_id ?

                                                <input
                                                    className="edit-input"
                                                    value={editData.pan_no}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            pan_no: e.target.value,
                                                        })
                                                    }
                                                />

                                                :

                                                party.pan_no

                                        }

                                    </td>

                                    <td>

                                        {

                                            editingId === party.party_id ?

                                                <input
                                                    className="edit-input"
                                                    value={editData.address}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            address: e.target.value,
                                                        })
                                                    }
                                                />

                                                :

                                                party.address

                                        }

                                    </td>

                                    <td>

                                        {

                                            editingId === party.party_id ?

                                                <>

                                                    <button
                                                        className="save-btn"
                                                        onClick={() =>
                                                            handleSave(party.party_id)
                                                        }
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

                                                :

                                                <>

                                                    <button
                                                        className="edit-btn"
                                                        onClick={() =>
                                                            handleEdit(party)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="delete-btn"
                                                        onClick={() =>
                                                            handleDelete(party.party_id)
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </>

                                        }

                                    </td>

                                </tr>

                            ))

                    }

                </tbody>

            </table>

        </div>

    </Layout>
);}
export default Parties;