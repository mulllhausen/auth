import { TProcessEnv } from "./dotenv.base";

export const devEnv: Partial<TProcessEnv> = {
    BASE_PATH: "/",
    FIREBASE_STATIC_FILES_PATH: "/",
    FIREBASE_API_KEY: "AIzaSyB95EOVd6k5ItdhRVDKmPuAJ8zBwVXtKxc",
    FIREBASE_AUTH_DOMAIN: "something.firebaseapp.com",
    FIREBASE_DB_URL: "unused in this project",
    FIREBASE_PROJECT_ID: "auth-94762",
    FIREBASE_STORAGE_BUCKET: "unused in this project",
    FIREBASE_MESSAGING_SENDER_ID: "190381967079",
    FIREBASE_APP_ID: "1:190381967079:web:9436046b42e133ebf18442",
    FIREBASE_MEASUREMENT_ID: "G-QZB6RJE8ZS",
    FIREBASE_LINK_ACCOUNTS: false,
    PROJECT_DOMAIN: "something.ngrok-free.app",
    PROJECT_NAME: "Auth Test",
    NGROK_DEV_TUNNEL_NAME: "must match your ngrok tunnel name",
    VITE_PORT: 3000,
};
