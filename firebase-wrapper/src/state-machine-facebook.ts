// notes:
// finite state machines transition between states

// the idea with this state machine (service) is that you should pass it a DTO of all the data you
// currently have and it will decide which state to transition to. all business logic for the login
// belongs here, including callbacks that control rendering the GUI.

// the state machine sits just above the firebase wrapper in the hierarchy. it calls methods in the
// firebase wrapper and the firebase wrapper never calls it, except by invoking the callbacks it has
// been given by this service.

import type { TGUIStateDTO } from ".";
import { dbSaveUser } from "./db-user.ts";
import type {
    TAuthProvider,
    TFirebaseWrapperStateDTO,
} from "./firebase-wrapper.ts";
import { authProviders, FirebaseAuthService } from "./firebase-wrapper.ts";
import type { TLogItem } from "./gui-logger.ts";
import { StateToSVGMapperServiceFacebook } from "./state-to-svg-mapper-service-facebook.ts";
import { wait } from "./utils.ts";
import {
    facebookProfilePicRegex,
    validateProfilePicUrl,
} from "./validators/user.ts";

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
    "CheckingRedirectResult",
    "FacebookIsUnavailable",
    "FacebookAuthFailed",
    "SignedIn",
    "GotProfilePic",
    "FailedToGetProfilePic",
    "SentLogoutRequest",
] as const;
export type TFacebookFSMStateID = (typeof facebookFSMStateIDs)[number];

const token: unique symbol = Symbol("token");

// #endregion consts and types

export class FacebookSignInFSMContext {
    private _window: Window & typeof globalThis;
    private firebaseAuthService: FirebaseAuthService;
    private stateToSVGMapperService?: StateToSVGMapperServiceFacebook;
    private currentState?: FacebookSignInState; // todo - prevent setting except via transitionTo()
    private logger?: (logItemInput: TLogItem) => void;
    private localStorageFacebookStateKey = "facebookState";
    private stateMap: Record<
        TFacebookFSMStateID,
        TFacebookSignInStateConstructor
    > = {
        Idle: IdleState,
        RedirectingToFacebook: RedirectingToFacebookState,
        CheckingRedirectResult: CheckingRedirectResultState,
        FacebookIsUnavailable: FacebookIsUnavailableState,
        FacebookAuthFailed: FacebookAuthFailedState,
        SignedIn: SignedInState,
        GotProfilePic: GotProfilePicState,
        FailedToGetProfilePic: FailedToGetProfilePicState,
        SentLogoutRequest: SentLogoutRequestState,
    };

    // callbacks
    public callbackSetProviderFocus?: (authProvider: TAuthProvider) => void;
    public callbackEnableLoginButton?: (enabled: boolean) => void;

    constructor(props: {
        window: Window & typeof globalThis;
        firebaseAuthService: FirebaseAuthService;
        stateToSVGMapperService?: StateToSVGMapperServiceFacebook;
        logger?: (logItemInput: TLogItem) => void;
        callbackSetProviderFocus?: (authProvider: TAuthProvider) => void;
        callbackEnableLoginButton?: (enabled: boolean) => void;
    }) {
        this._window = props.window;
        this.firebaseAuthService = props.firebaseAuthService;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
        this.logger = props.logger;
        this.callbackSetProviderFocus = props.callbackSetProviderFocus;
        this.callbackEnableLoginButton = props.callbackEnableLoginButton;

        this.firebaseAuthService.subscribeStateChanged(this.handle.bind(this));
    }

    /** note: call setup() once immediately after the constructor */
    public async setup(): Promise<void> {
        const facebookFSMStateID = this.getStateFromLocalstorage();
        const facebookSignInStateConstructor = facebookFSMStateID
            ? this.stateMap[facebookFSMStateID]
            : IdleState;

        await this.transitionTo(
            token,
            facebookSignInStateConstructor, // init. a class is required.
        );

        this.callbackEnableLoginButton?.(
            !this.firebaseAuthService.signedInStatus[authProviders.Facebook],
        );
    }

    /** should always be called by an action external to this FSM */
    public async handle(facebookStateDTO: TFacebookStateDTO): Promise<void> {
        await this.currentState?.handle(facebookStateDTO);
    }

    public async transitionTo<TState extends FacebookSignInState>(
        fsmToken: typeof token, // prevent external access
        newStateClass: TFacebookSignInStateConstructor<TState>,
    ): Promise<FacebookSignInState> {
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
                    `old & new facebook state: <code>${oldStateID}</code>.` +
                    ` no transition needed.`,
            });
            return this.currentState;
        }

        this.logger?.({
            logMessage:
                `transitioned facebook state from <code>${oldStateID}</code>` +
                ` to <code>${newStateID}</code>`,
        });

        await this.currentState.onEnter();

        return this.currentState;
    }

    private async setState<TState extends FacebookSignInState>(
        newStateClass: TFacebookSignInStateConstructor<TState>,
    ): Promise<FacebookSignInState> {
        this.callbackSetProviderFocus?.(authProviders.Facebook);
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

    private getStateFromLocalstorage(): TFacebookFSMStateID | null {
        return this._window.localStorage.getItem(
            this.localStorageFacebookStateKey,
        ) as TFacebookFSMStateID | null;
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

    constructor(props: TFacebookSignInStateConstructorProps) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.context = props.context;
        this.stateToSVGMapperService = props.stateToSVGMapperService;
    }

    public abstract handle(facebookStateDTO: TFacebookStateDTO): Promise<void>;
    public abstract onEnter(): Promise<void>;
}

class IdleState extends FacebookSignInState {
    public override readonly ID = "Idle";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (facebookStateDTO?.foundAccessToken == authProviders.Facebook) {
            this.context.log("facebook fsm: detected user is signed in");
            await this.context.transitionTo(token, SignedInState);
            return;
        }

        if (facebookStateDTO?.isFacebookLoginClicked) {
            await this.context.transitionTo(token, RedirectingToFacebookState);
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
        if (facebookStateDTO?.foundAccessToken == authProviders.Facebook) {
            this.context.log("facebook fsm: detected user is signed in");
            await this.context.transitionTo(token, SignedInState);
            return;
        }

        if (facebookStateDTO?.isLogoutClicked) {
            await this.context.transitionTo(token, SentLogoutRequestState);
            return;
        }

        if (
            facebookStateDTO?.failedToRedirectToAuthProvider ===
            authProviders.Facebook
        ) {
            await this.context.transitionTo(token, FacebookIsUnavailableState);
            return;
        }

        if (facebookStateDTO?.checkingRedirectResult) {
            await this.context.transitionTo(token, CheckingRedirectResultState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        this.context.callbackEnableLoginButton?.(false);
        await this.firebaseAuthService.signin(authProviders.Facebook);
    }
}

class CheckingRedirectResultState extends FacebookSignInState {
    public override readonly ID = "CheckingRedirectResult";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (facebookStateDTO?.foundAccessToken == authProviders.Facebook) {
            this.context.log("facebook fsm: detected user is signed in");
            await this.context.transitionTo(token, SignedInState);
            return;
        }

        if (facebookStateDTO?.isLogoutClicked) {
            await this.context.transitionTo(token, SentLogoutRequestState);
            return;
        }

        if (facebookStateDTO?.nullCredentialAfterRedirect) {
            await this.context.transitionTo(token, FacebookAuthFailedState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {}
}

class FacebookAuthFailedState extends FacebookSignInState {
    public override readonly ID = "FacebookAuthFailed";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class FacebookIsUnavailableState extends FacebookSignInState {
    public override readonly ID = "FacebookIsUnavailable";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class SignedInState extends FacebookSignInState {
    public override readonly ID = "SignedIn";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (facebookStateDTO?.gotProfilePic == authProviders.Facebook) {
            const fbProfilePicUrl =
                this.firebaseAuthService.User?.[authProviders.Facebook]
                    ?.photoURL;
            if (
                validateProfilePicUrl(authProviders.Facebook, fbProfilePicUrl)
            ) {
                await this.context.transitionTo(token, GotProfilePicState);
                return;
            } else {
                this.context.log(
                    `facebook fsm: profile pic url <code>${fbProfilePicUrl}</code> was not ` +
                        `in the format <code>${facebookProfilePicRegex.source}</code>`,
                );
                await this.context.transitionTo(
                    token,
                    FailedToGetProfilePicState,
                );
                return;
            }
        }

        if (facebookStateDTO?.isLogoutClicked) {
            await this.context.transitionTo(token, SentLogoutRequestState);
            return;
        }

        if (facebookStateDTO?.failedToGetProfilePic == authProviders.Facebook) {
            await this.context.transitionTo(token, FailedToGetProfilePicState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        dbSaveUser(this.firebaseAuthService.User);
        await this.firebaseAuthService.getProfilePicUrl(authProviders.Facebook);
    }
}

class GotProfilePicState extends FacebookSignInState {
    public override readonly ID = "GotProfilePic";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (facebookStateDTO?.isLogoutClicked) {
            await this.context.transitionTo(token, SentLogoutRequestState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {
        dbSaveUser(this.firebaseAuthService.User);
    }
}

class FailedToGetProfilePicState extends FacebookSignInState {
    public override readonly ID = "FailedToGetProfilePic";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {}

    public override async onEnter(): Promise<void> {
        await wait(1000);
        await this.context.transitionTo(token, IdleState);
        return;
    }
}

class SentLogoutRequestState extends FacebookSignInState {
    public override readonly ID = "SentLogoutRequest";

    public override async handle(
        facebookStateDTO: TFacebookStateDTO,
    ): Promise<void> {
        if (facebookStateDTO.userNotSignedIn) {
            await this.context.transitionTo(token, IdleState);
            return;
        }
    }

    public override async onEnter(): Promise<void> {}
}
