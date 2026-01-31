import { defineConfig } from "vite";
import { developmentEnv } from "./src/dotenv.development.ts";

// vite is only used for dev

export default defineConfig({
    base: developmentEnv.BASE_PATH, // prefix for all assets
    server: {
        port: developmentEnv.VITE_PORT, // localhost only
    },
    build: {
        outDir: "dist",
        rollupOptions: {
            output: {
                entryFileNames: "assets/[name].js", // no hash in filename
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name][extname]",
            },
        },
    },
});
