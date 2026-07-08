import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Production from "./pages/Production";
import Vehicles from "./pages/Vehicles";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Parties from "./pages/Parties";

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/production" element={<Production />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/reports" element={<Reports />} />
        </Routes>
    );
}

export default AppRoutes;