export interface ProcessEnv {
    BASE_PATH: string;
    FIREBASE_API_KEY: string;
    FIREBASE_AUTH_DOMAIN: string;
    FIREBASE_DB_URL: string;
    FIREBASE_PROJECT_ID: string;
    FIREBASE_STORAGE_BUCKET: string;
    FIREBASE_MESSAGING_SENDER_ID: string;
    FIREBASE_APP_ID: string;
    FIREBASE_MEASUREMENT_ID: string;
    PROJECT_DOMAIN: string;
    PROJECT_NAME: string;
}
export const env: ProcessEnv = {
    "BASE_PATH": "/firebase-wrapper/dist/",
    "FIREBASE_API_KEY": "AIzaSyB95EOVd6k5ItdhRVDKmPuAJ8zBwVXtKxc",
    "FIREBASE_AUTH_DOMAIN": "auth-94762.firebaseapp.com",
    "FIREBASE_DB_URL": "unused in this project",
    "FIREBASE_PROJECT_ID": "auth-94762",
    "FIREBASE_STORAGE_BUCKET": "unused in this project",
    "FIREBASE_MESSAGING_SENDER_ID": "190381967079",
    "FIREBASE_APP_ID": "1:190381967079:web:9436046b42e133ebf18442",
    "FIREBASE_MEASUREMENT_ID": "G-QZB6RJE8ZS",
    "PROJECT_DOMAIN": "auth.null.place",
    "PROJECT_NAME": "Auth Test"
};
