import { env } from "./dotenv";
import {
    authProviders,
    defaultAction,
    FirebaseAuthService,
    UserPlus,
    WrapperSettings,
} from "./firebase-wrapper";
import { GUILogger, LogItem } from "./gui-logger";
import { HTMLTemplateManager } from "./html-template-manager";
import "./index.css";

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
    signedInCallback: signedInCallback,
    signedOutCallback: signedOutCallback,
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
    reenterEmailAddressCallback: reenterEmailAddressCallback,
    clearEmailAfterSignInCallback: clearEmailAfterSignInCallback,
};

const firebaseAuthService = new FirebaseAuthService({
    env,
    settings: wrapperSettings,
});

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
): void {
    const emailInput = document.querySelector(
        "input.email",
    ) as HTMLInputElement;
    emailInput.value = "";
}
