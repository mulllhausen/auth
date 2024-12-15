import { GUILogger, LogItem } from "./gui-logger";
import "./index.css";
import { User } from "firebase/auth";
import {
    authProviders,
    FirebaseAuthService,
    WrapperSettings,
    defaultAction,
} from "./firebase-wrapper";
import { env } from "./dotenv";
import { HTMLTemplateManager } from "./html-template-manager";

const htmlTemplateManager = new HTMLTemplateManager(document);
const guiLogger = new GUILogger(
    document,
    window,
    htmlTemplateManager,
    "button#clearLogstream",
    "#windowLogContainer",
    "#windowLogItem",
)
    .initEvents()
    .initGUIFromLocalStorage();

const wrapperSettings: WrapperSettings = {
    logger: guiLogger.log.bind(guiLogger), // bind preserves `this` within GUILogger
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
};

const firebaseAuthService = new FirebaseAuthService(
    window,
    env,
    wrapperSettings,
);

// functions

async function handleEmailLogin(
    _firebaseService: FirebaseAuthService,
    e: MouseEvent,
): Promise<void> {
    // user-flow logic to obtain email and password
    _firebaseService.EmailAddress = (
        _firebaseService._document.querySelector(
            "input.email",
        ) as HTMLInputElement
    )?.value;
    if (
        _firebaseService.EmailAddress == null ||
        _firebaseService.EmailAddress.trim() === ""
    ) {
        guiLogger.log({ logMessage: "No email address - unable to sign in." });
        return;
    }

    _firebaseService.UseLinkInsteadOfPassword =
        (
            _firebaseService._document.querySelector(
                "input.no-password",
            ) as HTMLInputElement
        )?.checked ?? console.log(`Password checkbox not found`);

    _firebaseService.EmailPassword = (
        _firebaseService._document.querySelector(
            "input.password",
        ) as HTMLInputElement
    )?.value;
    if (
        !_firebaseService.UseLinkInsteadOfPassword &&
        (_firebaseService.EmailPassword == null ||
            _firebaseService.EmailPassword.trim() === "")
    ) {
        guiLogger.log({
            logMessage: "Password is undefined. Unable to sign in.",
        });
        return;
    }

    // back to the wrapper to handle the sign-in logic
    await _firebaseService.Signin(authProviders.Email);
}

function signedInCallback(user: User) {
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
