import { createRoot } from "react-dom/client";
import { NoisePalette } from "./NoisePalette";

const container = document.getElementById("app");
const root = createRoot(container)
root.render(<NoisePalette />);
   
