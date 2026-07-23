import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getSettings, updateSettings, getSettingsLogs } from "../services/settingsApi";
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";
import CrudTable from "../components/table/CrudTable";

export default function Settings() {
    const [settings, setSettings] = useState({
        inventory_mode: "COMMON_POOL",
        common_pool_stock: 0
    });
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [updating, setUpdating] = useState(false);
    
    const [editMode, setEditMode] = useState("COMMON_POOL");
    const [reason, setReason] = useState("");

    const fetchSettingsData = async () => {
        setLoading(true);
        try {
            const [settingsRes, logsRes] = await Promise.all([
                getSettings(),
                getSettingsLogs()
            ]);
            setSettings(settingsRes.data);
            setEditMode(settingsRes.data.inventory_mode);
            setLogs(logsRes.data || []);
        } catch (err) {
            console.error("Failed to load settings data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettingsData();
    }, []);

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

    const columns = [
        { key: "changed_at", label: "Date & Time" },
        { key: "user_fullname", label: "Changed By", render: (row) => `${row.user_fullname} (${row.username})` },
        { key: "previous_mode", label: "Previous Mode", render: (row) => row.previous_mode === "COMMON_POOL" ? "Common Pool" : "Product-Wise" },
        { key: "new_mode", label: "New Mode", render: (row) => row.new_mode === "COMMON_POOL" ? "Common Pool" : "Product-Wise" },
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
                subtitle="Manage configuration and system behaviour"
            />

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
                        <strong>Current Mode:</strong> {settings.inventory_mode === "COMMON_POOL" ? "Common Pool" : "Product-Wise"}
                    </p>
                    {settings.inventory_mode === "COMMON_POOL" && (
                        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "var(--text-primary, #1e293b)" }}>
                            <strong>Consolidated Pool Stock:</strong> <span style={{ color: "#309be8", fontWeight: "bold" }}>{Number(settings.common_pool_stock).toFixed(2)} MT</span>
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
                            { value: "COMMON_POOL", label: "Common Pool" },
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
