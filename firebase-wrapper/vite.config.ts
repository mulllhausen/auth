import { defineConfig } from "vite";
import { env } from "./src/dotenv";

export default defineConfig({
    base: env.BASE_PATH,
    server: {
        port: 3000, // localhost only
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
