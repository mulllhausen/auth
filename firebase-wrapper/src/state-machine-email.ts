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

import { FirebaseAuthService } from "./firebase-wrapper";
import { LogItem } from "./gui-logger";
import { StateToSVGMapperService } from "./state-to-svg-mapper-service";

// #region consts and types

/** this is the only DTO you need to pass data to the email state machine */
export type TEmailStateDTO = {
    inputEmailValue?: string;
    inputPasswordValue?: string;
    isLoginClicked?: boolean;
};

type TEmailSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: EmailSignInFSMContext;
    stateToSVGMapperService: StateToSVGMapperService;
    logger: ((logItem: LogItem) => void) | null;
};

type TEmailSignInStateConstructor<
    TState extends EmailSignInState = EmailSignInState,
> = new (props: TEmailSignInStateConstructorProps) => TState;

const emailFSMID = [
    "Idle",
    "UserInputtingText",
    "SendingEmailToFirebase",
    "WaitingForUserToClickLinkInEmail",
    "BadEmailAddress",
] as const;
export type TEmailFSMID = (typeof emailFSMID)[number];

const transitionToken: unique symbol = Symbol("transitionToken");

// #endregion consts and types

export class EmailSignInFSMContext {
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService: StateToSVGMapperService;
    private state: EmailSignInState;
    private logger: ((logItemInput: LogItem) => void) | null;

    // internal state data
    public emailValue: string = "";
    public passwordValue: string = "";
    public anyEmail: boolean = false;
    public anyPassword: boolean = false;

    // callbacks
    public callbackEnableLoginButton: ((enabled: boolean) => void) | null;
    public callbackEnableEmailInput: ((enabled: boolean) => void) | null;
    public callbackEnablePasswordInput: ((enabled: boolean) => void) | null;

    constructor(props: {
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService: StateToSVGMapperService;
        logger: ((logItemInput: LogItem) => void) | null;
        callbackEnableLoginButton: ((enabled: boolean) => void) | null;
        callbackEnableEmailInput: ((enabled: boolean) => void) | null;
        callbackEnablePasswordInput: ((enabled: boolean) => void) | null;
    }) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
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

    public async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        await this.state.handle(emailStateDTO);
    }

    // call only 1 of these
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
        this.state = this.transitionToSync(token, stateClass);
        await this.state.onEnterAsync();
        return this.state;
    }
}

abstract class EmailSignInState {
    public abstract readonly ID: TEmailFSMID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService: StateToSVGMapperService;
    protected logger: ((logItem: LogItem) => void) | null = null;

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
        this.context.anyEmail = this.context.emailValue.length > 0;
        this.context.anyPassword = this.context.passwordValue.length > 0;
        this.log(
            `${this.context.anyEmail ? "an" : "no"} email was entered and ` +
                `${this.context.anyPassword ? "a" : "no"} password was entered`,
        );
    }

    protected setEmail(input?: string): void {
        if (input?.trim() != null) this.context.emailValue = input.trim();
    }
    protected setPassword(input?: string): void {
        if (input?.trim() != null) this.context.passwordValue = input.trim();
    }
}

class IdleState extends EmailSignInState {
    public override readonly ID = "Idle";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        this.saveInputValues(emailStateDTO);
        if (this.context.anyEmail || this.context.anyPassword) {
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
        if (!this.context.anyEmail && !this.context.anyPassword) {
            await this.context.transitionToAsync(transitionToken, IdleState);
            return;
        }

        this.context.callbackEnableLoginButton?.(
            this.context.anyEmail && this.context.anyPassword,
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
        if (this.context.anyEmail && this.context.anyPassword) {
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
        this.log(`no actions are allowed until firebase has sent the email`);
    }

    public override onEnterSync(): void {
        // leave empty
    }

    public override async onEnterAsync(): Promise<void> {
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
        this.context.callbackEnableLoginButton?.(false);
        debugger;
        this.firebaseAuthService.EmailAddress = this.context.emailValue;
        this.firebaseAuthService.EmailPassword = this.context.passwordValue;
        const success = await this.firebaseAuthService.SendSignInLinkToEmail();
        if (success) {
            await this.context.transitionToAsync(
                transitionToken,
                WaitingForUserToClickLinkInEmailState,
            );
        } else {
            await this.context.transitionToAsync(
                transitionToken,
                BadEmailAddressState,
            );
        }
    }
}

class WaitingForUserToClickLinkInEmailState extends EmailSignInState {
    public override readonly ID = "WaitingForUserToClickLinkInEmail";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        //blah
    }

    public override onEnterSync(): void {}
    public override async onEnterAsync(): Promise<void> {}
}

class BadEmailAddressState extends EmailSignInState {
    public override readonly ID = "BadEmailAddress";

    public override async handle(emailStateDTO: TEmailStateDTO): Promise<void> {
        //blah
    }

    public override onEnterSync(): void {
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
        this.context.callbackEnableLoginButton?.(true);
    }

    public override async onEnterAsync(): Promise<void> {
        this.onEnterSync();
    }
}
