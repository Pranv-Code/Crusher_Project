import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { InventoryProvider } from "./context/InventoryContext";
import { AuthProvider } from "./context/AuthContext";
import CustomAlertModal from "./components/modal/CustomAlertModal";

function App() {
  return (
    <BrowserRouter>
      <CustomAlertModal />
      <AuthProvider>
        <InventoryProvider>
          <AppRoutes />
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;