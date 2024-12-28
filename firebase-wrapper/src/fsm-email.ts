// finite state machine for email sign-in.
// event handlers live inside FirebaseAuthService.
// FirebaseAuthService calls the state machine which contains logic.

import { sendSignInLinkToEmail } from "firebase/auth";
import { FirebaseAuthService } from "./firebase-wrapper";
import { LogItem } from "./gui-logger";

export abstract class EmailSignInState {
    /** a reference back to the context */
    public firebaseAuthService!: FirebaseAuthService;
    public logger: ((logItem: LogItem) => void) | null = null;

    // constructor(
    //     firebaseAuthService: FirebaseAuthService,
    //     logger: (logItem: LogItem) => void,
    // ) {
    //     this.firebaseAuthService = firebaseAuthService;
    //     this.logger = logger;
    // }

    public abstract UserInputsEmailAddressAndClicksSignInButton(): Promise<void>;
    public abstract DifferentEmailAddressEntered(): void;
    public abstract CheckIfURLIsASignInWithEmailLink(): void;

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

    protected ValidateEmailDataBeforeSignIn(): boolean {
        const failMessage: string = "Unable to sign in with email.";
        if (
            this.firebaseAuthService.emailAddress == null ||
            this.firebaseAuthService.emailAddress?.trim() === ""
        ) {
            this.logger?.({
                logMessage: `No email address. ${failMessage}`,
            });
            return false;
        }
        if (this.firebaseAuthService.UseLinkInsteadOfPassword) {
            return true;
        }
        if (
            this.firebaseAuthService.EmailPassword == null ||
            this.firebaseAuthService.EmailPassword.trim() === ""
        ) {
            this.logger?.({
                logMessage: `Password is undefined. ${failMessage}`,
            });
            return false;
        }
        return true;
    }
}

export class EmailSignInIdle extends EmailSignInState {
    public async UserInputsEmailAddressAndClicksSignInButton(): Promise<void> {
        const currentMethod: EmailSignInStateMethodNames =
            emailSignInActions.UserInputsEmailAddressAndClicksSignInButton;

        if (!this.ValidateEmailDataBeforeSignIn()) {
            return; // remain in the idle state
        }
        try {
            debugger;
            await sendSignInLinkToEmail(
                this.firebaseAuthService.Auth,
                this.firebaseAuthService.emailAddress!,
                this.firebaseAuthService.EmailActionCodeSettings,
            );
            this.firebaseAuthService.SetEmailState(
                WaitingForUserToClickLinkInEmail,
            );
            this.logger?.({
                logMessage:
                    `a sign-in link has been sent to ` +
                    `${this.firebaseAuthService.EmailAddress}.`,
            });
        } catch (error) {
            this.firebaseAuthService.SetEmailState(
                WaitingForUserToClickLinkInEmail,
            );
            this.logger?.({
                logMessage: "error when sending email link",
                logData: error,
            });
            console.error("error when signing in by email", error);
        }
    }
    public DifferentEmailAddressEntered(): void {
        const currentMethod: EmailSignInStateMethodNames =
            emailSignInActions.DifferentEmailAddressEntered;
    }
    public CheckIfURLIsASignInWithEmailLink(): void {}
}

export class WaitingForUserToClickLinkInEmail extends EmailSignInState {
    public async UserInputsEmailAddressAndClicksSignInButton(): Promise<void> {
        const currentMethod: EmailSignInStateMethodNames =
            emailSignInActions.UserInputsEmailAddressAndClicksSignInButton;

        // i guess the user forgot about the email that was sent to them by firebase
        // and will start again?
        this.firebaseAuthService.SetEmailState(EmailSignInIdle);
        this.logger?.({
            logMessage: "waiting for user to click link in email.",
        });
    }
    public DifferentEmailAddressEntered(): void {}
    public CheckIfURLIsASignInWithEmailLink(): void {}
}

export class BadEmailAddress extends EmailSignInState {
    public async UserInputsEmailAddressAndClicksSignInButton(): Promise<void> {
        this.firebaseAuthService.SetEmailState(EmailSignInIdle);
        this.logger?.({
            logMessage: "bad email address entered.",
        });
    }
    public DifferentEmailAddressEntered(): void {}
    public CheckIfURLIsASignInWithEmailLink(): void {}
}

export const emailSignInStates = {
    Idle: EmailSignInIdle.name,
    WaitingForUserToClickLinkInEmail: WaitingForUserToClickLinkInEmail.name,
    BadEmailAddress: BadEmailAddress.name,
} as const;

type MethodNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => void ? K : never;
}[keyof T];

type EmailSignInStateMethodNames = MethodNames<EmailSignInState>;

export const emailSignInActions: Record<
    EmailSignInStateMethodNames,
    EmailSignInStateMethodNames
> = {
    UserInputsEmailAddressAndClicksSignInButton:
        "UserInputsEmailAddressAndClicksSignInButton",
    DifferentEmailAddressEntered: "DifferentEmailAddressEntered",
    CheckIfURLIsASignInWithEmailLink: "CheckIfURLIsASignInWithEmailLink",
};
