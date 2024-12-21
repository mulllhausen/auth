import { authProviders } from "../src/firebase-wrapper";
import { setupDocumentQuerySelectorMock } from "./document-querySelector";
import { setupDocumentQuerySelectorAllMock } from "./document-querySelectorAll";

// mock only the necessary HTML elements

export const setupGUIMock = (params: {
    clearCachedUserButtonCSSClass: string;
    inputEmailCSSClass: string;
    inputNoPasswordCSSClass: string;
    inputPasswordCSSClass: string;
    inputNoPasswordCheckboxIsChecked: boolean;
    emailButtonQuerySelector: string;
    facebookButtonQuerySelector: string;
    googleButtonQuerySelector: string;
    githubButtonQuerySelector: string;
}) => {
    // email inputs
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = params.inputNoPasswordCheckboxIsChecked;
    setupDocumentQuerySelectorMock({
        [params.clearCachedUserButtonCSSClass]:
            document.createElement("button"),
        [params.inputEmailCSSClass]: document.createElement("input"),
        [params.inputNoPasswordCSSClass]: checkbox,
        [params.inputPasswordCSSClass]: document.createElement("input"),
    });

    // service provider buttons
    const facebookLoginButton = document.createElement("button");
    facebookLoginButton.dataset.serviceProvider = authProviders.Facebook;

    const googleLoginButton = document.createElement("button");
    googleLoginButton.dataset.serviceProvider = authProviders.Google;

    const githubLoginButton = document.createElement("button");
    githubLoginButton.dataset.serviceProvider = authProviders.GitHub;

    const emailLoginButton = document.createElement("button");
    emailLoginButton.dataset.serviceProvider = authProviders.Email;

    setupDocumentQuerySelectorAllMock({
        "button.login": [
            facebookLoginButton,
            googleLoginButton,
            githubLoginButton,
            emailLoginButton,
        ],
    });
    setupDocumentQuerySelectorMock({
        [params.emailButtonQuerySelector]: emailLoginButton,
        [params.facebookButtonQuerySelector]: facebookLoginButton,
        [params.googleButtonQuerySelector]: googleLoginButton,
        [params.githubButtonQuerySelector]: githubLoginButton,
    });
};

export const clickButtonByQuerySelector = (selector: string): void => {
    const button = document.querySelector(selector) as HTMLButtonElement;
    if (button == null) {
        throw new Error(`button not found for selector: ${selector}`);
    }
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};
