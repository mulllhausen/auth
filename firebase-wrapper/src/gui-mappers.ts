import { authProviders, TAuthProvider } from "./firebase-wrapper";

export type TGUIAuthProviderNames =
    (typeof authProviderToGUINameMap)[TAuthProvider];

export const authProviderToGUINameMap = {
    [authProviders.Email]: "email",
    [authProviders.Facebook]: "facebook",
    [authProviders.GitHub]: "github",
    [authProviders.Google]: "google",
} as const;

export function mapAuthProviderToNavTabElement(
    authProvider: TAuthProvider,
): HTMLAnchorElement {
    const guiName = authProviderToGUINameMap[authProvider];
    const el = document.querySelector<HTMLAnchorElement>(
        `nav.tabs a[data-tab="tab-${guiName}-fsm"]`,
    );
    if (el == null) {
        throw new Error(`unable to find tab for auth provider ${guiName}`);
    }
    return el;
}
