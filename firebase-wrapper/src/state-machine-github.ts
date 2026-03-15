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
import { StateToSVGMapperServiceGithub } from "./state-to-svg-mapper-service-github.ts";
import { wait } from "./utils.ts";
import {
    githubProfilePicRegex,
    validateProfilePicUrl,
} from "./validators/user.ts";

// #region consts and types

/** this is the only DTO you need to pass data to the github state machine */
export type TGithubStateDTO = Partial<TGUIStateDTO & TFirebaseWrapperStateDTO>;

type TGithubSignInStateConstructorProps = {
    firebaseAuthService: FirebaseAuthService;
    context: GithubSignInFSMContext;
    stateToSVGMapperService?: StateToSVGMapperServiceGithub;
    logger?: (logItem: TLogItem) => void;
};

type TGithubSignInStateConstructor<
    TState extends GithubSignInState = GithubSignInState,
> = new (props: TGithubSignInStateConstructorProps) => TState;

const githubFSMStateIDs = [
    "Idle",
    "RedirectingToGithub",
    "GithubResponded",
    "GithubIsUnavailable",
    "GithubAuthFailed",
    "SignedIn",
] as const;
export type TGithubFSMStateID = (typeof githubFSMStateIDs)[number];

const token: unique symbol = Symbol("token");

// #endregion consts and types

export class GithubSignInFSMContext {
    private _window: Window & typeof globalThis;
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService?: StateToSVGMapperServiceGithub;
    private currentState?: GithubSignInState; // todo - prevent setting except via transitionTo()
    private logger?: (logItemInput: TLogItem) => void;
    private localStorageGithubStateKey = "githubState";
    private stateMap: Record<TGithubFSMStateID, TGithubSignInStateConstructor> =
        {
            Idle: IdleState,
            RedirectingToGithub: RedirectingToGithubState,
            GithubResponded: GithubRespondedState,
            GithubIsUnavailable: GithubIsUnavailableState,
            GithubAuthFailed: GithubAuthFailedState,
            SignedIn: SignedInState,
        };

    // callbacks
    public callbackSetTab?: (authProvider: TAuthProvider) => void;
    public callbackEnableLoginButton?: (enabled: boolean) => void;

    constructor(props: {
        window: Window & typeof globalThis;
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService?: StateToSVGMapperServiceGithub;
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
        const githubFSMStateID = this.getStateFromLocalstorage();
        const githubSignInStateConstructor = githubFSMStateID
            ? this.stateMap[githubFSMStateID]
            : IdleState;

        await this.transitionTo(
            token,
            githubSignInStateConstructor, // init. a class is required.
        );
    }

    /** should always be called by an action external to this FSM */
    public async handle(githubStateDTO: TGithubStateDTO): Promise<void> {
        await this.currentState?.handle(githubStateDTO);
    }

    public async transitionTo<TState extends GithubSignInState>(
        fsmToken: typeof token, // prevent external access
        newStateClass: TGithubSignInStateConstructor<TState>,
    ): Promise<GithubSignInState> {
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
                    `old & new github state: <code>${oldStateID}</code>.` +
                    ` no transition needed.`,
            });
            return this.currentState;
        }

        this.logger?.({
            logMessage:
                `transitioned github state from <code>${oldStateID}</code>` +
                ` to <code>${newStateID}</code>`,
        });

        await this.currentState.onEnter();

        return this.currentState;
    }

    private async setState<TState extends GithubSignInState>(
        newStateClass: TGithubSignInStateConstructor<TState>,
    ): Promise<GithubSignInState> {
        this.callbackSetTab?.(authProviders.Github);
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

    private getStateFromLocalstorage(): TGithubFSMStateID | null {
        return this._window.localStorage.getItem(
            this.localStorageGithubStateKey,
        ) as TGithubFSMStateID | null;
    }

    private backupStateToLocalstorage(
        githubFSMStateID: TGithubFSMStateID,
    ): void {
        this._window.localStorage.setItem(
            this.localStorageGithubStateKey,
            githubFSMStateID as string,
        );
    }

    public deleteStateFromLocalstorage(): void {
        this._window.localStorage.removeItem(this.localStorageGithubStateKey);
    }
}

abstract class GithubSignInState {
    public abstract readonly ID: TGithubFSMStateID;
    protected firebaseAuthService: FirebaseAuthService;
    protected context: GithubSignInFSMContext;
    protected stateToSVGMapperService?: StateToSVGMapperServiceGithub;

    constructor(props: TGithubSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
    }

    public abstract handle(githubStateDTO: TGithubStateDTO): Promise<void>;
    public abstract onEnter(): Promise<void>;
}

class IdleState extends GithubSignInState {
    public override readonly ID = "Idle";

    public override async handle(
        githubStateDTO: TGithubStateDTO,
    ): Promise<void> {
        if (githubStateDTO?.foundToken == authProviders.Github) {
            this.context.log("github fsm: detected user is signed in");
            await this.context.transitionTo(token, SignedInState);
            return;
        }
        if (githubStateDTO?.isGithubLoginClicked) {
            await this.context.transitionTo(token, RedirectingToGithubState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(true);
    }
}

class RedirectingToGithubState extends GithubSignInState {
    public override readonly ID = "RedirectingToGithub";

    public override async handle(
        githubStateDTO: TGithubStateDTO,
    ): Promise<void> {
        if (githubStateDTO?.userNotSignedIn) {
            this.context.log("github fsm: detected user is signed out");
            await this.context.transitionTo(token, IdleState);
            return;
        }

        if (
            githubStateDTO?.failedToRedirectToAuthProvider ===
            authProviders.Github
        ) {
            await this.context.transitionTo(token, GithubIsUnavailableState);
            return;
        }

        if (githubStateDTO?.checkingRedirectResult) {
            await this.context.transitionTo(token, GithubRespondedState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(false);
        await this.firebaseAuthService.signin(authProviders.Github);
    }
}

class GithubRespondedState extends GithubSignInState {
    public override readonly ID = "GithubResponded";

    public override async handle(
        githubStateDTO: TGithubStateDTO,
    ): Promise<void> {
        if (githubStateDTO?.userNotSignedIn) {
            this.context.log("github fsm: detected user is signed out");
            await this.context.transitionTo(token, GithubAuthFailedState);
            return;
        }

        if (githubStateDTO?.nullCredentialAfterRedirect) {
            await this.context.transitionTo(token, GithubAuthFailedState);
            return;
        }

        if (githubStateDTO?.foundToken == authProviders.Github) {
            this.context.log("github fsm: detected user is signed in");

            const githubProfilePicUrl =
                this.firebaseAuthService.User?.[authProviders.Github]?.photoURL;
            if (
                !validateProfilePicUrl(
                    authProviders.Github,
                    githubProfilePicUrl,
                )
            ) {
                this.context.log(
                    `github fsm: profile pic url <code>${githubProfilePicUrl}</code> was not ` +
                        `in the format <code>${githubProfilePicRegex.source}</code>`,
                );
            }
            await this.context.transitionTo(token, SignedInState);

            return;
        }
    }

    public override async onEnter(): Promise<void> {}
}

class GithubAuthFailedState extends GithubSignInState {
    public override readonly ID = "GithubAuthFailed";

    public override async handle(
        githubStateDTO: TGithubStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class GithubIsUnavailableState extends GithubSignInState {
    public override readonly ID = "GithubIsUnavailable";

    public override async handle(
        githubStateDTO: TGithubStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class SignedInState extends GithubSignInState {
    public override readonly ID = "SignedIn";

    public override async handle(
        githubStateDTO: TGithubStateDTO,
    ): Promise<void> {
        if (githubStateDTO?.userNotSignedIn) {
            this.context.log("github fsm: detected user is signed out");
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        dbSaveUser(this.firebaseAuthService.User);
    }
}
