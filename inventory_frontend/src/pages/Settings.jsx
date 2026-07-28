import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getSettings, updateSettings, getSettingsLogs } from "../services/settingsApi";
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import PageHeader from "../components/common/PageHeader";
import CrudTable from "../components/table/CrudTable";
import { useInventory } from "../context/InventoryContext";
import { addCrusher, updateCrusher, deleteCrusher } from "../services/crusherApi";

export default function Settings() {
    const { crushers, fetchCrushers } = useInventory();
    const [newCrusherName, setNewCrusherName] = useState("");
    const [addingCrusher, setAddingCrusher] = useState(false);
    const [settings, setSettings] = useState({
        inventory_mode: "COMMON_POOL",
        common_pool_stock: 0,
        tons_per_brass: 4.2
    });
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [updating, setUpdating] = useState(false);
    const [updatingCompany, setUpdatingCompany] = useState(false);
    const [updatingConversion, setUpdatingConversion] = useState(false);

    const [editMode, setEditMode] = useState("COMMON_POOL");
    const [reason, setReason] = useState("");

    // Conversion Factor State
    const [tonsPerBrass, setTonsPerBrass] = useState(4.2);

    // Company Settings Form State
    const [companyName, setCompanyName] = useState("");
    const [companyAddress, setCompanyAddress] = useState("");
    const [companyGstin, setCompanyGstin] = useState("");
    const [companyState, setCompanyState] = useState("");
    const [companyEmail, setCompanyEmail] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");

    const fetchSettingsData = async () => {
        setLoading(true);
        try {
            const [settingsRes, logsRes] = await Promise.all([
                getSettings(),
                getSettingsLogs()
            ]);
            const d = settingsRes.data || {};
            setSettings(d);
            setEditMode(d.inventory_mode || "COMMON_POOL");
            setLogs(logsRes.data || []);
            setTonsPerBrass(d.tons_per_brass || 4.2);

            setCompanyName(d.company_name || "Vishwajeet Enterprises");
            setCompanyAddress(d.company_address || "366, Shantisadan House, Ratnagiri, Maharashtra - 415639");
            setCompanyGstin(d.company_gstin || "27AAXFV1394B1ZR");
            setCompanyState(d.company_state || "Maharashtra, Code 27");
            setCompanyEmail(d.company_email || "vishwajeete54@gmail.com");
            setCompanyPhone(d.company_phone || "");
        } catch (err) {
            console.error("Failed to load settings data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettingsData();
        fetchCrushers();
    }, []);

    const handleAddCrusherSubmit = async (e) => {
        e.preventDefault();
        if (!newCrusherName.trim()) {
            alert("Please enter a Crusher Name.");
            return;
        }
        setAddingCrusher(true);
        try {
            await addCrusher({ crusher_name: newCrusherName.trim(), status: "Active" });
            setNewCrusherName("");
            await fetchCrushers(true);
            alert("Crusher added successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add crusher.");
        } finally {
            setAddingCrusher(false);
        }
    };

    const handleToggleCrusherStatus = async (crusher) => {
        const newStatus = crusher.status === "Active" ? "Inactive" : "Active";
        try {
            await updateCrusher(crusher.crusher_id, { crusher_name: crusher.crusher_name, status: newStatus });
            await fetchCrushers(true);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update crusher status.");
        }
    };

    const handleDeleteCrusherClick = async (crusher) => {
        if (!window.confirm(`Are you sure you want to delete/deactivate crusher '${crusher.crusher_name}'?`)) return;
        try {
            const res = await deleteCrusher(crusher.crusher_id);
            alert(res.data?.message || "Crusher deleted successfully.");
            await fetchCrushers(true);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete crusher.");
        }
    };

    const handleSaveSettings = async () => {
        if (!reason.trim()) {
            alert("Please enter a reason for changing the inventory mode.");
            return;
        }

        setUpdating(true);
        try {
            await updateSettings({
                inventory_mode: editMode,
                reason: reason.trim()
            });
            alert("Inventory settings updated successfully.");
            setReason("");
            await fetchSettingsData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update settings.");
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveConversionSettings = async (e) => {
        e.preventDefault();
        const factorNum = parseFloat(tonsPerBrass);
        if (isNaN(factorNum) || factorNum <= 0) {
            alert("Please enter a valid positive conversion factor (e.g. 4.2).");
            return;
        }

        setUpdatingConversion(true);
        try {
            await updateSettings({ tons_per_brass: factorNum });
            alert(`Unit conversion factor updated successfully! (1 Brass = ${factorNum} Tons)`);
            await fetchSettingsData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update unit conversion factor.");
        } finally {
            setUpdatingConversion(false);
        }
    };

    const handleSaveCompanySettings = async (e) => {
        e.preventDefault();
        setUpdatingCompany(true);
        try {
            await updateSettings({
                company_name: companyName,
                company_address: companyAddress,
                company_gstin: companyGstin,
                company_state: companyState,
                company_email: companyEmail,
                company_phone: companyPhone
            });
            alert("Company details updated successfully! These details will appear on all generated Invoice PDFs.");
            await fetchSettingsData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update company profile.");
        } finally {
            setUpdatingCompany(false);
        }
    };

    const columns = [
        { key: "changed_at", label: "Date & Time" },
        { key: "user_fullname", label: "Changed By", render: (row) => `${row.user_fullname} (${row.username})` },
        { key: "previous_mode", label: "Previous Mode", render: (row) => row.previous_mode === "COMMON_POOL" ? "Quarry Material" : "Product-Wise" },
        { key: "new_mode", label: "New Mode", render: (row) => row.new_mode === "COMMON_POOL" ? "Quarry Material" : "Product-Wise" },
        { key: "reason", label: "Reason" }
    ];

    if (loading) {
        return (
            <Layout>
                <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                    <h2>Loading Settings...</h2>
                    <p>Fetching current configuration and change logs</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <PageHeader
                title="System Settings"
                subtitle="Manage unit conversion factor, seller company profile, and inventory mode"
            />

            {/* Unit Calculator & Conversion Factor Settings */}
            <div className="form-card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--text-primary, #1e293b)" }}>
                    🔄 Unit Calculator &amp; Conversion Factor (Brass $\leftrightarrow$ Tons)
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
                    Configure the variable tons per brass conversion multiplier. Rule: <strong>1 Brass = {tonsPerBrass} Tons</strong>.
                </p>

                <form onSubmit={handleSaveConversionSettings}>
                    <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
                        <InputField
                            label="Tons per 1 Brass Factor *"
                            name="tons_per_brass"
                            type="number"
                            step="0.01"
                            placeholder="e.g. 4.2"
                            value={tonsPerBrass}
                            onChange={(e) => setTonsPerBrass(e.target.value)}
                            required
                        />
                        <div style={{ display: "flex", alignItems: "center", fontSize: "0.9rem", color: "#0369a1", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", padding: "8px 12px", borderRadius: "8px" }}>
                            💡 1 Brass = {tonsPerBrass || 4.2} Tons (MT).<br />
                            (e.g., 2 Brass = {((parseFloat(tonsPerBrass) || 4.2) * 2).toFixed(2)} MT)
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={updatingConversion}
                    >
                        {updatingConversion ? "Updating Factor..." : "Save Conversion Factor"}
                    </Button>
                </form>
            </div>

            {/* Company Profile Details for Invoice Header */}
            <div className="form-card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--text-primary, #1e293b)" }}>
                    🏢 Seller Company Profile (Used in Invoices)
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
                    Configure default company details displayed on all generated invoice PDFs.
                </p>

                <form onSubmit={handleSaveCompanySettings}>
                    <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
                        <InputField
                            label="Company Name *"
                            name="company_name"
                            type="text"
                            placeholder="e.g. Vishwajeet Enterprises"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                        />

                        <InputField
                            label="GSTIN / PAN / UIN"
                            name="company_gstin"
                            type="text"
                            placeholder="e.g. 27AAXFV1394B1ZR"
                            value={companyGstin}
                            onChange={(e) => setCompanyGstin(e.target.value)}
                        />

                        <InputField
                            label="State & Code"
                            name="company_state"
                            type="text"
                            placeholder="e.g. Maharashtra, Code 27"
                            value={companyState}
                            onChange={(e) => setCompanyState(e.target.value)}
                        />

                        <InputField
                            label="Email Address"
                            name="company_email"
                            type="email"
                            placeholder="vishwajeete54@gmail.com"
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                        />

                        <InputField
                            label="Phone Number"
                            name="company_phone"
                            type="text"
                            placeholder="Enter phone number"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                        />

                        <div style={{ gridColumn: "1 / -1" }}>
                            <InputField
                                label="Full Company Address"
                                name="company_address"
                                type="text"
                                placeholder="e.g. 366, Shantisadan House, Ratnagiri, Maharashtra - 415639"
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={updatingCompany}
                    >
                        {updatingCompany ? "Updating Profile..." : "Save Company Details"}
                    </Button>
                </form>
            </div>

            {/* Inventory Management Mode Settings */}
            <div className="form-card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "1rem", color: "var(--text-primary, #1e293b)" }}>Inventory Management Mode</h3>

                <div style={{
                    backgroundColor: "rgba(48, 155, 232, 0.05)",
                    border: "1px solid rgba(48, 155, 232, 0.2)",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.5rem"
                }}>
                    <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.5", color: "var(--text-primary, #1e293b)" }}>
                        <strong>Current Mode:</strong> {settings.inventory_mode === "COMMON_POOL" ? "Quarry Material" : "Product-Wise"}
                    </p>
                    {settings.inventory_mode === "COMMON_POOL" && (
                        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "var(--text-primary, #1e293b)" }}>
                            <strong>Quarry Material Stock:</strong> <span style={{ color: "#309be8", fontWeight: "bold" }}>{Number(settings.common_pool_stock).toFixed(2)} MT</span>
                        </p>
                    )}
                </div>

                <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
                    <SelectField
                        label="Inventory Mode"
                        name="inventory_mode"
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                        options={[
                            { value: "COMMON_POOL", label: "Quarry Material" },
                            { value: "PRODUCT_WISE", label: "Product-Wise" }
                        ]}
                    />

                    <InputField
                        label="Reason for Change"
                        name="reason"
                        type="text"
                        placeholder="Provide details for changing mode..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />
                </div>

                <Button 
                    variant="primary" 
                    onClick={handleSaveSettings}
                    disabled={updating || editMode === settings.inventory_mode}
                >
                    {updating ? "Saving..." : "Save Settings"}
                </Button>
            </div>

            {/* Crusher Master Management */}
            <div className="form-card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--text-primary, #1e293b)" }}>
                    🏗️ Crusher Master Management
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
                    Manage crushers available for selection during Production entry.
                </p>

                <form onSubmit={handleAddCrusherSubmit} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem", maxWidth: "500px" }}>
                    <div style={{ flex: 1 }}>
                        <InputField
                            label="New Crusher Name *"
                            name="new_crusher"
                            type="text"
                            placeholder="e.g. Crusher 3 / Plant B"
                            value={newCrusherName}
                            onChange={(e) => setNewCrusherName(e.target.value)}
                            required
                        />
                    </div>
                    <Button variant="primary" type="submit" disabled={addingCrusher}>
                        {addingCrusher ? "Adding..." : "+ Add Crusher"}
                    </Button>
                </form>

                <div style={{ overflowX: "auto" }}>
                    <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc" }}>
                                <th style={{ padding: "10px", textAlign: "left" }}>#</th>
                                <th style={{ padding: "10px", textAlign: "left" }}>Crusher Name</th>
                                <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
                                <th style={{ padding: "10px", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {crushers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                                        No crushers found. Add one above.
                                    </td>
                                </tr>
                            ) : (
                                crushers.map((c, i) => (
                                    <tr key={c.crusher_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "10px" }}>{i + 1}</td>
                                        <td style={{ padding: "10px", fontWeight: "600", color: "#1e293b" }}>{c.crusher_name}</td>
                                        <td style={{ padding: "10px" }}>
                                            <span style={{
                                                backgroundColor: c.status === "Active" ? "#d1fae5" : "#fee2e2",
                                                color: c.status === "Active" ? "#065f46" : "#991b1b",
                                                padding: "3px 10px",
                                                borderRadius: "12px",
                                                fontSize: "0.8rem",
                                                fontWeight: "bold"
                                            }}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                <button
                                                    onClick={() => handleToggleCrusherStatus(c)}
                                                    style={{
                                                        backgroundColor: c.status === "Active" ? "#fef3c7" : "#dcfce7",
                                                        color: c.status === "Active" ? "#92400e" : "#166534",
                                                        border: "none",
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        fontSize: "0.8rem",
                                                        fontWeight: "600"
                                                    }}
                                                >
                                                    {c.status === "Active" ? "Deactivate" : "Activate"}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCrusherClick(c)}
                                                    style={{
                                                        backgroundColor: "#fee2e2",
                                                        color: "#b91c1c",
                                                        border: "none",
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        fontSize: "0.8rem",
                                                        fontWeight: "600"
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="table-container">
                <h3 style={{ marginBottom: "1rem", color: "var(--text-primary, #1e293b)" }}>Settings Audit Log</h3>
                {logs.length === 0 ? (
                    <EmptyState
                        title="No settings changes logged"
                        message="Any modifications to the inventory mode will be listed here."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={logs}
                    />
                )}
            </div>
        </Layout>
    );
}
