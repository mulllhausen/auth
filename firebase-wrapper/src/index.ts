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
    debugger;
    const emailAddress: string = (
        _firebaseService._document.querySelector(
            "input.email",
        ) as HTMLInputElement
    )?.value;
    if (emailAddress == null || emailAddress.trim() === "") {
        guiLogger.log({ logMessage: "Email is undefined. Unable to sign in." });
        return;
    }

    const useLinkInsteadOfPassword: boolean = (
        _firebaseService._document.querySelector(
            "input.no-password",
        ) as HTMLInputElement
    )?.checked;

    const password: string = (
        _firebaseService._document.querySelector(
            "input.password",
        ) as HTMLInputElement
    )?.value;
    if (
        !useLinkInsteadOfPassword &&
        (password == null || password.trim() === "")
    ) {
        guiLogger.log({
            logMessage: "Password is undefined. Unable to sign in.",
        });
        return;
    }

    await _firebaseService
        .SetupForEmailSign(emailAddress, useLinkInsteadOfPassword, password)
        .Signin(authProviders.Email);
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
