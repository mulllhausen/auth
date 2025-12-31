// notes:
// finite state machines transition between states
// one action method should not call another action method. each action method represents a single
// transition so having 1 call another would blur the boundaries between states and result in tight
// coupling.

// the idea with this state machine is that you should pass it a DTO of all the data you currently have
// and it will decide which state to transition to
// it would be nice if the state machine could just be initialised and then take it from there - calling
// all the methods it needs in the firebase wrapper to decide if it needs to transition

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
] as const;
export type TEmailFSMID = (typeof emailFSMID)[number];

const transitionToken: unique symbol = Symbol("transitionToken");

// #endregion consts and types

export class EmailSignInFSMContext {
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
        stateToSVGMapperService: StateToSVGMapperService;
        logger: ((logItemInput: LogItem) => void) | null;
        callbackEnableLoginButton: ((enabled: boolean) => void) | null;
        callbackEnableEmailInput: ((enabled: boolean) => void) | null;
        callbackEnablePasswordInput: ((enabled: boolean) => void) | null;
    }) {
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
        this.callbackEnableLoginButton = props.callbackEnableLoginButton;
        this.callbackEnableEmailInput = props.callbackEnableEmailInput;
        this.callbackEnablePasswordInput = props.callbackEnablePasswordInput;
        this.state = this.transitionTo(transitionToken, IdleState); // init. a class is required.
    }

    public handle(emailStateDTO: TEmailStateDTO): void {
        this.state.handle(emailStateDTO);
    }

    public transitionTo<T extends EmailSignInState>(
        token: typeof transitionToken, // prevent external access
        StateClass: TEmailSignInStateConstructor<T>,
    ): EmailSignInState {
        if (token !== transitionToken) {
            throw new Error(`incorrect transition token`);
        }
        const oldStateName = this.state ? this.state.constructor.name : "null";

        this.state = new StateClass({
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
        this.state.onEnter();
        return this.state;
    }
}

abstract class EmailSignInState {
    public abstract readonly ID: TEmailFSMID;
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService: StateToSVGMapperService;
    protected logger: ((logItem: LogItem) => void) | null = null;

    constructor(props: TEmailSignInStateConstructorProps) {
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
    }

    public abstract handle(emailStateDTO: TEmailStateDTO): void;
    public abstract onEnter(): void;

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

    public override handle(emailStateDTO: TEmailStateDTO): void {
        this.saveInputValues(emailStateDTO);
        if (this.context.anyEmail || this.context.anyPassword) {
            this.context.transitionTo(transitionToken, UserInputtingTextState);
            return;
        }
    }

    public override onEnter(): void {
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
    }
}

class UserInputtingTextState extends EmailSignInState {
    public override readonly ID = "UserInputtingText";

    public override handle(emailStateDTO: TEmailStateDTO): void {
        this.saveInputValues(emailStateDTO);
        if (!this.context.anyEmail && !this.context.anyPassword) {
            this.context.transitionTo(transitionToken, IdleState);
            return;
        }

        this.context.callbackEnableLoginButton?.(
            this.context.anyEmail && this.context.anyPassword,
        );

        if (emailStateDTO?.isLoginClicked) {
            this.context.transitionTo(
                transitionToken,
                SendingEmailToFirebaseState,
            );
            return;
        }
    }

    public override onEnter(): void {
        if (this.context.anyEmail && this.context.anyPassword) {
            this.context.callbackEnableLoginButton?.(true);
        }
        this.context.callbackEnableEmailInput?.(true);
        this.context.callbackEnablePasswordInput?.(true);
    }
}

class SendingEmailToFirebaseState extends EmailSignInState {
    public override readonly ID = "SendingEmailToFirebase";

    public override handle(emailStateDTO: TEmailStateDTO): void {
        // call firebase wrapper
    }

    public override onEnter(): void {
        // delete the secret ASAP
        this.context.passwordValue = "";
        this.context.callbackEnableLoginButton?.(false);
        this.context.callbackEnableEmailInput?.(false);
        this.context.callbackEnablePasswordInput?.(false);
    }
}
