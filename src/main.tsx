import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/800.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);

// Lazy load secondary fonts for template engine to avoid blocking initial render
setTimeout(() => {
  import("@fontsource/baloo-2/700.css");
  import("@fontsource/pacifico/index.css");
  import("@fontsource/quicksand/600.css");
  import("@fontsource/comfortaa/700.css");
  import("@fontsource/caveat/700.css");
}, 1000);

// DEV-only: expose & auto-seed dummy data when the DB is empty.
if (import.meta.env.DEV) {
  import("./dev/seedDummy").then(({ seedDummyData, clearDummy }) => {
    (window as unknown as Record<string, unknown>).seedDummy = seedDummyData;
    (window as unknown as Record<string, unknown>).clearDummy = clearDummy;
    seedDummyData();
  });
}
