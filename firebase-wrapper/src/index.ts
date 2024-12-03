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
const localStorageLogstreamKey = "logstream";
const colors: string[] = [
    "#c6edff", // blue
    "#ffd8d8", // red
    "#d9ffd8", // green
    "#e9d8ff", // purple
    "#ffe7d8", // orange
    "#faffd8", // yellow
    "#ffd8ff", // pink
    "#ba9d93", // brown
];
const thisSessionColor = getRandomLogstreamColor();
initLogstream();
document
    .querySelector("button#clearLogstream")
    ?.addEventListener("click", clearLogstream);

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
        log2GUI(
            logItem.logAction,
            logItem.logData,
            logItem.logDateTime,
            logItem.color,
            fromLocalStorage,
        );
    }
}

function clearLogstream(e: Event) {
    localStorage.removeItem(localStorageLogstreamKey);
    document.querySelector("#windowLogContainer")!.innerHTML = "";
}

function log2GUI(
    logAction: string,
    logData: any,
    logDateTime: string | null = null,
    color: string | null = null,
    fromLocalStorage: boolean = false,
) {
    const logItem: HTMLElement =
        htmlTemplateManager.cloneTemplateSingle("windowLogItem");

    if (color == null) {
        color = thisSessionColor;
    }
    logItem.style.backgroundColor = color;
    logItem.querySelector(".log-message")!.innerHTML = logAction;

    if (logDateTime == null) {
        logDateTime = getDate();
    }
    logItem.querySelector(".log-datetime")!.innerHTML = logDateTime;

    if (logData != null) {
        logItem.querySelector(".log-data")!.innerHTML = JSON.stringify(
            logData,
            null,
            4,
        );
    }

    htmlTemplateManager.prepend(logItem, "windowLogContainer");

    if (!fromLocalStorage)
        saveLogToLocalStorage({
            logAction,
            logData,
            color,
            logDateTime: logDateTime,
        });

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
    color: string;
    logDateTime: string;
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

function getRandomLogstreamColor(): string {
    return colors[Math.floor(Math.random() * colors.length)];
}
