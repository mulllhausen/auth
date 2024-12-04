import { GUILogger } from "./gui-logger";
import "./index.css";
import { User } from "firebase/auth";
import {
    AuthProviders,
    FirebaseAuthService,
    WrapperSettings,
    defaultAction,
} from "./firebase-wrapper";
import { env } from "./dotenv";
import { HTMLTemplateManager } from "./html-template-manager";
import { log } from "console";

const htmlTemplateManager = new HTMLTemplateManager(document);
const guiLogger = new GUILogger(
    document,
    htmlTemplateManager,
    "button#clearLogstream",
    "#windowLogContainer",
    "#windowLogItem",
);
guiLogger.initEvents();

const wrapperSettings: WrapperSettings = {
    logger: guiLogger.log.bind(guiLogger), // bind preserves `this` within GUILogger
    loginButtonCssClass: "button.login",
    signedInCallback: signedInCallback,
    signedOutCallback: signedOutCallback,
    authProviderSettings: {
        [AuthProviders.Google]: {
            loginButtonClicked: defaultAction,
        },
        [AuthProviders.Facebook]: {
            loginButtonClicked: defaultAction,
        },
        [AuthProviders.Email]: {
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
    const email: string = (
        _firebaseService._document.querySelector(
            "input.email",
        ) as HTMLInputElement
    )?.value;
    if (email == null || email.trim() === "") {
        console.error("Email is undefined");
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
        console.error("Password is undefined");
        return;
    }

    _firebaseService
        .SetupForEmailSign(email, useLinkInsteadOfPassword, password)
        .Signin(AuthProviders.Email);
}

function signedInCallback(user: User) {
    console.log("Signed in");
}
function signedOutCallback() {
    console.log("Signed out");
}
function buttonClickCallback() {
    console.log("Signed in");
}
