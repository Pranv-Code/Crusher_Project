import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/sidebar.css";

function Sidebar({ isCollapsed }) {
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
                { name: "Users", path: "/users", icon: "🛡️" }
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

    // Get initials for collapsed user profile placeholder
    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
            {isCollapsed ? (
                <div className="logo-collapsed" title="Crusher IMS">🏭</div>
            ) : (
                <h2 className="logo">
                    Crusher IMS
                </h2>
            )}

            <nav>
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

            {user && (
                <div className="sidebar-user">
                    {isCollapsed ? (
                        <div className="user-avatar-collapsed" title={`${user.name} (${user.role})`}>
                            {getInitials(user.name)}
                        </div>
                    ) : (
                        <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className={`user-role ${user.role.toLowerCase()}`}>{user.role}</div>
                        </div>
                    )}
                    <button className="logout-btn" onClick={handleLogout} title="Logout">
                        <span>Logout</span> 🚪
                    </button>
                </div>
            )}
        </aside>
    );
}

export default Sidebar;