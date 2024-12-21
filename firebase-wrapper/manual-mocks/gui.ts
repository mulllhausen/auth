//import { authProviders } from "../src/firebase-wrapper";
import {
    DocumentQuerySelectorMockReturnType,
    setupDocumentQuerySelectorMock,
} from "./document-querySelector";
import {
    DocumentQuerySelectorAllMockReturnType,
    setupDocumentQuerySelectorAllMock,
} from "./document-querySelectorAll";

// mock all the necessary HTML elements

export const setupGUIMock = (params: {
    clearCachedUserButtonCSSClass: string;
    inputEmailCSSClass: string;
    inputNoPasswordCSSClass: string;
    inputPasswordCSSClass: string;
}): {
    querySelectorMock: DocumentQuerySelectorMockReturnType;
    querySelectorAllMock: DocumentQuerySelectorAllMockReturnType;
} => {
    // email inputs
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = "true";
    const querySelectorMock: DocumentQuerySelectorMockReturnType =
        setupDocumentQuerySelectorMock({
            [params.clearCachedUserButtonCSSClass]:
                document.createElement("button"),
            [params.inputEmailCSSClass]: document.createElement("input"),
            [params.inputNoPasswordCSSClass]: checkbox,
            [params.inputPasswordCSSClass]: document.createElement("input"),
        });

    // service provider buttons
    const facebookLoginButton = document.createElement("button");
    facebookLoginButton.dataset.serviceProvider = "facebook.com"; //authProviders.Facebook;

    const googleLoginButton = document.createElement("button");
    googleLoginButton.dataset.serviceProvider = "google.com"; //authProviders.Google;

    const githubLoginButton = document.createElement("button");
    githubLoginButton.dataset.serviceProvider = "github.com"; //authProviders.GitHub;

    const emailLoginButton = document.createElement("button");
    emailLoginButton.dataset.serviceProvider = "password"; //authProviders.Email;

    const querySelectorAllMock: DocumentQuerySelectorAllMockReturnType =
        setupDocumentQuerySelectorAllMock({
            "button.login": [
                facebookLoginButton,
                googleLoginButton,
                githubLoginButton,
                emailLoginButton,
            ],
        });

    return { querySelectorMock, querySelectorAllMock };
};
