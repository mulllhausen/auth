// notes:
// finite state machines transition between states
// one action method should not call another action method. each action method represents a single
// transition so having 1 call another would blur the bountaries between states and result in tight
// coupling.

// the idea with this state machine is that you should pass it all the data you currently have and
// it will decide which state to transition to
// it would be nice if the state machine could just be initialised and then take it from there - calling
// all the methods it needs in the firebase wrapper to decide if it needs to transition

import { LogItem } from "./gui-logger";
import { SVGService } from "./svg-service";

export const EmailEvents: Record<string, string> = {
    IdleNoText: "IdleNoText",
    UserInputtingText: "UserInputtingText",
    UserClickedLogin: "UserClickedLogin",
};

const EventData = {};

export class EmailSignInFSMContext {
    private svgService: SVGService;
    private state: EmailSignInState = new EmailSignInFSM.Idle();

    constructor(props: {
        svgService: SVGService;
        emailSignInState: EmailSignInState;
    }) {
        this.svgService = props.svgService;
        this.transitionTo(props.emailSignInState);
    }

    public setup() {
        this.initEvents();
    }

    private initEvents() {
        for (const emailEvent in EmailEvents) {
            window.addEventListener(emailEvent, (e: Event) =>
                this.state.handle(emailEvent, (e as StateMachineEvent).detail),
            );
        }
    }

    public transitionTo(state: EmailSignInState): void {
        console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
        this.state = state;
        //this.state.setContext(this);
    }
}

abstract class EmailSignInState {
    protected context: EmailSignInFSMContext;
    public logger: ((logItem: LogItem) => void) | null = null;
    // public get Name(): string {
    //     return this.constructor.name;
    // }
    //public backupData: Record<string, any> | null = null;

    constructor(props: {
        context: EmailSignInFSMContext;
        logger: ((logItem: LogItem) => void) | null;
    }) {
        this.context = props.context;
        this.logger = props.logger;
    }
    //public async Initialise() {}

    public abstract handle(
        eventType: keyof typeof EmailEvents,
        eventData: typeof EventData,
    ): void;

    protected abstract onExit(): void;
    protected abstract onEnter(): void;

    // public UserInputsEmailAddressAndClicksSignInButton(): new () => EmailSignInState {
    //     const errorMessage: string =
    //         'Invalid action "User Inputs Email Address And Clicks Sign In ' +
    //         'Button" for default state';
    //     this.logger?.({ logMessage: errorMessage });
    //     throw new Error(errorMessage);
    // }
    // public DifferentEmailAddressEntered(): new () => EmailSignInState {
    //     const errorMessage: string =
    //         'Invalid action "Different Email Address Entered" for ' +
    //         "default state";
    //     this.logger?.({ logMessage: errorMessage });
    //     throw new Error(errorMessage);
    // }
    // public CheckIfURLIsASignInWithEmailLink(): new () => EmailSignInState {
    //     const errorMessage: string =
    //         'Invalid action "Check If URL Is A Sign In With ' +
    //         'Email Link" for default state';
    //     this.logger?.({ logMessage: errorMessage });
    //     throw new Error(errorMessage);
    // }
    // public FirebaseOKResponse(): new () => EmailSignInState {
    //     const errorMessage: string =
    //         'Invalid action "Firebase OK Response" for default state';
    //     this.logger?.({ logMessage: errorMessage });
    //     throw new Error(errorMessage);
    // }
    // public FirebaseErrorResponse(errorData: any): new () => EmailSignInState {
    //     const errorMessage: string =
    //         'Invalid action "Firebase Error Response" for default state';
    //     this.logger?.({ logMessage: errorMessage });
    //     throw new Error(errorMessage);
    // }

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

    // public validateEmailDataBeforeSignIn(): boolean {
    //     const failMessage: string = "Unable to sign in with email.";
    //     if (
    //         this.firebaseAuthService.EmailAddress == null ||
    //         this.firebaseAuthService.EmailAddress?.trim() === ""
    //     ) {
    //         this.logger?.({
    //             logMessage: `No email address. ${failMessage}`,
    //         });
    //         return false;
    //     }
    //     if (this.firebaseAuthService.UseLinkInsteadOfPassword) {
    //         return true;
    //     }
    //     if (
    //         this.firebaseAuthService.EmailPassword == null ||
    //         this.firebaseAuthService.EmailPassword.trim() === ""
    //     ) {
    //         this.logger?.({
    //             logMessage: `Password is undefined. ${failMessage}`,
    //         });
    //         return false;
    //     }
    //     return true;
    // }

    // public urlIsASignInWithEmailLink(): boolean {
    //     const urlIsASignInWithEmailLink: boolean = isSignInWithEmailLink(
    //         this.firebaseAuthService.Auth,
    //         window.location.href,
    //     );
    //     const not = urlIsASignInWithEmailLink ? "" : "not ";
    //     this.logger?.({
    //         logMessage:
    //             `just checked: the current page url is ${not}a ` +
    //             `sign-in-with-email-link`,
    //     });
    //     return urlIsASignInWithEmailLink;
    // }

    // public continuingOnSameBrowser(): boolean {
    //     const sameBrowser: boolean =
    //         this.firebaseAuthService.EmailAddress != null;
    //     const sameOrDifferent = sameBrowser ? "the same" : "a different";
    //     this.logger?.({
    //         logMessage: `the user has opened the email link on ${sameOrDifferent} browser.`,
    //     });
    //     return sameBrowser;
    // }
}

/**
 * EmailSignInFSM is a namespace to keep all classes of this state machine together
 */
class EmailSignInFSM {
    public static Idle = class Idle extends EmailSignInState {
        public override handle(
            eventType: keyof typeof EmailEvents,
            eventData: typeof EventData,
        ): void {
            this.onExit();
            switch (eventType) {
                case EmailEvents.IdleNoText:
                    break;
                case EmailEvents.UserInputtingText:
                    this.context.transitionTo(new UserInputtingTextState());
                case EmailEvents.UserClickedLogin:
                    break;
            }
        }

        protected override onExit(): void {}

        protected override onEnter(): void {}

        // public override UserInputsEmailAddressAndClicksSignInButton(): new () => EmailSignInState {
        //     debugger;
        //     if (!this.validateEmailDataBeforeSignIn()) {
        //         return EmailSignInFSM.Idle; // remain in the idle state
        //     }
        //     return EmailSignInFSM.SubmittingEmailToFirebase;
        // }

        // public override DifferentEmailAddressEntered(): new () => EmailSignInState {
        //     debugger;
        //     return EmailSignInFSM.Idle;
        // }

        // public override CheckIfURLIsASignInWithEmailLink(): new () => EmailSignInState {
        //     debugger;
        //     if (!this.urlIsASignInWithEmailLink()) {
        //         return EmailSignInFSM.Idle;
        //     }
        //     return this.continuingOnSameBrowser()
        //         ? EmailSignInFSM.LinkOpenedOnSameBrowser
        //         : EmailSignInFSM.LinkOpenedOnDifferentBrowser;
        // }

        // public override FirebaseOKResponse(): new () => EmailSignInState {
        //     throw new Error(
        //         'Invalid action "Firebase OK Response" for state "Idle"',
        //     );
        // }
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

// #region consts and types

type MethodNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => void ? K : never;
}[keyof T];

type EmailSignInStateMethodNames = MethodNames<EmailSignInState>;

// export const emailSignInStates = {
//     Idle: EmailSignInFSM.Idle.name,
//     WaitingForUserToClickLinkInEmail:
//         EmailSignInFSM.WaitingForUserToClickLinkInEmail.name,
//     BadEmailAddress: EmailSignInFSM.BadEmailAddress.name,
// } as const;

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

// #endregion consts and types
