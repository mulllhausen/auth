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
import {
    emailSignInActions,
    EmailSignInFSM,
    EmailSignInState,
} from "./state-machine-email";
import { SVGService } from "./svg-service";

const emailFSMSVGService = new SVGService("#emailLinkFSMChart");

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
    //emailStateChangedCallback,
    emailActionCallback,
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
): boolean {
    const emailInput = document.querySelector(
        "input.email",
    ) as HTMLInputElement;
    emailInput.value = "";
    return true;
}

enum stateStatus {
    success = "success",
    failure = "failure",
}

function emailStateChangedCallback(
    newEmailState: typeof EmailSignInState,
    emailStateStatus: stateStatus,
): void {
    debugger;
    // clear all
    emailFSMSVGService.UnsetElementStatus(".state-box", stateStatus.failure);
    emailFSMSVGService.UnsetElementStatus(".state-box", stateStatus.success);

    const emailStateToCSSClassMappings: Record<string, string> = {
        [EmailSignInFSM.Idle.name]: "idle",
        [EmailSignInFSM.SubmittingEmailToFirebase.name]:
            "email-submitted-to-firebase",
        [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name]:
            "waiting-for-user-to-click-link-in-email",
        [EmailSignInFSM.BadEmailAddress.name]: "bad-email-address",
        [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name]:
            "waiting-for-email-address-in-gui",
        [EmailSignInFSM.LinkOpenedOnSameBrowser.name]:
            "waiting-for-email-address-in-gui",
        [EmailSignInFSM.WaitingForEmailAddressInGUI.name]:
            "waiting-for-email-address-in-gui",
        [EmailSignInFSM.AuthorisingViaFirebase.name]:
            "authorising-via-firebase",
        [EmailSignInFSM.SignedIn.name]: "signed-in",
    };
    const newEmailStateStr: string = newEmailState.name;
    if (!emailStateToCSSClassMappings.hasOwnProperty(newEmailStateStr)) {
        throw new Error(
            `emailStateChangedCallback: ${newEmailStateStr} ` +
                `not found in emailStateToCSSClassMappings`,
        );
    }

    const emailStateCSSClass: string =
        emailStateToCSSClassMappings[newEmailStateStr];

    emailFSMSVGService.SetElementStatus(
        `.state-box.${emailStateCSSClass}`,
        emailStateStatus,
    );
}

function emailActionCallback(
    oldEmailState: typeof EmailSignInState | null,
    action: keyof typeof emailSignInActions | null,
    newEmailState: typeof EmailSignInState,
): void {
    // when successful, the new state will always be different to the old state
    const emailStateStatus =
        oldEmailState === newEmailState
            ? stateStatus.failure
            : stateStatus.success;

    emailStateChangedCallback(newEmailState, emailStateStatus);

    // clear all
    emailFSMSVGService.UnsetElementStatus(".arrow", stateStatus.failure);
    emailFSMSVGService.UnsetElementStatus(".arrow", stateStatus.success);

    if (action === null || oldEmailState === null) {
        return;
    }

    const emailStateToCSSClassMappings: Record<string, string> = {
        [EmailSignInFSM.Idle.name +
        emailSignInActions.UserInputsEmailAddressAndClicksSignInButton]:
            "user-inputs-email",
        [EmailSignInFSM.SubmittingEmailToFirebase.name +
        emailSignInActions.DifferentEmailAddressEntered]:
            "different-email-address",
        [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name +
        emailSignInActions.CheckIfURLIsASignInWithEmailLink]: "ok-response1",
        [EmailSignInFSM.BadEmailAddress.name +
        emailSignInActions.FirebaseOKResponse]:
            "user-changes-email-address-and-clicks-sign-in-with-email-button",
        [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
        emailSignInActions.FirebaseErrorResponse]:
            "request-email-address-from-user-again",
        [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
        emailSignInActions.validateEmailDataBeforeSignIn]: "off",
        [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
        emailSignInActions.urlIsASignInWithEmailLink]: "off",
        [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
        emailSignInActions.continuingOnSameBrowser]: "off",
    };
    //const emailActionStr: string = `${oldEmailState.constructor.name}${action}`;
    const emailActionStr: string = `${oldEmailState.name}${action}`;
    if (!emailStateToCSSClassMappings.hasOwnProperty(emailActionStr)) {
        throw new Error(
            `emailActionCallback: ${emailActionStr} ` +
                `not found in emailStateToCSSClassMappings`,
        );
    }

    const emailStateCSSClass: string =
        emailStateToCSSClassMappings[emailActionStr];

    emailFSMSVGService.SetElementStatus(
        `.arrow.${emailStateCSSClass}`,
        emailStateStatus,
    );
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

// to be able to update the actions in the svg we need to know
// the previous state and the new state as well as the action that took us there.
// the new state requires logic to be determined from the current state and the action.
// an action will always result in a state-update
