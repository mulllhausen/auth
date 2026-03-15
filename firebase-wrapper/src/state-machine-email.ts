// notes:
// finite state machines transition between states

// the idea with this state machine (service) is that you should pass it a DTO of all the data you
// currently have and it will decide which state to transition to. all business logic for the login
// belongs here, including callbacks that control rendering the GUI.

// the state machine sits just above the firebase wrapper in the hierarchy. it calls methods in the
// firebase wrapper and the firebase wrapper never calls it, except by invoking the callbacks it has
// been given by this service.

// todo: sign in with password

import type { TGUIStateDTO } from ".";
import type {
    TAuthProvider,
    TFirebaseWrapperStateDTO,
} from "./firebase-wrapper";
import { authProviders, FirebaseAuthService } from "./firebase-wrapper";
import type { TLogItem } from "./gui-logger";
import { StateToSVGMapperServiceEmail } from "./state-to-svg-mapper-service-email";

// #region consts and types

/** this is the only DTO you need to pass data to the email state machine */
export type TEmailStateDTO = Partial<TGUIStateDTO & TFirebaseWrapperStateDTO>;

type TEmailSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: EmailSignInFSMContext;
    stateToSVGMapperService?: StateToSVGMapperServiceEmail;
    logger?: (logItem: TLogItem) => void;
};

type TEmailSignInStateConstructor<
    TState extends EmailSignInState = EmailSignInState,
> = new (props: TEmailSignInStateConstructorProps) => TState;

const emailFSMStateIDs = [
    "Idle",
    "UserInputtingText",
    "SendingEmailAddressToFirebase",
    "WaitingForUserToClickLinkInEmail",
    "BadEmailAddress",
    "SignInLinkOpenedOnSameBrowser",
    "SignInLinkOpenedOnDifferentBrowser",
    "AuthorisingViaFirebase",
    "WaitingForReEnteredEmail",
    "SignedIn",
    "AuthFailed",
] as const;
export type TEmailFSMStateID = (typeof emailFSMStateIDs)[number];

const token: unique symbol = Symbol("token");

// #endregion consts and types

export class EmailSignInFSMContext {
    private _window: Window & typeof globalThis;
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService?: StateToSVGMapperServiceEmail;
    private currentState?: EmailSignInState;
    private logger?: (logItemInput: TLogItem) => void;
    private localStorageEmailStateKey = "emailState";
    private localStorageEmailAddressKey = "emailAddress";
    private stateMap: Record<TEmailFSMStateID, TEmailSignInStateConstructor> = {
        Idle: IdleState,
        UserInputtingText: UserInputtingTextState,
        SendingEmailAddressToFirebase: SendingEmailAddressToFirebaseState,
        WaitingForUserToClickLinkInEmail: WaitingForUserToClickLinkInEmailState,
        BadEmailAddress: BadEmailAddressState,
        SignInLinkOpenedOnSameBrowser: SignInLinkOpenedOnSameBrowserState,
        SignInLinkOpenedOnDifferentBrowser:
            SignInLinkOpenedOnDifferentBrowserState,
        AuthorisingViaFirebase: AuthorisingViaFirebaseState,
        WaitingForReEnteredEmail: WaitingForUserToClickLinkInEmailState,
        SignedIn: SignedInState,
        AuthFailed: AuthFailedState,
    };

    // callbacks
    public callbackSetTab?: (authProvider: TAuthProvider) => void;
    public callbackEnableEmailInput?: (enabled: boolean) => void;
    public callbackPopulateEmailInput?: (value: string | null) => void;
    public callbackEnablePasswordInput?: (enabled: boolean) => void;
    public callbackEnableLoginButton?: (enabled: boolean) => void;
    public callbackShowInstructionsToClickLinkInEmail?: (
        enabled: boolean,
    ) => void;
    public callbackShowInstructionsToReEnterEmail?: (enabled: boolean) => void;

    constructor(props: {
        window: Window & typeof globalThis;
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService?: StateToSVGMapperServiceEmail;
        logger?: (logItemInput: TLogItem) => void;
        callbackSetTab?: (authProvider: TAuthProvider) => void;
        callbackEnableEmailInput?: (enabled: boolean) => void;
        callbackPopulateEmailInput?: (value: string | null) => void;
        callbackEnablePasswordInput?: (enabled: boolean) => void;
        callbackEnableLoginButton?: (enabled: boolean) => void;
        callbackShowInstructionsToClickLinkInEmail?: (enabled: boolean) => void;
        callbackShowInstructionsToReEnterEmail?: (enabled: boolean) => void;
    }) {
        this._window = props.window;
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
        this.callbackSetTab = props.callbackSetTab;
        this.callbackEnableLoginButton = props.callbackEnableLoginButton;
        this.callbackPopulateEmailInput = props.callbackPopulateEmailInput;
        this.callbackEnableEmailInput = props.callbackEnableEmailInput;
        this.callbackEnablePasswordInput = props.callbackEnablePasswordInput;
        this.callbackShowInstructionsToClickLinkInEmail =
            props.callbackShowInstructionsToClickLinkInEmail;
        this.callbackShowInstructionsToReEnterEmail =
            props.callbackShowInstructionsToReEnterEmail;

        this.firebaseAuthService.subscribeStateChanged(this.handle.bind(this));
    }

    /** note: call setup() once immediately after the constructor */
    public async setup(): Promise<void> {
        // todo: ignore if older than 1 day
        this.firebaseAuthService.EmailAddress = this.getEmailFromLocalstorage();

        const emailFSMStateID = this.getStateFromLocalstorage();
        const emailSignInStateConstructor = emailFSMStateID
            ? this.stateMap[emailFSMStateID]
            : IdleState;

        // init. a class is required.
        await this.transitionTo(token, emailSignInStateConstructor);
    }

    /** should always be called by an action external to this FSM */
    public async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        await this.currentState?.handle(emailStateDTO);
    }

    public async transitionTo<TState extends EmailSignInState>(
        fsmToken: typeof token, // prevent external access
        newStateClass: TEmailSignInStateConstructor<TState>,
    ): Promise<EmailSignInState> {
        if (fsmToken !== token) {
            throw new Error(`incorrect token`);
        }
        const oldStateID = this.currentState
            ? this.currentState.ID
            : (this.getStateFromLocalstorage() ?? "null");

        this.currentState = await this.setState(newStateClass);
        const newStateID = this.currentState.ID;
        if (newStateID === oldStateID) {
            this.logger?.({
                logMessage:
                    `old & new email state: <code>${oldStateID}</code>.` +
                    ` no transition needed.`,
            });
            return this.currentState;
        }

        this.logger?.({
            logMessage:
                `transitioned email state from <code>${oldStateID}</code>` +
                ` to <code>${newStateID}</code>`,
        });

        await this.currentState.onEnter();

        return this.currentState;
    }

    private async setState<TState extends EmailSignInState>(
        newStateClass: TEmailSignInStateConstructor<TState>,
    ): Promise<EmailSignInState> {
        this.callbackSetTab?.(authProviders.Email);
        this.currentState = new newStateClass({
            firebaseAuthService: this.firebaseAuthService,
            context: this,
            stateToSVGMapperService: this.stateToSVGMapperService,
            logger: this.logger,
        });
        const newStateID = this.currentState.ID;
        await this.stateToSVGMapperService?.enqueue(newStateID);
        this.backupStateToLocalstorage(newStateID);
        return this.currentState;
    }

    public log(logMessage: string): void {
        this.logger?.({ logMessage });
    }

    // localstorage functions

    private getStateFromLocalstorage(): TEmailFSMStateID | null {
        return this._window.localStorage.getItem(
            this.localStorageEmailStateKey,
        ) as TEmailFSMStateID | null;
    }

    private backupStateToLocalstorage(emailFSMStateID: TEmailFSMStateID): void {
        this._window.localStorage.setItem(
            this.localStorageEmailStateKey,
            emailFSMStateID as string,
        );
    }

    public deleteStateFromLocalstorage(): void {
        this._window.localStorage.removeItem(this.localStorageEmailStateKey);
    }

    private getEmailFromLocalstorage(): string | null {
        return this._window.localStorage.getItem(
            this.localStorageEmailAddressKey,
        );
    }

    public backupEmailToLocalstorage(
        fsmToken: typeof token,
        emailAddress: string,
    ): void {
        if (fsmToken !== token) {
            throw new Error(`incorrect token`);
        }
        this._window.localStorage.setItem(
            this.localStorageEmailAddressKey,
            emailAddress,
        );
    }
}

abstract class EmailSignInState {
    public abstract readonly ID: TEmailFSMStateID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService?: StateToSVGMapperServiceEmail;

    constructor(props: TEmailSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
    }

    public abstract handle(emailStateDTO: TEmailStateDTO): Promise<void>;
    public abstract onEnter(): Promise<void>;

    protected saveInputValues(emailStateDTO?: TEmailStateDTO): void {
        this.setEmail(emailStateDTO?.inputEmailValue);
        this.setPassword(emailStateDTO?.inputPasswordValue);
        this.context.log(
            `${this.isAnyEmailEntered() ? "an" : "no"} email was entered and ` +
                `${this.isAnyPasswordEntered() ? "a" : "no"} password was entered`,
        );
    }

    protected setEmail(input?: string): void {
        const emailAddress = input?.trim();
        if (emailAddress != null) {
            this.firebaseAuthService.EmailAddress = emailAddress;
            this.context.backupEmailToLocalstorage(token, emailAddress);
        }
    }

    protected setPassword(input?: string): void {
        if (input?.trim() != null) {
            this.firebaseAuthService.EmailPassword = input.trim();
        }
    }

    protected isAnyEmailEntered(): boolean {
        if (this.firebaseAuthService.EmailAddress == null) return false;
        return this.firebaseAuthService.EmailAddress?.length > 0;
    }

    protected isAnyPasswordEntered(): boolean {
        if (this.firebaseAuthService.EmailPassword == null) return false;
        return this.firebaseAuthService.EmailPassword?.length > 0;
    }

    protected isLoggedOut(emailStateDTO?: TEmailStateDTO): boolean {
        let isUserSignedOut = false;
        if (emailStateDTO?.userNotSignedIn) {
            this.context.log("email fsm: detected user already signed out");
            isUserSignedOut = true;
        }
        if (emailStateDTO?.emailDataDeleted) {
            // todo: do we still want this state? how is it different to logout i.e. userNotSignedIn?
            this.context.log("email fsm: detected user email data deleted");
            isUserSignedOut = true;
        }
        return isUserSignedOut;
    }
}

class IdleState extends EmailSignInState {
    public override readonly ID = "Idle";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);

        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === true) {
            await this.context.transitionTo(
                token,
                SignInLinkOpenedOnSameBrowserState,
            );
            return;
        }

        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === false) {
            await this.context.transitionTo(
                token,
                SignInLinkOpenedOnDifferentBrowserState,
            );
            return;
        }

        if (this.isAnyEmailEntered() || this.isAnyPasswordEntered()) {
            await this.context.transitionTo(token, UserInputtingTextState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackPopulateEmailInput?.(
            this.firebaseAuthService.EmailAddress,
        );
        this.context.callbackEnablePasswordInput?.(true);

        const emailAndPasswordEntered =
            this.isAnyEmailEntered() && this.isAnyPasswordEntered();
        this.context.callbackEnableLoginButton?.(emailAndPasswordEntered);

        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
    }
}

class UserInputtingTextState extends EmailSignInState {
    public override readonly ID = "UserInputtingText";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);

        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (!this.isAnyEmailEntered() && !this.isAnyPasswordEntered()) {
            await this.context.transitionTo(token, IdleState);
            return;
        }

        this.context.callbackEnableLoginButton?.(
            this.isAnyEmailEntered() && this.isAnyPasswordEntered(),
        );

        if (emailStateDTO?.isEmailLoginClicked) {
            await this.context.transitionTo(
                token,
                SendingEmailAddressToFirebaseState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackPopulateEmailInput?.(
            this.firebaseAuthService.EmailAddress,
        );
        this.context.callbackEnablePasswordInput?.(true);
        if (this.isAnyEmailEntered() && this.isAnyPasswordEntered()) {
            this.context.callbackEnableLoginButton?.(true);
        }
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
    }
}

class SendingEmailAddressToFirebaseState extends EmailSignInState {
    public override readonly ID = "SendingEmailAddressToFirebase";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (emailStateDTO.successfullySentSignInLinkToEmail == null) {
            return;
        } else if (emailStateDTO.successfullySentSignInLinkToEmail) {
            await this.context.transitionTo(
                token,
                WaitingForUserToClickLinkInEmailState,
            );
            return;
        } else {
            await this.context.transitionTo(token, BadEmailAddressState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.signin(authProviders.Email);
    }
}

class WaitingForUserToClickLinkInEmailState extends EmailSignInState {
    public override readonly ID = "WaitingForUserToClickLinkInEmail";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === true) {
            await this.context.transitionTo(
                token,
                SignInLinkOpenedOnSameBrowserState,
            );
            return;
        }

        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === false) {
            await this.context.transitionTo(
                token,
                SignInLinkOpenedOnDifferentBrowserState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackShowInstructionsToClickLinkInEmail?.(true);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
    }
}

class BadEmailAddressState extends EmailSignInState {
    public override readonly ID = "BadEmailAddress";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);

        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (this.isAnyEmailEntered() || this.isAnyPasswordEntered()) {
            await this.context.transitionTo(token, UserInputtingTextState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackPopulateEmailInput?.(
            this.firebaseAuthService.EmailAddress,
        );
        this.context.callbackEnablePasswordInput?.(true);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
    }
}

class SignInLinkOpenedOnSameBrowserState extends EmailSignInState {
    public override readonly ID = "SignInLinkOpenedOnSameBrowser";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);

        // move straight to the next state. this keeps responsibilities correct.
        this.context.transitionTo(token, AuthorisingViaFirebaseState);
    }
}

class SignInLinkOpenedOnDifferentBrowserState extends EmailSignInState {
    public override readonly ID = "SignInLinkOpenedOnDifferentBrowser";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackPopulateEmailInput?.(
            this.firebaseAuthService.EmailAddress,
        );
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(true);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(true);

        // move straight to the next state. this keeps responsibilities correct.
        this.context.transitionTo(token, WaitingForReEnteredEmailState);
    }
}

class WaitingForReEnteredEmailState extends EmailSignInState {
    public override readonly ID = "WaitingForReEnteredEmail";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        this.setEmail(emailStateDTO?.inputEmailValue);

        if (this.isAnyEmailEntered()) {
            this.context.log(`an email was entered`);

            if (emailStateDTO?.isEmailLoginClicked) {
                await this.context.transitionTo(
                    token,
                    AuthorisingViaFirebaseState,
                );
                return;
            }
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackPopulateEmailInput?.(
            this.firebaseAuthService.EmailAddress,
        );
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(true);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(true);
    }
}

class AuthorisingViaFirebaseState extends EmailSignInState {
    public override readonly ID = "AuthorisingViaFirebase";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        switch (emailStateDTO.userCredentialFoundViaEmail) {
            case true:
                this.firebaseAuthService.deleteFirebaseQuerystringParams();
                await this.context.transitionTo(token, SignedInState);
                return;
            case false:
                await this.context.transitionTo(token, AuthFailedState);
                return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.handleSignInWithEmailLink();
    }
}

class SignedInState extends EmailSignInState {
    public override readonly ID = "SignedIn";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
    }
}

class AuthFailedState extends EmailSignInState {
    public override readonly ID = "AuthFailed";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (this.isLoggedOut(emailStateDTO)) {
            this.context.callbackPopulateEmailInput?.("");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (emailStateDTO.emailDataDeleted) {
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToClickLinkInEmail?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);

        this.firebaseAuthService.signoutProvider(authProviders.Email);
    }
}
