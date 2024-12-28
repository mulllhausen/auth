// finite state machine for email sign-in.
// event handlers live inside FirebaseAuthService.
// FirebaseAuthService calls the state machine which contains logic.

import { isSignInWithEmailLink, sendSignInLinkToEmail } from "firebase/auth";
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

    public abstract UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState>;
    public abstract DifferentEmailAddressEntered(): EmailSignInState;
    public abstract CheckIfURLIsASignInWithEmailLink(): EmailSignInState;

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

    protected validateEmailDataBeforeSignIn(): boolean {
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

    protected urlIsASignInWithEmailLink(): boolean {
        const urlIsASignInWithEmailLink: boolean = isSignInWithEmailLink(
            this.firebaseAuthService.Auth,
            window.location.href,
        );
        const not = urlIsASignInWithEmailLink ? "" : "not";
        this.logger?.({
            logMessage:
                `just checked: the current page url is ${not} a ` +
                `sign-in-with-email-link`,
        });
        return urlIsASignInWithEmailLink;
    }

    protected continuingOnSameBrowser(): boolean {
        const sameBrowser: boolean =
            this.firebaseAuthService.emailAddress != null;
        const sameOrDifferent = sameBrowser ? "the same" : "a different";
        this.logger?.({
            logMessage: `the user has opened the email link on ${sameOrDifferent} browser.`,
        });
        return sameBrowser;
    }
}

export class EmailSignInIdle extends EmailSignInState {
    public async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {
        debugger;
        const currentMethod: EmailSignInStateMethodNames =
            emailSignInActions.UserInputsEmailAddressAndClicksSignInButton;

        if (!this.validateEmailDataBeforeSignIn()) {
            return new EmailSignInIdle(); // remain in the idle state
        }
        try {
            await sendSignInLinkToEmail(
                this.firebaseAuthService.Auth,
                this.firebaseAuthService.emailAddress!,
                this.firebaseAuthService.EmailActionCodeSettings,
            );
            // this.firebaseAuthService.SetEmailState(
            //     EmailSignInWaitingForUserToClickLinkInEmail,
            // );
            this.logger?.({
                logMessage:
                    `a sign-in link has been sent to ` +
                    `${this.firebaseAuthService.EmailAddress}.`,
            });
            return new EmailSignInWaitingForUserToClickLinkInEmail();
        } catch (error) {
            // this.firebaseAuthService.SetEmailState(
            //     EmailSignInWaitingForUserToClickLinkInEmail,
            // );
            this.logger?.({
                logMessage: "error when sending email link",
                logData: error,
            });
            console.error("error when signing in by email", error);
            return new EmailSignInWaitingForUserToClickLinkInEmail();
        }
    }

    public DifferentEmailAddressEntered(): EmailSignInState {
        debugger;
        const currentMethod: EmailSignInStateMethodNames =
            emailSignInActions.DifferentEmailAddressEntered;
    }
    public CheckIfURLIsASignInWithEmailLink(): EmailSignInState {
        debugger;
        if (!this.urlIsASignInWithEmailLink()) {
            return;
        }
        this.firebaseAuthService.SetEmailState(
            this.continuingOnSameBrowser()
                ? EmailSignInSignInLinkOpenedOnSameBrowser
                : EmailSignInSignInLinkOpenedOnDifferentBrowser,
        );
    }
}

export class EmailSignInWaitingForUserToClickLinkInEmail extends EmailSignInState {
    public async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {
        const currentMethod: EmailSignInStateMethodNames =
            emailSignInActions.UserInputsEmailAddressAndClicksSignInButton;

        // i guess the user forgot about the email that was sent to them by firebase
        // and will start again?
        this.firebaseAuthService.SetEmailState(EmailSignInIdle);
        this.logger?.({
            logMessage: "waiting for user to click link in email.",
        });
    }
    public DifferentEmailAddressEntered(): EmailSignInState {}
    public CheckIfURLIsASignInWithEmailLink(): EmailSignInState {}
}

export class EmailSignInBadEmailAddress extends EmailSignInState {
    public async UserInputsEmailAddressAndClicksSignInButton(): Promise<void> {
        this.firebaseAuthService.SetEmailState(EmailSignInIdle);
        this.logger?.({
            logMessage: "bad email address entered.",
        });
    }
    public DifferentEmailAddressEntered(): void {}
    public CheckIfURLIsASignInWithEmailLink(): void {}
}

export class EmailSignInSignInLinkOpenedOnSameBrowser extends EmailSignInState {
    public override async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {}
    public override DifferentEmailAddressEntered(): EmailSignInState {}
    public override CheckIfURLIsASignInWithEmailLink(): EmailSignInState {}
}
export class EmailSignInSignInLinkOpenedOnDifferentBrowser extends EmailSignInState {
    public override async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {}
    public override DifferentEmailAddressEntered(): EmailSignInState {}
    public override CheckIfURLIsASignInWithEmailLink(): EmailSignInState {}
}
export class EmailSignInWaitingForEmailAddressInGUI extends EmailSignInState {
    public override async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {}
    public override DifferentEmailAddressEntered(): EmailSignInState {}
    public override CheckIfURLIsASignInWithEmailLink(): EmailSignInState {}
}
export class EmailSignInAuthorisingViaFirebase extends EmailSignInState {
    public override async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {}
    public override DifferentEmailAddressEntered(): EmailSignInState {}
    public override CheckIfURLIsASignInWithEmailLink(): EmailSignInState {}
}
export class EmailSignedIn extends EmailSignInState {
    public override async UserInputsEmailAddressAndClicksSignInButton(): Promise<EmailSignInState> {}
    public override DifferentEmailAddressEntered(): EmailSignInState {}
    public override CheckIfURLIsASignInWithEmailLink(): EmailSignInState {}
}

//#region consts

// export const emailSignInStates = {
//     Idle: EmailSignInIdle.name,
//     WaitingForUserToClickLinkInEmail:
//         EmailSignInWaitingForUserToClickLinkInEmail.name,
//     BadEmailAddress: EmailSignInBadEmailAddress.name,
// } as const;

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

//#endregion
