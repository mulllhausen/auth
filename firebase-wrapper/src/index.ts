import { env } from "./dotenv";
import {
    authProviders,
    defaultAction,
    FirebaseAuthService,
    UserPlus,
    WrapperSettings,
} from "./firebase-wrapper";
import { emailSignInActions, emailSignInStates } from "./fsm-email";
import { GUILogger, LogItem } from "./gui-logger";
import { HTMLTemplateManager } from "./html-template-manager";
import "./index.css";
import { SVGService } from "./svg-service";

const htmlTemplateManager = new HTMLTemplateManager(document);
const guiLogger = new GUILogger({
    _window: window,
    htmlTemplateManager,
    cleaLogStreamButtonCSS: "button#clearLogstream",
    logContainerCSS: "#windowLogContainer",
    logItemCSS: "#windowLogItem",
})
    .initEvents()
    .initGUIFromLocalStorage();

const wrapperSettings: WrapperSettings = {
    logger: guiLogger.log.bind(guiLogger),
    loginButtonCSSClass: "button.login",
    clearCachedUserButtonCSSClass: "button#clearCachedUser",
    signedInCallback,
    signedOutCallback,
    authProviderSettings: {
        [authProviders.Google]: {
            loginButtonClicked: defaultAction,
        },
        [authProviders.Facebook]: {
            loginButtonClicked: defaultAction,
        },
        [authProviders.GitHub]: {
            loginButtonClicked: defaultAction,
        },
        [authProviders.Email]: {
            loginButtonClicked: (self: FirebaseAuthService, e: MouseEvent) =>
                handleEmailLogin(self, e),
        },
    },
    reenterEmailAddressCallback,
    clearEmailAfterSignInCallback,
    emailStateChangedCallback,
    emailActionCallback,
};

const firebaseAuthService = new FirebaseAuthService({
    env,
    settings: wrapperSettings,
});

const emailFSMSVGService = new SVGService("email svg class");

document.addEventListener("DOMContentLoaded", () => {
    populateEmailInput(firebaseAuthService.EmailAddress);
});

// callback functions

function populateEmailInput(emailAddress: string | null): void {
    const emailInput = document.querySelector(
        "input.email",
    ) as HTMLInputElement;
    if (emailInput == null || emailAddress == null) {
        return;
    }
    emailInput.value = emailAddress;
}

async function handleEmailLogin(
    _firebaseService: FirebaseAuthService,
    e: MouseEvent,
): Promise<void> {
    // user-flow logic to get email and password
    _firebaseService.EmailAddress = (
        document.querySelector("input.email") as HTMLInputElement
    )?.value;

    _firebaseService.UseLinkInsteadOfPassword =
        (document.querySelector("input.no-password") as HTMLInputElement)
            ?.checked ?? console.error(`Password checkbox not found`);

    _firebaseService.EmailPassword = (
        document.querySelector("input.password") as HTMLInputElement
    )?.value;

    // back to the wrapper to handle the sign-in logic
    await _firebaseService.Signin(authProviders.Email);
}

function signedInCallback(user: UserPlus) {
    if (user.photoURL != null && user.photoURL !== "") {
        const logItem: LogItem = {
            logMessage: "image detected",
            imageURL: user.photoURL,
        };
        guiLogger.log(logItem);
    }
    console.log("Signed in");
}

function signedOutCallback() {
    console.log("Signed out");
}

function buttonClickCallback() {
    console.log("Signed in");
}

/** email sign-in step 5/9 */
function reenterEmailAddressCallback(_firebaseService: FirebaseAuthService) {
    // redefine the email login button click event
    _firebaseService.Settings.authProviderSettings[
        authProviders.Email
    ].loginButtonClicked = (self: FirebaseAuthService, e: MouseEvent) =>
        emailAddressReentered(self, e);
}

/** email sign-in step 6/9 */
async function emailAddressReentered(
    _firebaseService: FirebaseAuthService,
    e: MouseEvent,
): Promise<void> {
    _firebaseService.EmailAddress = (
        document.querySelector("input.email") as HTMLInputElement
    )?.value;
    await _firebaseService.Signin(authProviders.Email);
}

/** email sign-in step 8/9 */
function clearEmailAfterSignInCallback(
    _firebaseService: FirebaseAuthService,
): boolean {
    const emailInput = document.querySelector(
        "input.email",
    ) as HTMLInputElement;
    emailInput.value = "";
    return true;
}

function emailStateChangedCallback(
    newEmailState: keyof typeof emailSignInStates,
    //action: keyof typeof emailSignInActions | null,
): void {
    emailFSMSVGService.SetElementsInactive(".state-box"); // clear all
    switch (newEmailState) {
        case emailSignInStates.Idle:
            emailFSMSVGService.SetElementsActive(".state-box.idle");
            break;
        case emailSignInStates.WaitingForUserToClickLinkInEmail:
            emailFSMSVGService.SetElementsActive(
                ".state-box.waiting-for-user-to-click-link-in-email",
            );
            break;
        case emailSignInStates.BadEmailAddress:
            emailFSMSVGService.SetElementsActive(
                ".state-box.bad-email-address",
            );
            break;
    }

    // <path class="state-box authorising-via-firebase"
    // <path class="state-box idle"
    // <path class="state-box email-submitted-to-firebase"
    // <path class="state-box sign-in-link-opened-on-same-browser"
    // <path class="state-box sign-in-link-opened-on-different-browser"
    // <path class="state-box signed-in"
    // <path class="state-box waiting-for-email-address-in-gui"
    // <path class="state-box bad-email-address"
    // <path class="state-box waiting-for-user-to-click-link-in-email"
}

function emailActionCallback(action: keyof typeof emailSignInActions): void {
    emailFSMSVGService.SetElementsInactive(".arrow"); // clear all
    switch (action) {
        case emailSignInActions.DifferentEmailAddressEntered:
            emailFSMSVGService.SetElementsActive(
                ".arrow.different-email-address",
            );
            break;
        case emailSignInActions.UserInputsEmailAddressAndClicksSignInButton:
            emailFSMSVGService.SetElementsActive(
                ".arrow.user-changes-email-address-and" +
                    "-clicks-sign-in-with-email-button",
            );
            break;
    }
    // class="arrow user-inputs-email"
    // class="arrow user-clicks-link-in-email1"
    // class="arrow user-clicks-link-in-email2"
    // class="arrow automatically-submit-to-firebase"
    // class="arrow request-email-address-from-user-again"
    // class="arrow firebase-returns-an-error"
    // class="arrow user-changes-email-address-and-clicks-sign-in-with-email-button"
    // class="arrow ok-response1"
    // class="arrow ok-response2"
    // class="arrow same-email-address"
    // class="arrow different-email-address"
}
