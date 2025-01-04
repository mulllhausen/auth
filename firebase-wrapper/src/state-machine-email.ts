// notes:
// finite state machines transition between states
// one action method should not call another action method. each action method represents a single
// transition so having 1 call another would blur the bountaries between states and result in tight
// coupling.

import { isSignInWithEmailLink } from "firebase/auth";
import { FirebaseAuthService } from "./firebase-wrapper";
import { LogItem } from "./gui-logger";

export abstract class EmailSignInState {
    /** a reference back to the context */
    public firebaseAuthService!: FirebaseAuthService; // readonly
    public logger: ((logItem: LogItem) => void) | null = null;

    // constructor(
    //     firebaseAuthService: FirebaseAuthService,
    //     logger: ((logItem: LogItem) => void) | null,
    // ) {
    //     this.firebaseAuthService = firebaseAuthService;
    //     this.logger = logger;
    // }
    public async Initialise() {}

    public UserInputsEmailAddressAndClicksSignInButton(): new () => EmailSignInState {
        const errorMessage: string =
            'Invalid action "User Inputs Email Address And Clicks Sign In ' +
            'Button" for default state';
        this.logger?.({ logMessage: errorMessage });
        throw new Error(errorMessage);
    }
    public DifferentEmailAddressEntered(): new () => EmailSignInState {
        const errorMessage: string =
            'Invalid action "Different Email Address Entered" for ' +
            "default state";
        this.logger?.({ logMessage: errorMessage });
        throw new Error(errorMessage);
    }
    public CheckIfURLIsASignInWithEmailLink(): new () => EmailSignInState {
        const errorMessage: string =
            'Invalid action "Check If URL Is A Sign In With ' +
            'Email Link" for default state';
        this.logger?.({ logMessage: errorMessage });
        throw new Error(errorMessage);
    }
    public FirebaseOKResponse(): new () => EmailSignInState {
        const errorMessage: string =
            'Invalid action "Firebase OK Response" for default state';
        this.logger?.({ logMessage: errorMessage });
        throw new Error(errorMessage);
    }
    public FirebaseErrorResponse(errorData: any): new () => EmailSignInState {
        const errorMessage: string =
            'Invalid action "Firebase Error Response" for default state';
        this.logger?.({ logMessage: errorMessage });
        throw new Error(errorMessage);
    }

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

    public validateEmailDataBeforeSignIn(): boolean {
        const failMessage: string = "Unable to sign in with email.";
        if (
            this.firebaseAuthService.EmailAddress == null ||
            this.firebaseAuthService.EmailAddress?.trim() === ""
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

    public urlIsASignInWithEmailLink(): boolean {
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

    public continuingOnSameBrowser(): boolean {
        const sameBrowser: boolean =
            this.firebaseAuthService.EmailAddress != null;
        const sameOrDifferent = sameBrowser ? "the same" : "a different";
        this.logger?.({
            logMessage: `the user has opened the email link on ${sameOrDifferent} browser.`,
        });
        return sameBrowser;
    }
}

export class EmailSignInFSM {
    public static Idle = class Idle extends EmailSignInState {
        public override UserInputsEmailAddressAndClicksSignInButton(): new () => EmailSignInState {
            debugger;
            if (!this.validateEmailDataBeforeSignIn()) {
                return EmailSignInFSM.Idle; // remain in the idle state
            }
            return EmailSignInFSM.SubmittingEmailToFirebase;
        }

        public override DifferentEmailAddressEntered(): new () => EmailSignInState {
            debugger;
            return EmailSignInFSM.Idle;
        }

        public override CheckIfURLIsASignInWithEmailLink(): new () => EmailSignInState {
            debugger;
            if (!this.urlIsASignInWithEmailLink()) {
                return EmailSignInFSM.Idle;
            }
            return this.continuingOnSameBrowser()
                ? EmailSignInFSM.LinkOpenedOnSameBrowser
                : EmailSignInFSM.LinkOpenedOnDifferentBrowser;
        }

        public override FirebaseOKResponse(): new () => EmailSignInState {
            throw new Error(
                'Invalid action "Firebase OK Response" for state "Idle"',
            );
        }
    };

    public static SubmittingEmailToFirebase = class SubmittingEmailToFirebase extends EmailSignInState {
        public async Initialise() {
            await this.firebaseAuthService.SendSignInLinkToEmail();
        }

        public override FirebaseOKResponse(): new () => EmailSignInState {
            debugger;
            this.logger?.({
                logMessage:
                    `a sign-in link has been sent to ` +
                    `${this.firebaseAuthService.EmailAddress}.`,
            });
            return EmailSignInFSM.WaitingForUserToClickLinkInEmail;
        }

        public override FirebaseErrorResponse(
            errorData: any,
        ): new () => EmailSignInState {
            debugger;
            this.logger?.({
                logMessage: "error when sending email link",
                logData: errorData,
            });
            return EmailSignInFSM.BadEmailAddress;
        }
    };

    public static WaitingForUserToClickLinkInEmail = class WaitingForUserToClickLinkInEmail extends EmailSignInState {
        public override UserInputsEmailAddressAndClicksSignInButton(): new () => EmailSignInState {
            // i guess the user forgot about the email that was sent to them by firebase
            // and will start again?
            return EmailSignInFSM.Idle;
            this.logger?.({
                logMessage: "waiting for user to click link in email.",
            });
        }
    };

    public static BadEmailAddress = class BadEmailAddress extends EmailSignInState {
        public badEmailAddress: string | null =
            this.firebaseAuthService.EmailAddress;

        public override UserInputsEmailAddressAndClicksSignInButton(): new () => EmailSignInState {
            if (this.badEmailAddress == this.firebaseAuthService.EmailAddress) {
                return EmailSignInFSM.BadEmailAddress;
            }
            this.logger?.({
                logMessage: "bad email address entered.",
            });
            return EmailSignInFSM.Idle;
        }
    };

    public static LinkOpenedOnSameBrowser = class LinkOpenedOnSameBrowser extends EmailSignInState {
        public override FirebaseOKResponse(): new () => EmailSignInState {
            debugger;
            this.logger?.({
                logMessage:
                    "User successfully signed in using the same browser.",
            });
            return EmailSignInFSM.SignedIn;
        }
    };
    public static LinkOpenedOnDifferentBrowser = class LinkOpenedOnDifferentBrowser extends EmailSignInState {};
    public static WaitingForEmailAddressInGUI = class WaitingForEmailAddressInGUI extends EmailSignInState {};
    public static AuthorisingViaFirebase = class AuthorisingViaFirebase extends EmailSignInState {};
    public static SignedIn = class SignedIn extends EmailSignInState {};

    public static NameToClassMap: Record<string, new () => EmailSignInState> = {
        Idle: EmailSignInFSM.Idle,
        SubmittingEmailToFirebase: EmailSignInFSM.SubmittingEmailToFirebase,
        WaitingForUserToClickLinkInEmail:
            EmailSignInFSM.WaitingForUserToClickLinkInEmail,
        BadEmailAddress: EmailSignInFSM.BadEmailAddress,
        LinkOpenedOnSameBrowser: EmailSignInFSM.LinkOpenedOnSameBrowser,
        LinkOpenedOnDifferentBrowser:
            EmailSignInFSM.LinkOpenedOnDifferentBrowser,
        WaitingForEmailAddressInGUI: EmailSignInFSM.WaitingForEmailAddressInGUI,
        AuthorisingViaFirebase: EmailSignInFSM.AuthorisingViaFirebase,
        SignedIn: EmailSignInFSM.SignedIn,
    };
}
//#region consts

// export const emailSignInStates = {
//     Idle: EmailSignInFSM.Idle.name,
//     WaitingForUserToClickLinkInEmail:
//         EmailSignInFSM.WaitingForUserToClickLinkInEmail.name,
//     BadEmailAddress: EmailSignInFSM.BadEmailAddress.name,
// } as const;

type MethodNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => void ? K : never;
}[keyof T];

type EmailSignInStateMethodNames = MethodNames<EmailSignInState>;

export const emailSignInActions: Record<
    EmailSignInStateMethodNames,
    EmailSignInStateMethodNames
> = {
    Initialise: "Initialise",
    UserInputsEmailAddressAndClicksSignInButton:
        "UserInputsEmailAddressAndClicksSignInButton",
    DifferentEmailAddressEntered: "DifferentEmailAddressEntered",
    CheckIfURLIsASignInWithEmailLink: "CheckIfURLIsASignInWithEmailLink",
    FirebaseOKResponse: "FirebaseOKResponse",
    FirebaseErrorResponse: "FirebaseErrorResponse",
    validateEmailDataBeforeSignIn: "validateEmailDataBeforeSignIn",
    urlIsASignInWithEmailLink: "urlIsASignInWithEmailLink",
    continuingOnSameBrowser: "continuingOnSameBrowser",
};

//#endregion
