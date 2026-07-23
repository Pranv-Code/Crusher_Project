import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "../css/layout.css";

function Layout({ children }) {
    const [isCollapsed, setIsCollapsed] = useState(
        localStorage.getItem("sidebar-collapsed") === "true"
    );

    const toggleSidebar = () => {
        const nextState = !isCollapsed;
        setIsCollapsed(nextState);
        localStorage.setItem("sidebar-collapsed", String(nextState));
    };

    return (
        <div className="layout">
            <Sidebar isCollapsed={isCollapsed} onToggleSidebar={toggleSidebar} />
            <div className={`main-content ${isCollapsed ? "sidebar-collapsed" : ""}`}>
                <Navbar onToggleSidebar={toggleSidebar} isSidebarCollapsed={isCollapsed} />
                <div className="page-content">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Layout;