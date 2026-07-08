import { NavLink } from "react-router-dom";

import "../css/sidebar.css";

function Sidebar() {

    const menuItems = [
        { name: "Dashboard", path: "/" },
        { name: "Products", path: "/products" },
        { name: "Production", path: "/production" },
        { name: "Vehicles", path: "/vehicles" },
        { name: "Sales", path: "/sales" },
        { name: "Parties", path: "/parties" },
        { name: "Reports", path: "/reports" },
    ];

    return (

        <aside className="sidebar">

            <h2 className="logo">
                Crusher IMS
            </h2>

            <nav>

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

        </aside>

    );
}

export default Sidebar;