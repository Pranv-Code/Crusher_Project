import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./css/global.css";
// import "./css/table.css";

// Disable wheel events on number inputs globally to prevent accidental changes on scroll
document.addEventListener("wheel", function (e) {
  if (document.activeElement && document.activeElement.type === "number") {
    document.activeElement.blur();
  }
});

// Disable arrow keys (ArrowUp, ArrowDown) on all number inputs globally
document.addEventListener("keydown", function (e) {
  if ((e.key === "ArrowUp" || e.key === "ArrowDown") && document.activeElement && document.activeElement.type === "number") {
    e.preventDefault();
  }
}, { capture: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);