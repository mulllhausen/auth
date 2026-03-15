import type { TAuthProvider } from "../firebase-wrapper.ts";

const alphaNumeric = "[a-zA-Z0-9_-]+";
const queryParam = `${alphaNumeric}=${alphaNumeric}`;
const defaultQuerystring = `\\?${queryParam}(&${queryParam})*`;

export const facebookProfilePicRegex = buildURLRegex({
    domain: "platform-lookaside.fbsbx.com",
    path: "platform/profilepic",
});

export const githubProfilePicRegex = buildURLRegex({
    domain: "avatars.githubusercontent.com",
    path: "u/\\d+",
});

export const googleProfilePicRegex = buildURLRegex({
    domain: "lh3.googleusercontent.com",
    path: `a/${alphaNumeric}`,
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
            regex = googleProfilePicRegex;
            break;
        case "github.com":
            regex = githubProfilePicRegex;
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
    } else {
        queryParamsPattern = `(${defaultQuerystring})?`;
    }

    return new RegExp(`^${domain}${path}\/?${queryParamsPattern}$`);
}
