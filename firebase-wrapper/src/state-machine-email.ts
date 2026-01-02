// notes:
// finite state machines transition between states
// one action method should not call another action method. each action method represents a single
// transition so having 1 call another would blur the boundaries between states and result in tight
// coupling.

// the idea with this state machine is that you should pass it a DTO of all the data you currently have
// and it will decide which state to transition to. all business logic for the login belongs here,
// including callbacks that control rendering the GUI.
// it would be nice if the state machine could just be initialised and then take it from there - calling
// all the methods it needs in the firebase wrapper to decide if it needs to transition

import type { TGUIStateDTO } from ".";
import type { TFirebaseWrapperStateDTO } from "./firebase-wrapper";
import { FirebaseAuthService } from "./firebase-wrapper";
import type { TLogItem } from "./gui-logger";
import { StateToSVGMapperService } from "./state-to-svg-mapper-service";

// #region consts and types

/** this is the only DTO you need to pass data to the email state machine */
export type TEmailStateDTO = Partial<TGUIStateDTO & TFirebaseWrapperStateDTO>;

type TEmailSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: EmailSignInFSMContext;
    stateToSVGMapperService: StateToSVGMapperService;
    logger: ((logItem: TLogItem) => void) | null;
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
] as const;
export type TEmailFSMStateID = (typeof emailFSMStateIDs)[number];

const transitionToken: unique symbol = Symbol("transitionToken");

// #endregion consts and types

export class EmailSignInFSMContext {
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService: StateToSVGMapperService;
    private state: EmailSignInState;
    private logger: ((logItemInput: TLogItem) => void) | null;

    // callbacks
    public callbackEnableLoginButton: ((enabled: boolean) => void) | null;
    public callbackEnableEmailInput: ((enabled: boolean) => void) | null;
    public callbackEnablePasswordInput: ((enabled: boolean) => void) | null;

    constructor(props: {
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService: StateToSVGMapperService;
        logger: ((logItemInput: TLogItem) => void) | null;
        callbackEnableLoginButton: ((enabled: boolean) => void) | null;
        callbackEnableEmailInput: ((enabled: boolean) => void) | null;
        callbackEnablePasswordInput: ((enabled: boolean) => void) | null;
    }) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;

        this.firebaseAuthService.setupStateChangedCallback(
            this.handle.bind(this),
        );

        this.callbackEnableLoginButton = props.callbackEnableLoginButton;
        this.callbackEnableEmailInput = props.callbackEnableEmailInput;
        this.callbackEnablePasswordInput = props.callbackEnablePasswordInput;
        const shouldRunOnEnter = true;
        this.state = this.transitionToSync(
            transitionToken,
            IdleState, // init. a class is required.
            shouldRunOnEnter,
        );
    }

    /** should always be called by an action external to this FSM */
    public async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        await this.state.handle(emailStateDTO);
    }

    // call either transitionToSync() or transitionToAsync() but not both
    public transitionToSync<T extends EmailSignInState>(
        token: typeof transitionToken, // prevent external access
        stateClass: TEmailSignInStateConstructor<T>,
        shouldRunOnEnter: boolean = false,
    ): EmailSignInState {
        if (token !== transitionToken) {
            throw new Error(`incorrect transition token`);
        }
        const oldStateName = this.state ? this.state.constructor.name : "null";

        this.state = new stateClass({
            firebaseAuthService: this.firebaseAuthService,
            context: this,
            stateToSVGMapperService: this.stateToSVGMapperService,
            logger: this.logger,
        });

        this.stateToSVGMapperService.updateSvg(this.state.ID);

        const newStateName = this.state.constructor.name;
        this.logger?.({
            logMessage:
                `transitioned email state from ` +
                `<i>${oldStateName}</i> to <i>${newStateName}</i>`,
        });

        if (shouldRunOnEnter) {
            this.state.onEnterSync();
        }
        return this.state;
    }

    public async transitionToAsync<T extends EmailSignInState>(
        token: typeof transitionToken, // prevent external access
        stateClass: TEmailSignInStateConstructor<T>,
    ): Promise<EmailSignInState> {
        const shouldRunOnEnter = false;
        this.state = this.transitionToSync(token, stateClass, shouldRunOnEnter);
        await this.state.onEnterAsync();
        return this.state;
    }
}

abstract class EmailSignInState {
    public abstract readonly ID: TEmailFSMStateID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService: StateToSVGMapperService;
    protected logger: ((logItem: TLogItem) => void) | null = null;

    constructor(props: TEmailSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
    }

    public abstract handle(emailStateDTO: TEmailStateDTO): Promise<void>;

    // call only 1 of these
    public abstract onEnterSync(): void;
    public abstract onEnterAsync(): Promise<void>;

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
        if (this.isAnyEmailEntered() || this.isAnyPasswordEntered()) {
            await this.context.transitionToAsync(
                transitionToken,
                UserInputtingTextState,
            );
            return;
        }
    }

    public override onEnterSync(): void {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
        this.context.callbackEnableLoginButton?.(false);
    }

    public override async onEnterAsync(): Promise<void> {
        this.onEnterSync();
    }
}

class UserInputtingTextState extends EmailSignInState {
    public override readonly ID = "UserInputtingText";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);
        if (!this.isAnyEmailEntered() && !this.isAnyPasswordEntered()) {
            await this.context.transitionToAsync(transitionToken, IdleState);
            return;
        }

        this.context.callbackEnableLoginButton?.(
            this.isAnyEmailEntered() && this.isAnyPasswordEntered(),
        );

        if (emailStateDTO?.isLoginClicked) {
            await this.context.transitionToAsync(
                transitionToken,
                SendingEmailToFirebaseState,
            );
            return;
        }
    }

    public override onEnterSync(): void {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
        if (this.isAnyEmailEntered() && this.isAnyPasswordEntered()) {
            this.context.callbackEnableLoginButton?.(true);
        }
    }

    public override async onEnterAsync(): Promise<void> {
        this.onEnterSync();
    }
}

class SendingEmailToFirebaseState extends EmailSignInState {
    public override readonly ID = "SendingEmailToFirebase";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        if (emailStateDTO.successfullySentSignInLinkToEmail == null) {
            return;
        } else if (emailStateDTO.successfullySentSignInLinkToEmail) {
            await this.context.transitionToAsync(
                transitionToken,
                WaitingForUserToClickLinkInEmailState,
            );
            return;
        } else {
            await this.context.transitionToAsync(
                transitionToken,
                BadEmailAddressState,
            );
            return;
        }
    }

    public override onEnterSync(): void {
        // leave empty since onEnterAsync() actually does something asynchronously here
    }

    public override async onEnterAsync(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        await this.firebaseAuthService.SendSignInLinkToEmail();
    }
}

class WaitingForUserToClickLinkInEmailState extends EmailSignInState {
    public override readonly ID = "WaitingForUserToClickLinkInEmail";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        //todo
    }

    public override onEnterSync(): void {}
    public override async onEnterAsync(): Promise<void> {}
}

class BadEmailAddressState extends EmailSignInState {
    public override readonly ID = "BadEmailAddress";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);
        if (this.isAnyEmailEntered() || this.isAnyPasswordEntered()) {
            await this.context.transitionToAsync(
                transitionToken,
                UserInputtingTextState,
            );
            return;
        }
    }

    public override onEnterSync(): void {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
        this.context.callbackEnableLoginButton?.(false);
    }

    public override async onEnterAsync(): Promise<void> {
        this.onEnterSync();
    }
}
