import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import { ViewModeProvider } from "./lib/viewMode.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <ViewModeProvider>
        <App />
      </ViewModeProvider>
    </AuthProvider>
  </BrowserRouter>
);
