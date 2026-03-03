import type { TAuthProvider } from "../firebase-wrapper.ts";

export function validateProfilePicUrl(
    providerID: TAuthProvider,
    url?: string | null,
): boolean {
    if (!url) return false;
    let regex: RegExp;
    switch (providerID) {
        case "facebook.com":
            regex = /https?:\/\/.*\.fbcdn\.net\/.*/;
            break;
        case "google.com":
            regex = /https?:\/\/.*\.googleusercontent\.com\/.*/;
            break;
        case "github.com":
            regex = /https?:\/\/.*\.githubusercontent\.com\/.*/;
            break;
        default:
            return false;
    }
    return regex.test(url);
}
