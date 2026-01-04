// notes:
// finite state machines transition between states

// the idea with this state machine is that you should pass it a DTO of all the data you currently have
// and it will decide which state to transition to. all business logic for the login belongs here,
// including callbacks that control rendering the GUI.
// it would be nice if the state machine could just be initialised and then take it from there - calling
// all the methods it needs in the firebase wrapper to decide if it needs to transition

import type { TGUIStateDTO } from ".";
import type { TFirebaseWrapperStateDTO } from "./firebase-wrapper";
import { authProviders, FirebaseAuthService } from "./firebase-wrapper";
import type { TLogItem } from "./gui-logger";
import { StateToSVGMapperService } from "./state-to-svg-mapper-service";

// #region consts and types

/** this is the only DTO you need to pass data to the email state machine */
export type TEmailStateDTO = Partial<TGUIStateDTO & TFirebaseWrapperStateDTO>;

type TEmailSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: EmailSignInFSMContext;
    stateToSVGMapperService?: StateToSVGMapperService;
    logger?: (logItem: TLogItem) => void;
};

type TEmailSignInStateConstructor<
    TState extends EmailSignInState = EmailSignInState,
> = new (props: TEmailSignInStateConstructorProps) => TState;

const emailFSMStateIDs = [
    "Idle",
    "UserInputtingText",
    "SendingEmailToFirebase",
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

const transitionToken: unique symbol = Symbol("transitionToken");

// #endregion consts and types

export class EmailSignInFSMContext {
    private window_: Window & typeof globalThis;
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService?: StateToSVGMapperService;
    private currentState?: EmailSignInState;
    private logger?: (logItemInput: TLogItem) => void;
    private localStorageEmailState = "emailState";

    public stateMap: Record<TEmailFSMStateID, TEmailSignInStateConstructor> = {
        Idle: IdleState,
        UserInputtingText: UserInputtingTextState,
        SendingEmailToFirebase: SendingEmailToFirebaseState,
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
    public callbackEnableEmailInput?: (enabled: boolean) => void;
    public callbackPopulateEmailInput?: (value: string | null) => void;
    public callbackEnablePasswordInput?: (enabled: boolean) => void;
    public callbackEnableLoginButton?: (enabled: boolean) => void;
    public callbackShowInstructionsToReEnterEmail?: (enabled: boolean) => void;

    constructor(props: {
        window: Window & typeof globalThis;
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService?: StateToSVGMapperService;
        logger?: (logItemInput: TLogItem) => void;
        callbackEnableEmailInput?: (enabled: boolean) => void;
        callbackPopulateEmailInput?: (value: string | null) => void;
        callbackEnablePasswordInput?: (enabled: boolean) => void;
        callbackEnableLoginButton?: (enabled: boolean) => void;
        callbackShowInstructionsToReEnterEmail?: (enabled: boolean) => void;
    }) {
        this.window_ = props.window;
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;

        this.firebaseAuthService.setupCallbackStateChanged(
            this.handle.bind(this),
        );

        this.callbackEnableLoginButton = props.callbackEnableLoginButton;
        this.callbackPopulateEmailInput = props.callbackPopulateEmailInput;
        this.callbackEnableEmailInput = props.callbackEnableEmailInput;
        this.callbackEnablePasswordInput = props.callbackEnablePasswordInput;
        this.callbackShowInstructionsToReEnterEmail =
            props.callbackShowInstructionsToReEnterEmail;
    }

    public async setup(): Promise<void> {
        const emailSignInStateConstructor = this.getStateFromLocalstorage();
        this.currentState = await this.transitionTo(
            transitionToken,
            emailSignInStateConstructor, // init. a class is required.
        );
        // not needed for email?
        //this.firebaseAuthService.setupFirebaseListeners();
    }

    /** should always be called by an action external to this FSM */
    public async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        await this.currentState?.handle(emailStateDTO);
    }

    public async transitionTo<TState extends EmailSignInState>(
        token: typeof transitionToken, // prevent external access
        stateClass: TEmailSignInStateConstructor<TState>,
    ): Promise<EmailSignInState> {
        if (token !== transitionToken) {
            throw new Error(`incorrect transition token`);
        }
        const oldStateID = this.currentState ? this.currentState.ID : "null";

        this.currentState = new stateClass({
            firebaseAuthService: this.firebaseAuthService,
            context: this,
            stateToSVGMapperService: this.stateToSVGMapperService,
            logger: this.logger,
        });

        this.stateToSVGMapperService?.updateSvg(this.currentState.ID);

        const newStateID = this.currentState.ID;
        this.backupStateToLocalstorage(newStateID);
        this.logger?.({
            logMessage: `transitioned email state from <i>${oldStateID}</i> to <i>${newStateID}</i>`,
        });

        await this.currentState.onEnter();

        return this.currentState;
    }

    private getStateFromLocalstorage(): TEmailSignInStateConstructor {
        const emailFSMStateID = this.window_.localStorage.getItem(
            this.localStorageEmailState,
        ) as TEmailFSMStateID | null;
        if (emailFSMStateID == null) return IdleState;
        return this.stateMap[emailFSMStateID];
    }

    private backupStateToLocalstorage(emailFSMStateID: TEmailFSMStateID): void {
        this.window_.localStorage.setItem(
            this.localStorageEmailState,
            emailFSMStateID as string,
        );
    }

    public deleteStateFromLocalstorage(): void {
        this.window_.localStorage.removeItem(this.localStorageEmailState);
    }
}

abstract class EmailSignInState {
    public abstract readonly ID: TEmailFSMStateID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService?: StateToSVGMapperService;
    protected logger?: (logItem: TLogItem) => void;

    constructor(props: TEmailSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
    }

    public abstract handle(emailStateDTO: TEmailStateDTO): Promise<void>;
    public abstract onEnter(): Promise<void>;

    protected log(logMessage: string): void {
        this.logger?.({ logMessage });
    }

    protected saveInputValues(emailStateDTO?: TEmailStateDTO): void {
        this.setEmail(emailStateDTO?.inputEmailValue);
        this.setPassword(emailStateDTO?.inputPasswordValue);
        this.log(
            `${this.isAnyEmailEntered() ? "an" : "no"} email was entered and ` +
                `${this.isAnyPasswordEntered() ? "a" : "no"} password was entered`,
        );
    }

    protected setEmail(input?: string): void {
        if (input?.trim() != null) {
            this.firebaseAuthService.EmailAddress = input.trim();
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
}

class IdleState extends EmailSignInState {
    public override readonly ID = "Idle";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);
        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === true) {
            await this.context.transitionTo(
                transitionToken,
                SignInLinkOpenedOnSameBrowserState,
            );
            return;
        }

        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === false) {
            await this.context.transitionTo(
                transitionToken,
                SignInLinkOpenedOnDifferentBrowserState,
            );
            return;
        }

        if (this.isAnyEmailEntered() || this.isAnyPasswordEntered()) {
            await this.context.transitionTo(
                transitionToken,
                UserInputtingTextState,
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
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.checkIfURLIsASignInWithEmailLink();
    }
}

class UserInputtingTextState extends EmailSignInState {
    public override readonly ID = "UserInputtingText";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);
        if (!this.isAnyEmailEntered() && !this.isAnyPasswordEntered()) {
            await this.context.transitionTo(transitionToken, IdleState);
            return;
        }

        this.context.callbackEnableLoginButton?.(
            this.isAnyEmailEntered() && this.isAnyPasswordEntered(),
        );

        if (emailStateDTO?.isLoginClicked) {
            await this.context.transitionTo(
                transitionToken,
                SendingEmailToFirebaseState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
        if (this.isAnyEmailEntered() && this.isAnyPasswordEntered()) {
            this.context.callbackEnableLoginButton?.(true);
        }
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.checkIfURLIsASignInWithEmailLink();
    }
}

class SendingEmailToFirebaseState extends EmailSignInState {
    public override readonly ID = "SendingEmailToFirebase";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (emailStateDTO.successfullySentSignInLinkToEmail == null) {
            return;
        } else if (emailStateDTO.successfullySentSignInLinkToEmail) {
            await this.context.transitionTo(
                transitionToken,
                WaitingForUserToClickLinkInEmailState,
            );
            return;
        } else {
            await this.context.transitionTo(
                transitionToken,
                BadEmailAddressState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.SendSignInLinkToEmail();
    }
}

class WaitingForUserToClickLinkInEmailState extends EmailSignInState {
    public override readonly ID = "WaitingForUserToClickLinkInEmail";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === true) {
            await this.context.transitionTo(
                transitionToken,
                SignInLinkOpenedOnSameBrowserState,
            );
            return;
        }

        if (emailStateDTO.userOpenedEmailLinkOnSameBrowser === false) {
            await this.context.transitionTo(
                transitionToken,
                SignInLinkOpenedOnDifferentBrowserState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.checkIfURLIsASignInWithEmailLink();
    }
}

class BadEmailAddressState extends EmailSignInState {
    public override readonly ID = "BadEmailAddress";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);
        if (this.isAnyEmailEntered() || this.isAnyPasswordEntered()) {
            await this.context.transitionTo(
                transitionToken,
                UserInputtingTextState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.checkIfURLIsASignInWithEmailLink();
    }
}

class SignInLinkOpenedOnSameBrowserState extends EmailSignInState {
    public override readonly ID = "SignInLinkOpenedOnSameBrowser";

    public override async handle(
        emailStateDTO: TEmailStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);

        // move straight to the next state. this keeps responsibilities correct.
        this.context.transitionTo(transitionToken, AuthorisingViaFirebaseState);
    }
}

class SignInLinkOpenedOnDifferentBrowserState extends EmailSignInState {
    public override readonly ID = "SignInLinkOpenedOnDifferentBrowser";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (emailStateDTO?.isLoginClicked) {
            await this.context.transitionTo(
                transitionToken,
                SendingEmailToFirebaseState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(true);

        this.context.callbackShowInstructionsToReEnterEmail?.(true);
    }
}

class WaitingForReEnteredEmailState extends EmailSignInState {
    public override readonly ID = "WaitingForReEnteredEmail";

    public override async handle(
        emailStateDTO: TEmailStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(true);
    }
}

class AuthorisingViaFirebaseState extends EmailSignInState {
    public override readonly ID = "AuthorisingViaFirebase";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        debugger;
        switch (emailStateDTO.userCredentialFoundViaEmail) {
            case true:
                await this.context.transitionTo(transitionToken, SignedInState);
                return;
            case false:
                await this.context.transitionTo(
                    transitionToken,
                    AuthFailedState,
                );
                return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
        await this.firebaseAuthService.handleSignInWithEmailLink();
    }
}

class SignedInState extends EmailSignInState {
    public override readonly ID = "SignedIn";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        // this.firebaseAuthService.logout();
        if (emailStateDTO.isLogoutClicked) {
            await this.context.transitionTo(transitionToken, IdleState);
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);
    }
}

class AuthFailedState extends EmailSignInState {
    public override readonly ID = "AuthFailed";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (emailStateDTO.emailDataDeleted) {
            this.context.transitionTo(transitionToken, IdleState);
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackShowInstructionsToReEnterEmail?.(false);

        this.firebaseAuthService.signoutProvider(authProviders.Email);
    }
}
