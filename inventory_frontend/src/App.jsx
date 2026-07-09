import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { InventoryProvider } from "./context/InventoryContext";

function App() {
  return (
    <BrowserRouter>
      <InventoryProvider>
        <AppRoutes />
      </InventoryProvider>
    </BrowserRouter>
  );
}

export default App;