import { jest } from "@jest/globals";
import { mock } from "jest-mock-extended";
import { env } from "../src/dotenv";
import {
    // authProviders,
    defaultAction,
    FirebaseAuthService,
    WrapperSettings,
} from "../src/firebase-wrapper";

export const setupFirebaseMock = (params: {
    loginButtonCSSClass: string;
    clearCachedUserButtonCSSClass: string;
}): FirebaseAuthService => {
    const wrapperSettings = mock<WrapperSettings>();
    wrapperSettings.loginButtonCSSClass = "button.login";
    wrapperSettings.clearCachedUserButtonCSSClass = "button#clearCachedUser";
    wrapperSettings.authProviderSettings[
        "google.com" /*authProviders.Google*/
    ] = {
        loginButtonClicked: defaultAction,
    };
    wrapperSettings.authProviderSettings[
        "facebook.com" /*authProviders.Facebook*/
    ] = {
        loginButtonClicked: defaultAction,
    };
    wrapperSettings.authProviderSettings[
        "github.com" /*authProviders.GitHub*/
    ] = {
        loginButtonClicked: defaultAction,
    };
    wrapperSettings.authProviderSettings["password" /*authProviders.Email*/] = {
        loginButtonClicked: jest.fn(
            async (self: FirebaseAuthService, e: MouseEvent) => {},
        ),
        //handleEmailLogin(self, e),
    };

    const firebaseAuthService = new FirebaseAuthService({
        env, // use real, not mock
        settings: wrapperSettings,
    });
    return firebaseAuthService;
};
