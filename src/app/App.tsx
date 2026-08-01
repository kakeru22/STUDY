import { AppProvider } from "../contexts/AppContext";
import { AppRoutes } from "./router";

export function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
