import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 3000, // Set your preferred development server port
    },
    build: {
        outDir: "dist", // Customize your output directory if needed
    },
});
