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
import { ArrowCSSClass, StateBoxCSSClass } from "./svg-auto-types";
import { SVGCSSClassCategory, SVGService, SVGStateStatus } from "./svg-service";

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
    document
        .querySelector("button#enableAllSVGElements")
        ?.addEventListener("click", (event_: Event) => {
            const buttonEl = event_.target as HTMLButtonElement;
            let buttonState = buttonEl.dataset.state;
            const setStatus: SVGStateStatus = SVGStateStatus.Failure;
            switch (buttonState) {
                case "unset":
                    emailFSMSVGService.SetAllStatuses(
                        StateBoxCSSClass,
                        setStatus,
                    );
                    emailFSMSVGService.SetAllStatuses(ArrowCSSClass, setStatus);
                    buttonEl.innerText = "disable all SVG elements";
                    buttonEl.dataset.state = "set";
                    break;
                case "set":
                    emailFSMSVGService.UnsetStatus(
                        SVGCSSClassCategory.StateBox,
                        setStatus,
                    );
                    emailFSMSVGService.UnsetStatus(
                        SVGCSSClassCategory.Arrow,
                        setStatus,
                    );
                    buttonEl.innerText = "enable all SVG elements";
                    buttonEl.dataset.state = "unset";
                    break;
            }
        });
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
    newEmailState: EmailSignInState,
    emailStateStatus: SVGStateStatus,
): void {
    debugger;
    // clear all
    emailFSMSVGService.UnsetElementStatus(".state-box", SVGStateStatus.Failure);
    emailFSMSVGService.UnsetElementStatus(".state-box", SVGStateStatus.Success);

    const emailStateToCSSClassMappings: Record<string, string> = {
        [EmailSignInFSM.Idle.name]: StateBoxCSSClass.Idle0,

        [EmailSignInFSM.SubmittingEmailToFirebase.name]:
            StateBoxCSSClass.EmailSubmittedToFirebase0,

        [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name]:
            StateBoxCSSClass.WaitingForUserToClickLinkInEmail0,

        [EmailSignInFSM.BadEmailAddress.name]:
            StateBoxCSSClass.BadEmailAddress0,

        [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name]:
            StateBoxCSSClass.SignInLinkOpenedOnDifferentBrowser0,

        [EmailSignInFSM.LinkOpenedOnSameBrowser.name]:
            StateBoxCSSClass.SignInLinkOpenedOnSameBrowser0,

        [EmailSignInFSM.WaitingForEmailAddressInGUI.name]:
            StateBoxCSSClass.WaitingForEmailAddressInGui0,

        [EmailSignInFSM.AuthorisingViaFirebase.name]:
            StateBoxCSSClass.AuthorisingViaFirebase0,

        [EmailSignInFSM.SignedIn.name]: StateBoxCSSClass.SignedIn0,
    };
    const newEmailStateStr: string = newEmailState.Name;
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
    oldEmailState: EmailSignInState | null,
    action: keyof typeof emailSignInActions | null,
    newEmailState: EmailSignInState,
): void {
    // when successful, the new state will always be different to the old state
    const emailStateStatus =
        oldEmailState?.Name === newEmailState.Name
            ? SVGStateStatus.Failure
            : SVGStateStatus.Success;

    emailStateChangedCallback(newEmailState, emailStateStatus);

    // clear all
    emailFSMSVGService.UnsetElementStatus(".arrow", SVGStateStatus.Failure);
    emailFSMSVGService.UnsetElementStatus(".arrow", SVGStateStatus.Success);

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
    const emailActionStr: string = `${oldEmailState.constructor.name}${action}`;
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
