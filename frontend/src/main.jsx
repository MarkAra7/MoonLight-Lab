import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "flowbite-react";
import { ThemeInit } from "../.flowbite-react/init.tsx";
import { moonlightTheme } from "@/theme/moonlightTheme";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={moonlightTheme}>
      <ThemeInit />
      <App />
    </ThemeProvider>
  </StrictMode>
);
