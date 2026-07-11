import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { InventoryProvider } from "./context/InventoryContext";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InventoryProvider>
          <AppRoutes />
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;