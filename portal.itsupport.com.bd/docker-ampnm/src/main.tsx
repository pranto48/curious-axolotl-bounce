import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Removed: import "./globals.css";

createRoot(document.getElementById("react-root")!).render(<App />);