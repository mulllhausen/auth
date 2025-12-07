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
import { StateToSVGMapperService } from "./state-to-svg-mapper-service";

export const EmailEvents = {
    IdleNoText: "IdleNoText",
    UserInputtingText: "UserInputtingText",
    UserClickedLogin: "UserClickedLogin",
} as const;

const EventData = {};

export class EmailSignInFSMContext {
    private stateToSVGMapperService: StateToSVGMapperService;
    private state: EmailSignInState;

    constructor(props: {
        stateToSVGMapperService: StateToSVGMapperService;
        emailSignInState: EmailSignInState;
    }) {
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.state = new Idle({ context: this, logger: null });
    }

    public setup() {
        this.initEvents();
    }

    private initEvents() {
        (Object.keys(EmailEvents) as Array<keyof typeof EmailEvents>).forEach(
            (emailEvent) => {
                window.addEventListener(emailEvent, (e: Event) =>
                    this.state.handle(
                        emailEvent,
                        (e as StateMachineEvent).detail,
                    ),
                );
            },
        );
    }

    public transitionTo(state: EmailSignInState): void {
        console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
        this.state = state;
    }
}

export abstract class EmailSignInState {
    protected context: EmailSignInFSMContext;
    public logger: ((logItem: LogItem) => void) | null = null;

    constructor(props: {
        context: EmailSignInFSMContext;
        logger: ((logItem: LogItem) => void) | null;
    }) {
        this.context = props.context;
        this.logger = props.logger;
    }

    public abstract handle(
        eventType: keyof typeof EmailEvents,
        eventData: typeof EventData,
    ): void;

    protected abstract onExit(): void;
    protected abstract onEnter(): void;
}

export class Idle extends EmailSignInState {
    public override handle(
        eventType: keyof typeof EmailEvents,
        eventData: typeof EventData,
    ): void {
        this.onExit();
        switch (eventType) {
            case EmailEvents.IdleNoText:
                break;
            case EmailEvents.UserInputtingText:
            //this.context.transitionTo(new UserInputtingTextState());
            case EmailEvents.UserClickedLogin:
                break;
        }
    }

    protected override onExit(): void {}

    protected override onEnter(): void {}
}
