import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

// Register service worker for offline support
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
