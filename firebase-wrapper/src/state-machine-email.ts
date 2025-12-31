// notes:
// finite state machines transition between states
// one action method should not call another action method. each action method represents a single
// transition so having 1 call another would blur the boundaries between states and result in tight
// coupling.

// the idea with this state machine is that you should pass it all the data you currently have and
// it will decide which state to transition to
// it would be nice if the state machine could just be initialised and then take it from there - calling
// all the methods it needs in the firebase wrapper to decide if it needs to transition

import { LogItem } from "./gui-logger";
import { StateToSVGMapperService } from "./state-to-svg-mapper-service";

// #region consts and types

/** this is the only DTO you need to pass data to the email state machine */
export type TEmailStateDTO = {
    inputEmailValue?: string;
    inputPasswordValue?: string;
};

type TEmailSignInStateConstructor<
    TState extends EmailSignInState = EmailSignInState,
> = new (props: {
    context: EmailSignInFSMContext;
    stateToSVGMapperService: StateToSVGMapperService;
    logger: ((logItem: LogItem) => void) | null;
}) => TState;

const emailFSMID = ["Idle", "UserInputtingText"] as const;
export type TEmailFSMID = (typeof emailFSMID)[number];

// #endregion consts and types

export class EmailSignInFSMContext {
    private stateToSVGMapperService: StateToSVGMapperService;
    private state: EmailSignInState;
    private logger: (logItemInput: LogItem) => void | null;

    constructor(props: {
        stateToSVGMapperService: StateToSVGMapperService;
        logger: (logItemInput: LogItem) => void | null;
    }) {
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
        this.state = this.transitionTo(IdleState); // init. a class is required.
        //this.handle(); // change state if necessary
    }

    public handle(emailStateDTO?: TEmailStateDTO): void {
        this.state?.handle(emailStateDTO);
    }

    // todo: hide this from clients
    public transitionTo<T extends EmailSignInState>(
        StateClass: TEmailSignInStateConstructor<T>,
    ): EmailSignInState {
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
        return this.state;
    }
}

abstract class EmailSignInState {
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService: StateToSVGMapperService;
    protected logger: ((logItem: LogItem) => void) | null = null;
    public abstract readonly ID: TEmailFSMID;

    constructor(props: {
        context: EmailSignInFSMContext;
        stateToSVGMapperService: StateToSVGMapperService;
        logger: ((logItem: LogItem) => void) | null;
    }) {
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
    }

    public abstract handle(emailStateDTO?: TEmailStateDTO): void;
}

class IdleState extends EmailSignInState {
    public override readonly ID = "Idle";
    public override handle(emailStateDTO?: TEmailStateDTO): void {
        const anyEmailText = (emailStateDTO?.inputEmailValue ?? "").length > 0;
        this.logger?.({
            logMessage: `${anyEmailText ? "" : "no "}email found in input`,
        });
        if (anyEmailText) {
            this.context.transitionTo(UserInputtingTextState);
        }
    }
}

class UserInputtingTextState extends EmailSignInState {
    public override readonly ID = "UserInputtingText";
    public override handle(emailStateDTO?: TEmailStateDTO): void {
        const anyEmailText = (emailStateDTO?.inputEmailValue ?? "").length > 0;
        this.logger?.({
            logMessage: `${anyEmailText ? "" : "no "}email found in input`,
        });
        if (!anyEmailText) {
            this.context.transitionTo(IdleState);
        }
    }
}
