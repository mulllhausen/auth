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

export type TEmailEventValues = (typeof EmailEvents)[keyof typeof EmailEvents];

type TEmailSignInStateConstructor<
    T extends EmailSignInState = EmailSignInState,
> = new (props: {
    context: EmailSignInFSMContext;
    stateToSVGMapperService: StateToSVGMapperService;
    logger: ((logItem: LogItem) => void) | null;
}) => T;

export const EmailEvents = {
    IdleNoText: "IdleNoText",
    UserInputtingText: "UserInputtingText",
    UserClickedLogin: "UserClickedLogin",
} as const;

export type TEmailEventPayloads = {
    [EmailEvents.IdleNoText]: void;
    [EmailEvents.UserInputtingText]: { inputEmailValue: string };
    [EmailEvents.UserClickedLogin]: {
        inputEmailValue: string;
        inputPasswordValue: string;
    };
};

export type TStateMachineEvent<TEvent extends TEmailEventValues> = CustomEvent<
    TEmailEventPayloads[TEvent]
>;

export class EmailSignInFSMContext {
    private stateToSVGMapperService: StateToSVGMapperService;
    private state: EmailSignInState;

    constructor(props: {
        stateToSVGMapperService: StateToSVGMapperService;
        //emailSignInState: EmailSignInState;
    }) {
        debugger;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.state = this.transitionTo(Idle);
        this.handle({ eventType: "IdleNoText" });
        // this.state = new Idle({
        //     context: this,
        //     stateToSVGMapperService: this.stateToSVGMapperService,
        //     logger: null,
        // });
    }

    // public setup() {
    //     this.initEvents();
    // }

    // private initEvents() {
    //     (Object.values(EmailEvents) as TEmailEventValues[]).forEach(
    //         (emailEvent: TEmailEventValues) => {
    //             document.addEventListener(emailEvent, (e: Event) => {
    //                 const fsmEvent = e as TStateMachineEvent<typeof emailEvent>;
    //                 this.state.handle(emailEvent, fsmEvent.detail);
    //             });
    //         },
    //     );
    // }

    public handle<TEvent extends TEmailEventValues>(props: {
        eventType: TEvent;
        eventData?: TEmailEventPayloads[TEvent];
    }): void {
        this.state?.handle(props.eventType, props.eventData);
    }

    // public transitionTo(state: EmailSignInState): void {
    //     console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
    //     this.state = state;
    // }
    public transitionTo<T extends EmailSignInState>(
        StateClass: TEmailSignInStateConstructor<T>,
    ): EmailSignInState {
        const oldStateName = this.state
            ? (this.state as any).constructor.name
            : "null";

        this.state = new StateClass({
            context: this,
            stateToSVGMapperService: this.stateToSVGMapperService,
            logger: null,
        });

        const newStateName = (this.state as any).constructor.name;
        console.log(`Context: Transition ${oldStateName} -> ${newStateName}.`);
        return this.state; // just to make the constructor shut up
    }
}

export abstract class EmailSignInState {
    protected context: EmailSignInFSMContext;
    protected stateToSVGMapperService: StateToSVGMapperService;
    public logger: ((logItem: LogItem) => void) | null = null;

    constructor(props: {
        context: EmailSignInFSMContext;
        stateToSVGMapperService: StateToSVGMapperService;
        logger: ((logItem: LogItem) => void) | null;
    }) {
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
    }

    public abstract handle<TEvent extends TEmailEventValues>(
        eventType: TEvent,
        eventData?: TEmailEventPayloads[TEvent],
    ): void;

    protected abstract onExit(): void;
    protected abstract onEnter(): void;
}

export class Idle extends EmailSignInState {
    public override handle<TEvent extends TEmailEventValues>(
        eventType: TEvent,
        eventData?: TEmailEventPayloads[TEvent],
    ): void {
        debugger;
        this.onExit();
        const anyEmailText = (eventData?.inputEmailValue ?? "").length > 0;
        switch (eventType) {
            case EmailEvents.IdleNoText:
                break;
            case EmailEvents.UserInputtingText:
                if (!anyEmailText) {
                    console.log(
                        `no email found. unable to transition to UserInputtingText state`,
                    );
                    return;
                }
                this.context.transitionTo(UserInputtingTextState);
                break;
            case EmailEvents.UserClickedLogin:
                break;
        }
        this.stateToSVGMapperService.updateSvg(eventType);
    }

    protected override onExit(): void {}

    protected override onEnter(): void {}
}

export class UserInputtingTextState extends EmailSignInState {
    public override handle<TEvent extends TEmailEventValues>(
        eventType: TEvent,
        eventData?: TEmailEventPayloads[TEvent],
    ): void {
        debugger;
        this.onExit();
        switch (eventType) {
            case EmailEvents.IdleNoText:
                this.context.transitionTo(Idle);
                break;
            case EmailEvents.UserInputtingText:
                //this.context.transitionTo(UserInputtingTextState);
                //this.stateToSVGMapperService.updateSvg(state);
                break;
            case EmailEvents.UserClickedLogin:
                break;
        }
        this.stateToSVGMapperService.updateSvg(eventType);
    }

    protected override onExit(): void {}

    protected override onEnter(): void {}
}
