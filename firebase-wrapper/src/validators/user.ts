import type { TAuthProvider } from "../firebase-wrapper.ts";

export const facebookProfilePicRegex = buildURLRegex({
    domain: "platform-lookaside.fbsbx.com",
    path: "platform/profilepic/",
    queryParams: {
        asid: /\d+/,
        height: /\d+/,
        width: /\d+/,
        ext: /\d+/,
        hash: /[a-zA-Z0-9_\/]+/,
    },
});

export function validateProfilePicUrl(
    providerID: TAuthProvider,
    url?: string | null,
): boolean {
    if (!url) return false;
    let regex: RegExp;
    switch (providerID) {
        case "facebook.com":
            regex = facebookProfilePicRegex;
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

function buildURLRegex(props: {
    domain: string;
    path?: string;
    queryParams?: Record<string, RegExp>;
}): RegExp {
    const escapedDomain = props.domain.replace(/\./g, "\\.");
    const domain = `https:\\/\\/${escapedDomain}\\/`;
    const path = props.path ?? "";

    let queryParamsPattern = "";
    if (props.queryParams) {
        // use lookaheads so order doesn't matter
        const lookaheads = Object.entries(props.queryParams)
            .map(([key, value]) => `(?=.*[?&]${key}=${value.source})`)
            .join("");

        const enforceOneQuestionMark = `(?=[^?]*\\?[^?]*)`;
        queryParamsPattern = enforceOneQuestionMark + lookaheads;
    }

    return new RegExp(`${domain}${path}${queryParamsPattern}`);
}
