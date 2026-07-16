import React, { useEffect, useState } from "react";
import Layout from "../layouts/Layout";
import { getUsers, updateUserStatus, resetUserPassword } from "../services/userApi";

// Component Imports
import Button from "../components/common/Button";
import InputField from "../components/common/InputField";
import SelectField from "../components/common/SelectField";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";
import CrudTable from "../components/table/CrudTable";
import ConfirmModal from "../components/modal/ConfirmModal";
import EditModal from "../components/modal/EditModal";

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit Status Modal States
    const [statusEditUser, setStatusEditUser] = useState(null);
    const [statusValue, setStatusValue] = useState("");

    // Reset Password Modal States
    const [passwordResetUser, setPasswordResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsers();
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to load users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();

        const interval = setInterval(() => {
            const token = localStorage.getItem("token");
            if (!token) return;
            getUsers()
                .then((res) => setUsers(res.data))
                .catch((err) => console.error("Failed to refresh users in background:", err));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Status Change handler
    const handleEditStatusClick = (user) => {
        setStatusEditUser(user);
        setStatusValue(user.status);
    };

    const handleSaveStatus = async () => {
        if (!statusEditUser) return;
        try {
            await updateUserStatus(statusEditUser.user_id, statusValue);
            alert("User status updated successfully.");
            setStatusEditUser(null);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status.");
        }
    };

    // Password Reset handler
    const handleResetPasswordClick = (user) => {
        setPasswordResetUser(user);
        setNewPassword("");
    };

    const handleSavePassword = async () => {
        if (!passwordResetUser) return;
        if (!newPassword.trim()) {
            alert("Please enter a new password.");
            return;
        }
        setPasswordSubmitting(true);
        try {
            await resetUserPassword(passwordResetUser.user_id, newPassword);
            alert("Password reset successfully.");
            setPasswordResetUser(null);
            setNewPassword("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to reset password.");
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        let bgColor = "#f3f4f6";
        let textColor = "#374151";

        if (status === "Active") {
            bgColor = "#d1fae5";
            textColor = "#065f46";
        } else if (status === "Inactive") {
            bgColor = "#fee2e2";
            textColor = "#991b1b";
        } else if (status === "Pending") {
            bgColor = "#fef3c7";
            textColor = "#92400e";
        }

        return (
            <span style={{
                backgroundColor: bgColor,
                color: textColor,
                padding: "0.25rem 0.6rem",
                borderRadius: "9999px",
                fontSize: "0.85em",
                fontWeight: "600",
                display: "inline-block"
            }}>
                {status}
            </span>
        );
    };

    const getRoleBadge = (role) => {
        const isManager = role === "Manager";
        return (
            <span style={{
                backgroundColor: isManager ? "#e0f2fe" : "#f5f3ff",
                color: isManager ? "#0369a1" : "#5b21b6",
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.85em",
                fontWeight: "500"
            }}>
                {role}
            </span>
        );
    };

    const columns = [
        { key: "user_id", label: "ID" },
        { key: "name", label: "Full Name" },
        { key: "username", label: "Username" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role", render: (row) => getRoleBadge(row.role) },
        { key: "status", label: "Status", render: (row) => getStatusBadge(row.status) },
        { key: "last_login", label: "Last Login", render: (row) => row.last_login || "Never" }
    ];

    const statusOptions = [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Pending", label: "Pending" }
    ];

    return (
        <Layout>
            <PageHeader
                title="User Management"
                subtitle="Review user status, activate pending accounts, and reset passwords"
            />

            <div className="table-container">
                {loading ? (
                    <p style={{ textAlign: "center", padding: "2rem" }}>Loading users list...</p>
                ) : users.length === 0 ? (
                    <EmptyState
                        title="No Users Found"
                        message="Register users to see them listed here."
                    />
                ) : (
                    <CrudTable
                        columns={columns}
                        data={users}
                        keyField="user_id"
                        renderActions={(row) => (
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <Button
                                    variant="secondary"
                                    onClick={() => handleEditStatusClick(row)}
                                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                                >
                                    Change Status
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleResetPasswordClick(row)}
                                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                                >
                                    Reset Password
                                </Button>
                            </div>
                        )}
                    />
                )}
            </div>

            {/* Edit Status Modal */}
            <EditModal
                isOpen={statusEditUser !== null}
                title="Change User Status"
                onSave={handleSaveStatus}
                onClose={() => setStatusEditUser(null)}
            >
                <div style={{ padding: "0.5rem 0" }}>
                    <p style={{ margin: "0 0 1rem 0", color: "#475569" }}>
                        Update status for <strong>{statusEditUser?.name}</strong> ({statusEditUser?.username})
                    </p>
                    <SelectField
                        label="Status"
                        name="status"
                        value={statusValue}
                        onChange={(e) => setStatusValue(e.target.value)}
                        options={statusOptions}
                    />
                </div>
            </EditModal>

            {/* Reset Password Modal */}
            <EditModal
                isOpen={passwordResetUser !== null}
                title="Reset Password"
                onSave={handleSavePassword}
                onClose={() => setPasswordResetUser(null)}
            >
                <div style={{ padding: "0.5rem 0" }}>
                    <p style={{ margin: "0 0 1rem 0", color: "#475569" }}>
                        Reset password for <strong>{passwordResetUser?.name}</strong> ({passwordResetUser?.username})
                    </p>
                    <InputField
                        label="New Password"
                        name="password"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>
            </EditModal>
        </Layout>
    );
}
