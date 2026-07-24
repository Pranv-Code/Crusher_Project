import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApprovals, getMyPendingApprovals } from "../services/approvalApi";
import "../css/sidebar.css";

function Sidebar() {
    const { user, isManager, isClerk } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchCount = async () => {
            try {
                if (isManager) {
                    const res = await getApprovals();
                    setPendingCount(res.data?.length || 0);
                } else if (isClerk) {
                    const res = await getMyPendingApprovals();
                    const pending = res.data?.filter(r => r.status === "pending") || [];
                    setPendingCount(pending.length);
                }
            } catch (err) {
                console.error("Sidebar pending count fetch error:", err);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 5000);
        return () => clearInterval(interval);
    }, [user, isManager, isClerk]);

    const menuItems = [];
    if (user) {
        menuItems.push({ name: "Dashboard", path: "/" });

        if (isManager) {
            menuItems.push(
                { name: "Products", path: "/products"},
                { name: "Production", path: "/production"},
                { name: "Vehicles", path: "/vehicles"},
                { name: "Raw Material", path: "/raw-material"},
                { name: "Sales", path: "/sales"},
                { name: "Vehicle Sales", path: "/vehicle-sales"},
                { name: "Parties", path: "/parties"},
                { name: "Reports", path: "/reports" },
                { name: "Users", path: "/users" },
                { name: "Audit Logs", path: "/audit-logs" },
                { name: "Settings", path: "/settings" }
            );
        } else if (isClerk) {
            menuItems.push(
                { name: "Production", path: "/production"},
                { name: "Raw Material", path: "/raw-material"},
                { name: "Sales", path: "/sales"},
                { name: "Reports", path: "/reports" }
            );
        }
    }

    const getInitials = (name) => {
        if (!name) return "E";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <aside className="sidebar">
            {/* Top Sidebar Header with Employee Name */}
            <div className="sidebar-top-header">
                <div className="sidebar-employee-info">
                    <div className="sidebar-employee-avatar">
                        {getInitials(user?.name)}
                    </div>
                    <div className="sidebar-employee-text">
                        <span className="sidebar-employee-name" title={user?.name || "Employee Name"}>
                            {user?.name || "Employee Name"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/"}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        {item.icon && <span className="nav-link-icon">{item.icon}</span>}
                        <span className="nav-link-text">{item.name}</span>
                        {item.badge > 0 && (
                            <span className="sidebar-badge">{item.badge}</span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;