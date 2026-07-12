import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Production from "./pages/Production";
import Vehicles from "./pages/Vehicles";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Parties from "./pages/Parties";
import RawMaterial from "./pages/RawMaterial";
import VehicleSales from "./pages/VehicleSales";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Approvals from "./pages/Approvals";
import ClerkPendingWork from "./pages/ClerkPendingWork";
import Users from "./pages/Users";

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes - Manager & Clerk */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/production"
                element={
                    <ProtectedRoute allowedRoles={["Manager", "Clerk"]}>
                        <Production />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/sales"
                element={
                    <ProtectedRoute allowedRoles={["Manager", "Clerk"]}>
                        <Sales />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports"
                element={
                    <ProtectedRoute allowedRoles={["Manager", "Clerk"]}>
                        <Reports />
                    </ProtectedRoute>
                }
            />

            {/* Protected Routes - Clerk Only */}
            <Route
                path="/my-pending"
                element={
                    <ProtectedRoute allowedRoles={["Clerk"]}>
                        <ClerkPendingWork />
                    </ProtectedRoute>
                }
            />

            {/* Protected Routes - Manager Only */}
            <Route
                path="/products"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <Products />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vehicles"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <Vehicles />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/parties"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <Parties />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/raw-material"
                element={
                    <ProtectedRoute allowedRoles={["Manager", "Clerk"]}>
                        <RawMaterial />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vehicle-sales"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <VehicleSales />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/approvals"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <Approvals />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <Users />
                    </ProtectedRoute>
                }
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default AppRoutes;