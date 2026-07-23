import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/sidebar.css";

function Sidebar({ isCollapsed, onToggleSidebar }) {
    const { user, logoutUser, isManager, isClerk } = useAuth();
    const navigate = useNavigate();

    const menuItems = [];
    if (user) {
        menuItems.push({ name: "Dashboard", path: "/", icon: "📊" });

        if (isManager) {
            menuItems.push(
                { name: "Products", path: "/products", icon: "📦" },
                { name: "Production", path: "/production", icon: "🏭" },
                { name: "Vehicles", path: "/vehicles", icon: "🚚" },
                { name: "Raw Material", path: "/raw-material", icon: "🪨" },
                { name: "Sales", path: "/sales", icon: "💰" },
                { name: "Vehicle Sales", path: "/vehicle-sales", icon: "🔑" },
                { name: "Parties", path: "/parties", icon: "👥" },
                { name: "Reports", path: "/reports", icon: "📈" },
                { name: "Users", path: "/users", icon: "🛡️" },
                { name: "Settings", path: "/settings", icon: "⚙️" }
            );
        } else if (isClerk) {
            menuItems.push(
                { name: "Production", path: "/production", icon: "🏭" },
                { name: "Raw Material", path: "/raw-material", icon: "🪨" },
                { name: "Sales", path: "/sales", icon: "💰" },
                { name: "Reports", path: "/reports", icon: "📈" }
            );
        }
    }

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    const getInitials = (name) => {
        if (!name) return "E";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
            {/* Top Sidebar Header with Employee Name & Toggle Arrow */}
            <div className="sidebar-top-header">
                {isCollapsed ? (
                    <div 
                        className="sidebar-employee-avatar-collapsed" 
                        onClick={onToggleSidebar}
                        title={`Expand Sidebar — ${user?.name || "Employee"} (${user?.role || ""})`}
                    >
                        {getInitials(user?.name)}
                    </div>
                ) : (
                    <div className="sidebar-employee-info">
                        <div className="sidebar-employee-avatar">
                            {getInitials(user?.name)}
                        </div>
                        <div className="sidebar-employee-text">
                            <span className="sidebar-employee-name" title={user?.name || "Employee Name"}>
                                {user?.name || "Employee Name"}
                            </span>
                            {/* <span className={`sidebar-employee-role ${user?.role?.toLowerCase() || ""}`}>
                                {user?.role || "User"}
                            </span> */}
                        </div>
                    </div>
                )}
                <button 
                    className="sidebar-toggle-btn" 
                    onClick={onToggleSidebar}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    aria-label="Toggle Sidebar"
                >
                    <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ 
                            transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)", 
                            transition: "transform 0.3s ease" 
                        }}
                    >
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
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
                        title={isCollapsed ? item.name : ""}
                    >
                        <span className="nav-link-icon">{item.icon}</span>
                        <span className="nav-link-text">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer Section with Logout */}
            {user && (
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout} title="Logout">
                        <span className="logout-icon">🚪</span>
                        <span className="logout-text">Logout</span>
                    </button>
                </div>
            )}
        </aside>
    );
}

export default Sidebar;