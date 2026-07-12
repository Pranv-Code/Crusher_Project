import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/sidebar.css";

function Sidebar() {
    const { user, logoutUser, isManager, isClerk } = useAuth();
    const navigate = useNavigate();

    const menuItems = [];
    if (user) {
        menuItems.push({ name: "Dashboard", path: "/" });
        
        if (isManager) {
            menuItems.push(
                { name: "Products", path: "/products" },
                { name: "Production", path: "/production" },
                { name: "Vehicles", path: "/vehicles" },
                { name: "Raw Material", path: "/raw-material" },
                { name: "Sales", path: "/sales" },
                { name: "Vehicle Sales", path: "/vehicle-sales" },
                { name: "Parties", path: "/parties" },
                { name: "Reports", path: "/reports" },
                { name: "Users", path: "/users" }
            );
        } else if (isClerk) {
            menuItems.push(
                { name: "Production", path: "/production" },
                { name: "Sales", path: "/sales" },
                { name: "Reports", path: "/reports" }
            );
        }
    }

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    return (
        <aside className="sidebar">
            <h2 className="logo">
                Crusher IMS
            </h2>

            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/"}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            {user && (
                <div className="sidebar-user">
                    <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className={`user-role ${user.role.toLowerCase()}`}>{user.role}</div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            )}
        </aside>
    );
}

export default Sidebar;