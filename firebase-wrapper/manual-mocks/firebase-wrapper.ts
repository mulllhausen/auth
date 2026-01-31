import { mock } from "jest-mock-extended";
import type { TWrapperSettings } from "../src/firebase-wrapper";
import {
    authProviders,
    defaultAction,
    FirebaseAuthService,
} from "../src/firebase-wrapper";
import { getEnv } from "../src/utils.ts";

// note: returns a concrete instance of FirebaseAuthService, not a mock
// however the internal settings are mocked

export const setupFirebaseAuthService = (params: {
    loginButtonCSSClass: string;
    clearCachedUserButtonCSSClass: string;
    mockEmailAddress: string;
    mockUseLinkInsteadOfPassword: boolean;
    mockEmailPassword: string;
}): FirebaseAuthService => {
    const wrapperSettings = mock<TWrapperSettings>();
    wrapperSettings.loginButtonCSSClass = "button.login";

    // note: these provider strings are the mock values - not the static values
    // defined by the firebase auth library. eg. mousing over authProviders.Google
    // gives a different value to googleProvider.
    const googleProvider = authProviders.Google;
    wrapperSettings.authProviderSettings[authProviders.Google] = {
        loginButtonClicked: defaultAction,
    };
    const facebookProvider = authProviders.Facebook;
    wrapperSettings.authProviderSettings[authProviders.Facebook] = {
        loginButtonClicked: defaultAction,
    };
    const githubProvider = authProviders.GitHub;
    wrapperSettings.authProviderSettings[authProviders.GitHub] = {
        loginButtonClicked: defaultAction,
    };
    const emailProvider = authProviders.Email;
    wrapperSettings.authProviderSettings[emailProvider] = {
        loginButtonClicked: async (
            self: FirebaseAuthService,
            e: MouseEvent,
        ) => {
            // normally these come from the gui
            self.EmailAddress = params.mockEmailAddress;
            self.UseLinkInsteadOfPassword = params.mockUseLinkInsteadOfPassword;
            self.EmailPassword = params.mockEmailPassword;
        },
    };

    const firebaseAuthService = new FirebaseAuthService({
        window, // todo: mock
        env: getEnv(), // use real, not mock
        settings: wrapperSettings,
    });
    return firebaseAuthService;
};
