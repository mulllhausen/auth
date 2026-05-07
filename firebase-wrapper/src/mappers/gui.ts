import type { TAuthProvider } from "../firebase-wrapper.ts";
import { authProviders } from "../firebase-wrapper.ts";

export type TGUIAuthProviderNames =
    (typeof authProviderToGUINameMap)[TAuthProvider];

export const authProviderToGUINameMap: Record<TAuthProvider, string> = {
    [authProviders.Email]: "Email",
    [authProviders.Facebook]: "Facebook",
    [authProviders.Github]: "Github",
    [authProviders.Google]: "Google",
};

export function mapAuthProvider2NavTabElement(
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
