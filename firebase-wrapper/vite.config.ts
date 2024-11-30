import { defineConfig } from "vite";
import { env } from "./src/dotenv";

export default defineConfig({
    base: env.BASE_PATH,
    server: {
        port: 3000, // Set your preferred development server port
    },
    build: {
        outDir: "dist", // Customize your output directory if needed
    },
});
