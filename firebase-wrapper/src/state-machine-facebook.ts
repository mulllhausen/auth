// notes:
// finite state machines transition between states

// the idea with this state machine (service) is that you should pass it a DTO of all the data you
// currently have and it will decide which state to transition to. all business logic for the login
// belongs here, including callbacks that control rendering the GUI.

// the state machine sits just above the firebase wrapper in the hierarchy. it calls methods in the
// firebase wrapper and the firebase wrapper never calls it, except by invoking the callbacks it has
// been given by this service.

import type { TGUIStateDTO } from ".";
import type { TFirebaseWrapperStateDTO } from "./firebase-wrapper.ts";
import { authProviders, FirebaseAuthService } from "./firebase-wrapper.ts";
import type { TLogItem } from "./gui-logger.ts";
import { StateToSVGMapperServiceFacebook } from "./state-to-svg-mapper-service-facebook.ts";

// #region consts and types

/** this is the only DTO you need to pass data to the facebook state machine */
export type TFacebookStateDTO = Partial<
    TGUIStateDTO & TFirebaseWrapperStateDTO
>;

type TFacebookSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: FacebookSignInFSMContext;
    stateToSVGMapperService?: StateToSVGMapperServiceFacebook;
    logger?: (logItem: TLogItem) => void;
};

type TFacebookSignInStateConstructor<
    TState extends FacebookSignInState = FacebookSignInState,
> = new (props: TFacebookSignInStateConstructorProps) => TState;

const facebookFSMStateIDs = [
    "Idle",
    "RedirectingToFacebook",
    "FacebookResponded",
    "FacebookIsUnavailable",
    "SignedIn",
] as const;
export type TFacebookFSMStateID = (typeof facebookFSMStateIDs)[number];

const transitionToken: unique symbol = Symbol("transitionToken");

// #endregion consts and types

export class FacebookSignInFSMContext {
    private _window: Window & typeof globalThis;
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService?: StateToSVGMapperServiceFacebook;
    private currentState?: FacebookSignInState;
    private logger?: (logItemInput: TLogItem) => void;
    private localStorageFacebookStateKey = "facebookState";
    private stateMap: Record<
        TFacebookFSMStateID,
        TFacebookSignInStateConstructor
    > = {
        Idle: IdleState,
        RedirectingToFacebook: RedirectingToFacebookState,
        FacebookResponded: FacebookRespondedState,
        FacebookIsUnavailable: FacebookIsUnavailableState,
        SignedIn: SignedInState,
    };

    // callbacks
    public callbackEnableLoginButton?: (enabled: boolean) => void;

    constructor(props: {
        window: Window & typeof globalThis;
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService?: StateToSVGMapperServiceFacebook;
        logger?: (logItemInput: TLogItem) => void;
        callbackEnableLoginButton?: (enabled: boolean) => void;
    }) {
        this._window = props.window;
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
        this.callbackEnableLoginButton = props.callbackEnableLoginButton;

        this.firebaseAuthService.subscribeStateChanged(this.handle.bind(this));
    }

    /** note: call setup() once immediately after the constructor */
    public async setup(): Promise<void> {
        const facebookSignInStateConstructor = this.getStateFromLocalstorage();
        this.currentState = await this.transitionTo(
            transitionToken,
            facebookSignInStateConstructor, // init. a class is required.
        );
        await this.firebaseAuthService.checkIfURLIsASignInRedirectResult();
        await this.firebaseAuthService.setupFirebaseListeners();
    }

    /** should always be called by an action external to this FSM */
    public async handle(facebookStateDTO: TFacebookStateDTO): Promise<void> {
        const skipCurrentStateHandler =
            await this.currentState?.overrideStateHandler(facebookStateDTO);
        if (skipCurrentStateHandler) return;

        await this.currentState?.handle(facebookStateDTO);
    }

    public async transitionTo<TState extends FacebookSignInState>(
        token: typeof transitionToken, // prevent external access
        newStateClass: TFacebookSignInStateConstructor<TState>,
    ): Promise<FacebookSignInState> {
        if (token !== transitionToken) {
            throw new Error(`incorrect transition token`);
        }
        const oldStateID = this.currentState ? this.currentState.ID : "null";

        this.currentState = new newStateClass({
            firebaseAuthService: this.firebaseAuthService,
            context: this,
            stateToSVGMapperService: this.stateToSVGMapperService,
            logger: this.logger,
        });

        const newStateID = this.currentState.ID;
        if (newStateID === oldStateID) {
            this.logger?.({
                logMessage:
                    `old & new facebook state: <i>${oldStateID}</i>.` +
                    ` no transition needed.`,
            });
            return this.currentState;
        }

        this.stateToSVGMapperService?.enqueue(newStateID);
        this.backupStateToLocalstorage(newStateID);
        this.logger?.({
            logMessage:
                `transitioned facebook state from <i>${oldStateID}</i>` +
                ` to <i>${newStateID}</i>`,
        });

        await this.currentState.onEnter();

        return this.currentState;
    }

    // localstorage functions

    private getStateFromLocalstorage(): TFacebookSignInStateConstructor {
        const facebookFSMStateID = this._window.localStorage.getItem(
            this.localStorageFacebookStateKey,
        ) as TFacebookFSMStateID | null;
        if (facebookFSMStateID == null) return IdleState;
        return this.stateMap[facebookFSMStateID];
    }

    private backupStateToLocalstorage(
        facebookFSMStateID: TFacebookFSMStateID,
    ): void {
        this._window.localStorage.setItem(
            this.localStorageFacebookStateKey,
            facebookFSMStateID as string,
        );
    }

    public deleteStateFromLocalstorage(): void {
        this._window.localStorage.removeItem(this.localStorageFacebookStateKey);
    }
}

abstract class FacebookSignInState {
    public abstract readonly ID: TFacebookFSMStateID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: FacebookSignInFSMContext;
    protected stateToSVGMapperService?: StateToSVGMapperServiceFacebook;
    protected logger?: (logItem: TLogItem) => void;

    constructor(props: TFacebookSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
    }

    public abstract handle(facebookStateDTO: TFacebookStateDTO): Promise<void>;
    public abstract onEnter(): Promise<void>;

    protected log(logMessage: string): void {
        this.logger?.({ logMessage });
    }

    public async overrideStateHandler(
        facebookStateDTO?: TFacebookStateDTO,
    ): Promise<boolean> {
        let skipCurrentStateLogic = false;
        if (facebookStateDTO?.userCredentialFoundViaFacebook) {
            this.log("facebook fsm: detected user already signed in");
            await this.context.transitionTo(transitionToken, SignedInState);
            skipCurrentStateLogic = true;
        }
        if (facebookStateDTO?.signedOutUser) {
            this.log("facebook fsm: detected user already signed out");
            await this.context.transitionTo(transitionToken, IdleState);
            skipCurrentStateLogic = true;
        }
        return skipCurrentStateLogic;
    }
}

class IdleState extends FacebookSignInState {
    public override readonly ID = "Idle";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (facebookStateDTO?.isFacebookLoginClicked) {
            await this.context.transitionTo(
                transitionToken,
                RedirectingToFacebookState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(true);
    }
}

class RedirectingToFacebookState extends FacebookSignInState {
    public override readonly ID = "RedirectingToFacebook";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (
            facebookStateDTO?.redirectedToAuthProvider ===
            authProviders.Facebook
        ) {
            await this.context.transitionTo(
                transitionToken,
                FacebookRespondedState,
            );
            return;
        }

        if (
            facebookStateDTO?.failedToRedirectToAuthProvider ===
            authProviders.Facebook
        ) {
            await this.context.transitionTo(
                transitionToken,
                FacebookIsUnavailableState,
            );
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(false);
        await this.firebaseAuthService.signin(authProviders.Facebook);
    }
}

class FacebookRespondedState extends FacebookSignInState {
    public override readonly ID = "FacebookResponded";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {}
}

class FacebookIsUnavailableState extends FacebookSignInState {
    public override readonly ID = "FacebookIsUnavailable";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {}
}

class SignedInState extends FacebookSignInState {
    public override readonly ID = "SignedIn";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {}
}
