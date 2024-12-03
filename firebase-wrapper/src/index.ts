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

const localStorageLogstreamKey = "logstream";
const htmlTemplateManager = new HTMLTemplateManager(document);

const wrapperSettings: WrapperSettings = {
    logger: log2GUI,
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

function initLogstream() {
    const savedLogstreamJSON: string | null = localStorage.getItem(
        localStorageLogstreamKey,
    );
    if (savedLogstreamJSON == null) return;

    const savedLogstreamItems = JSON.parse(savedLogstreamJSON) as LogItem[];
    const fromLocalStorage = true;
    for (const logItem of savedLogstreamItems) {
        log2GUI(logItem.logAction, logItem.logData, fromLocalStorage);
    }
}

function log2GUI(
    logAction: string,
    logData: any,
    fromLocalStorage: boolean = false,
) {
    const logItem: HTMLElement =
        htmlTemplateManager.cloneTemplateSingle("windowLogItem");

    logItem.querySelector(".log-message")!.innerHTML = logAction;

    const logDatetime: string = getDate();
    logItem.querySelector(".log-datetime")!.innerHTML = logDatetime;

    if (logData != null) {
        logItem.querySelector(".log-data")!.innerHTML = JSON.stringify(
            logData,
            null,
            4,
        );
    }

    htmlTemplateManager.prepend(logItem, "windowLogContainer");

    if (!fromLocalStorage)
        saveLogToLocalStorage({ logAction, logData, logDatetime });

    console.log(logAction, logData);
}

function getDate(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

interface LogItem {
    logAction: string;
    logData: any;
    logDatetime: string;
}

function saveLogToLocalStorage(logItem: LogItem): void {
    const savedLogstreamJSON: string | null = localStorage.getItem(
        localStorageLogstreamKey,
    );
    if (savedLogstreamJSON == null) {
        localStorage.setItem(
            localStorageLogstreamKey,
            JSON.stringify([logItem]),
        );
        return;
    }
    const savedLogstreamItems = JSON.parse(savedLogstreamJSON);
    savedLogstreamItems.push(logItem);
    localStorage.setItem(
        localStorageLogstreamKey,
        JSON.stringify(savedLogstreamItems),
    );
}
