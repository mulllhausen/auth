// notes:
// finite state machines transition between states

// the idea with this state machine (service) is that you should pass it a DTO of all the data you
// currently have and it will decide which state to transition to. all business logic for the login
// belongs here, including callbacks that control rendering the GUI.

// the state machine sits just above the firebase wrapper in the hierarchy. it calls methods in the
// firebase wrapper and the firebase wrapper never calls it, except by invoking the callbacks it has
// been given by this service.

import { dbSaveUser } from "./db-user.ts";
import type {
    TAuthProvider,
    TFirebaseWrapperStateDTO,
} from "./firebase-wrapper.ts";
import { authProviders, FirebaseAuthService } from "./firebase-wrapper.ts";
import type { TLogItem } from "./gui-logger.ts";
import type { TGUIStateDTO } from "./index.ts";
import { StateToSVGMapperServiceGoogle } from "./state-to-svg-mapper-service-google.ts";
import { wait } from "./utils.ts";
import {
    googleProfilePicRegex,
    validateProfilePicUrl,
} from "./validators/user.ts";

// #region consts and types

/** this is the only DTO you need to pass data to the google state machine */
export type TGoogleStateDTO = Partial<TGUIStateDTO & TFirebaseWrapperStateDTO>;

type TGoogleSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: GoogleSignInFSMContext;
    stateToSVGMapperService?: StateToSVGMapperServiceGoogle;
    logger?: (logItem: TLogItem) => void;
};

type TGoogleSignInStateConstructor<
    TState extends GoogleSignInState = GoogleSignInState,
> = new (props: TGoogleSignInStateConstructorProps) => TState;

const googleFSMStateIDs = [
    "Idle",
    "RedirectingToGoogle",
    "GoogleResponded",
    "GoogleIsUnavailable",
    "GoogleAuthFailed",
    "SignedIn",
] as const;
export type TGoogleFSMStateID = (typeof googleFSMStateIDs)[number];

const token: unique symbol = Symbol("token");

// #endregion consts and types

export class GoogleSignInFSMContext {
    private _window: Window & typeof globalThis;
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService?: StateToSVGMapperServiceGoogle;
    private currentState?: GoogleSignInState; // todo - prevent setting except via transitionTo()
    private logger?: (logItemInput: TLogItem) => void;
    private localStorageGoogleStateKey = "googleState";
    private stateMap: Record<TGoogleFSMStateID, TGoogleSignInStateConstructor> =
        {
            Idle: IdleState,
            RedirectingToGoogle: RedirectingToGoogleState,
            GoogleResponded: GoogleRespondedState,
            GoogleIsUnavailable: GoogleIsUnavailableState,
            GoogleAuthFailed: GoogleAuthFailedState,
            SignedIn: SignedInState,
        };

    // callbacks
    public callbackSetTab?: (authProvider: TAuthProvider) => void;
    public callbackEnableLoginButton?: (enabled: boolean) => void;

    constructor(props: {
        window: Window & typeof globalThis;
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService?: StateToSVGMapperServiceGoogle;
        logger?: (logItemInput: TLogItem) => void;
        callbackSetTab?: (authProvider: TAuthProvider) => void;
        callbackEnableLoginButton?: (enabled: boolean) => void;
    }) {
        this._window = props.window;
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
        this.callbackSetTab = props.callbackSetTab;
        this.callbackEnableLoginButton = props.callbackEnableLoginButton;

        this.firebaseAuthService.subscribeStateChanged(this.handle.bind(this));
    }

    /** note: call setup() once immediately after the constructor */
    public async setup(): Promise<void> {
        const googleFSMStateID = this.getStateFromLocalstorage();
        const googleSignInStateConstructor = googleFSMStateID
            ? this.stateMap[googleFSMStateID]
            : IdleState;

        await this.transitionTo(
            token,
            googleSignInStateConstructor, // init. a class is required.
        );
    }

    /** should always be called by an action external to this FSM */
    public async handle(googleStateDTO: TGoogleStateDTO): Promise<void> {
        await this.currentState?.handle(googleStateDTO);
    }

    public async transitionTo<TState extends GoogleSignInState>(
        fsmToken: typeof token, // prevent external access
        newStateClass: TGoogleSignInStateConstructor<TState>,
    ): Promise<GoogleSignInState> {
        if (fsmToken !== token) {
            throw new Error(`incorrect transition token`);
        }
        const oldStateID = this.currentState
            ? this.currentState.ID
            : (this.getStateFromLocalstorage() ?? "null");

        this.currentState = await this.setState(newStateClass);
        const newStateID = this.currentState.ID;
        if (newStateID === oldStateID) {
            this.logger?.({
                logMessage:
                    `old & new google state: <code>${oldStateID}</code>.` +
                    ` no transition needed.`,
            });
            return this.currentState;
        }

        this.logger?.({
            logMessage:
                `transitioned google state from <code>${oldStateID}</code>` +
                ` to <code>${newStateID}</code>`,
        });

        await this.currentState.onEnter();

        return this.currentState;
    }

    private async setState<TState extends GoogleSignInState>(
        newStateClass: TGoogleSignInStateConstructor<TState>,
    ): Promise<GoogleSignInState> {
        this.callbackSetTab?.(authProviders.Google);
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

    private getStateFromLocalstorage(): TGoogleFSMStateID | null {
        return this._window.localStorage.getItem(
            this.localStorageGoogleStateKey,
        ) as TGoogleFSMStateID | null;
    }

    private backupStateToLocalstorage(
        googleFSMStateID: TGoogleFSMStateID,
    ): void {
        this._window.localStorage.setItem(
            this.localStorageGoogleStateKey,
            googleFSMStateID as string,
        );
    }

    public deleteStateFromLocalstorage(): void {
        this._window.localStorage.removeItem(this.localStorageGoogleStateKey);
    }
}

abstract class GoogleSignInState {
    public abstract readonly ID: TGoogleFSMStateID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: GoogleSignInFSMContext;
    protected stateToSVGMapperService?: StateToSVGMapperServiceGoogle;

    constructor(props: TGoogleSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
    }

    public abstract handle(googleStateDTO: TGoogleStateDTO): Promise<void>;
    public abstract onEnter(): Promise<void>;
}

class IdleState extends GoogleSignInState {
    public override readonly ID = "Idle";

    public override async handle(
        googleStateDTO: TGoogleStateDTO,
    ): Promise<void> {
        if (googleStateDTO?.foundAccessToken == authProviders.Google) {
            this.context.log("google fsm: detected user is signed in");
            await this.context.transitionTo(token, SignedInState);
            return;
        }
        if (googleStateDTO?.isGoogleLoginClicked) {
            await this.context.transitionTo(token, RedirectingToGoogleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(true);
    }
}

class RedirectingToGoogleState extends GoogleSignInState {
    public override readonly ID = "RedirectingToGoogle";

    public override async handle(
        googleStateDTO: TGoogleStateDTO,
    ): Promise<void> {
        if (googleStateDTO?.userNotSignedIn) {
            this.context.log("google fsm: detected user is signed out");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (
            googleStateDTO?.failedToRedirectToAuthProvider ===
            authProviders.Google
        ) {
            await this.context.transitionTo(token, GoogleIsUnavailableState);
            return;
        }

        if (googleStateDTO?.checkingRedirectResult) {
            await this.context.transitionTo(token, GoogleRespondedState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(false);
        await this.firebaseAuthService.signin(authProviders.Google);
    }
}

class GoogleRespondedState extends GoogleSignInState {
    public override readonly ID = "GoogleResponded";

    public override async handle(
        googleStateDTO: TGoogleStateDTO,
    ): Promise<void> {
        if (googleStateDTO?.userNotSignedIn) {
            this.context.log("google fsm: detected user is signed out");
            await this.context.transitionTo(token, GoogleAuthFailedState);
            return;
        }

        if (googleStateDTO?.nullCredentialAfterRedirect) {
            await this.context.transitionTo(token, GoogleAuthFailedState);
            return;
        }

        if (googleStateDTO?.foundAccessToken == authProviders.Google) {
            this.context.log("google fsm: detected user is signed in");

            const googleProfilePicUrl =
                this.firebaseAuthService.User?.[authProviders.Google]?.photoURL;
            if (
                !validateProfilePicUrl(
                    authProviders.Google,
                    googleProfilePicUrl,
                )
            ) {
                this.context.log(
                    `google fsm: profile pic url <code>${googleProfilePicUrl}</code> was not ` +
                        `in the format <code>${googleProfilePicRegex.source}</code>`,
                );
            }
            await this.context.transitionTo(token, SignedInState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {}
}

class GoogleAuthFailedState extends GoogleSignInState {
    public override readonly ID = "GoogleAuthFailed";

    public override async handle(
        googleStateDTO: TGoogleStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class GoogleIsUnavailableState extends GoogleSignInState {
    public override readonly ID = "GoogleIsUnavailable";

    public override async handle(
        googleStateDTO: TGoogleStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class SignedInState extends GoogleSignInState {
    public override readonly ID = "SignedIn";

    public override async handle(
        googleStateDTO: TGoogleStateDTO,
    ): Promise<void> {
        if (googleStateDTO?.userNotSignedIn) {
            this.context.log("google fsm: detected user is signed out");
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        dbSaveUser(this.firebaseAuthService.User);
    }
}
