import { authProviders } from "../src/firebase-wrapper";

// default values can be overwritten in tests if needed
export const defaultHappyPath = {
    loginButtonCSSClass: "button.login",
    clearCachedUserButtonCSSClass: "button#clearCachedUser",
    inputEmailCSSClass: "input.email",
    inputNoPasswordCSSClass: "input.no-password",
    inputPasswordCSSClass: "input.password",
    emailButtonQuerySelector: `button[data-service-provider="${authProviders.Email}"]`,
    facebookButtonQuerySelector: `button[data-service-provider="${authProviders.Facebook}"]`,
    googleButtonQuerySelector: `button[data-service-provider="${authProviders.Google}"]`,
    githubButtonQuerySelector: `button[data-service-provider="${authProviders.GitHub}"]`,
};
