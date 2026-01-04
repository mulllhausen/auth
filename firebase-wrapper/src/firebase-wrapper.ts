// #region imports

import {
    FirebaseApp,
    FirebaseError,
    FirebaseOptions,
    initializeApp,
} from "firebase/app";
import {
    ActionCodeSettings,
    Auth,
    AuthProvider,
    CompleteFn,
    EmailAuthProvider,
    ErrorFn,
    FacebookAuthProvider,
    getAuth,
    getRedirectResult,
    GithubAuthProvider,
    GoogleAuthProvider,
    isSignInWithEmailLink,
    NextOrObserver,
    OAuthCredential,
    onAuthStateChanged,
    PopupRedirectResolver,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signInWithRedirect,
    Unsubscribe,
    User,
    UserCredential,
} from "firebase/auth";
import type { TProcessEnv } from "./dotenv";
import { TLogItem } from "./gui-logger";
import { clearQueryParams as deleteQuerystringParams } from "./utils";

// #endregion imports

// #region consts and types

export const firebaseDependencies: TFirebaseDependencies = {
    FacebookAuthProvider,
    GithubAuthProvider,
    GoogleAuthProvider,
    getAuth,
    getRedirectResult,
    initializeApp,
    isSignInWithEmailLink,
    onAuthStateChanged,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signInWithRedirect,
};

export const authProviders = {
    Email: EmailAuthProvider.PROVIDER_ID,
    Google: GoogleAuthProvider.PROVIDER_ID,
    Facebook: FacebookAuthProvider.PROVIDER_ID,
    GitHub: GithubAuthProvider.PROVIDER_ID,
} as const;

export const defaultAction: TDefaultAction = null;

export const CRUD: Record<string, string> = {
    Create: "Create",
    Read: "Read",
    Update: "Update",
    Delete: "Delete",
};

export type TFirebaseDependencies = {
    FacebookAuthProvider: typeof FacebookAuthProvider;
    GithubAuthProvider: typeof GithubAuthProvider;
    GoogleAuthProvider: typeof GoogleAuthProvider;

    getAuth: (app?: FirebaseApp) => Auth;
    getRedirectResult: (
        auth: Auth,
        resolver?: PopupRedirectResolver,
    ) => Promise<UserCredential | null>;
    initializeApp: (options: FirebaseOptions, name?: string) => FirebaseApp;
    isSignInWithEmailLink: (auth: Auth, emailLink: string) => boolean;
    onAuthStateChanged: (
        auth: Auth,
        nextOrObserver: NextOrObserver<User>,
        error?: ErrorFn,
        completed?: CompleteFn,
    ) => Unsubscribe;
    sendSignInLinkToEmail: (
        auth: Auth,
        email: string,
        actionCodeSettings: ActionCodeSettings,
    ) => Promise<void>;
    signInWithEmailLink: (
        auth: Auth,
        email: string,
        emailLink?: string,
    ) => Promise<UserCredential>;
    signInWithRedirect: (
        auth: Auth,
        provider: AuthProvider,
        resolver?: PopupRedirectResolver,
    ) => Promise<never>;
};

export type TWrapperSettings = {
    logger?: (logItemInput: TLogItem) => void;
    //emailStateChangedCallback: (newState: EmailSignInState) => void;
    // emailStateChangedCallback: (
    //     newState: keyof typeof emailSignInStates,
    // ) => void;
    // emailActionCallback: (
    //     oldState: /*typeof*/ EmailSignInState | null,
    //     action: null, // keyof typeof emailSignInActions | null,
    //     newState: /*typeof*/ EmailSignInState,
    // ) => void;
    loginButtonCSSClass: string;
    authProviderSettings: {
        [TKey in TAuthProviders]: {
            loginButtonClicked:
                | TDefaultAction
                | ((self: FirebaseAuthService, e: MouseEvent) => Promise<void>);
        };
    };
    signedInCallback: (user: TUserPlus) => void;
    signedOutCallback: () => void;

    /** email sign-in step 5/9 */
    reenterEmailAddressCallback: (self: FirebaseAuthService) => void;

    /** email sign-in step 8/9 */
    clearEmailAfterSignInCallback: (self: FirebaseAuthService) => boolean;
};

export type TAuthProviders = (typeof authProviders)[keyof typeof authProviders];

export type TFirebaseWrapperStateDTO = {
    successfullySentSignInLinkToEmail?: boolean;
    urlIsAnEmailSignInLink?: boolean;
    userOpenedEmailLinkOnSameBrowser?: boolean;
    userCredentialFoundViaEmail?: boolean;
    emailDataDeleted?: boolean;
    errorMessage?: string;
};

export type TDefaultAction = null;

// a type for undocumented internal properties that are *actually* returned
// in addition to the User object. note: these could change without warning
// in future.
export type TUserPlus = User & {
    stsTokenManager?: {
        refreshToken?: unknown;
        expirationTime: number;
        accessToken?: unknown;
    };
    lastLoginAt?: number;
};

type TAuthProviderConstructor =
    | typeof GoogleAuthProvider
    | typeof FacebookAuthProvider
    | typeof GithubAuthProvider;

type TEventListenerMethod = <TKey extends keyof HTMLElementEventMap>(
    type: TKey,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[TKey]) => any,
    options?: boolean | AddEventListenerOptions,
) => void;

export type TCRUDValues = (typeof CRUD)[keyof typeof CRUD];

// #endregion consts and types

// todo: single responsibility principle. this service should not know anything about
// state machines. it should just contain a bunch of method-wrappers that make taking
// action more simple and uniform
// assumption: this class is not a singleton. it should be instantiated per provider.
// that said, this class holds state data (eg. email address) so the object instances
// will share user-state, especially via local storage.
// this class is not a state machine sop it does not hold an enumerated state.
export class FirebaseAuthService {
    private _window: Window & typeof globalThis;
    private settings: TWrapperSettings;
    private logger?: (logItem: TLogItem) => void;
    private env: TProcessEnv;
    public Auth: Auth;
    private emailAddress!: string | null;
    public UseLinkInsteadOfPassword: boolean = false;
    public EmailPassword: string | null = null;
    public EmailActionCodeSettings: ActionCodeSettings;
    private localStorageEmailAddressKey = "emailAddress";
    private localStorageCachedUserKey = "cachedUser";
    private hiddenMessage: string =
        "not stored in localStorage to prevent xss attacks";

    // init but may be overriden in constructor
    //private emailState: EmailSignInState = new EmailSignInFSM.Idle();

    private callbackStateChanged?: (
        dto: TFirebaseWrapperStateDTO,
    ) => Promise<void>;
    //private emailStateChangedCallback: (newState: EmailSignInState) => void;
    // private emailStateChangedCallback: (
    //     newState: keyof typeof emailSignInStates,
    // ) => void;
    // private emailActionCallback: (
    //     oldState: EmailSignInState | null,
    //     action: keyof typeof emailSignInActions | null,
    //     newState: EmailSignInState,
    // ) => void;
    private backedUpEmailLoginButtonClicked:
        | TDefaultAction
        | ((self: FirebaseAuthService, e: MouseEvent) => Promise<void>)
        | null = null;

    public set Settings(settings: TWrapperSettings) {
        this.SetupEvents(this.settings, CRUD.Delete);
        this.settings = settings;
        this.SetupEvents(this.settings, CRUD.Create);
    }

    public get EmailAddress(): string | null {
        return this.emailAddress;
    }
    public set EmailAddress(emailAddress: string) {
        this.log("email address cached");
        this._window.localStorage.setItem(
            this.localStorageEmailAddressKey,
            emailAddress,
        );
        this.emailAddress = emailAddress;
    }

    constructor(props: {
        window: Window & typeof globalThis;
        env: TProcessEnv;
        settings: TWrapperSettings;
    }) {
        this._window = props.window;
        this.env = props.env;
        this.settings = props.settings;
        this.logger = props.settings.logger;
        //this.emailStateChangedCallback = input.settings.emailStateChangedCallback;
        //this.emailActionCallback = input.settings.emailActionCallback;
        //this.initEmailState();
        //this.setEmailState(EmailSignInFSM.Idle);

        if (this.env.FIREBASE_LINK_ACCOUNTS) {
            throw new Error("FIREBASE_LINK_ACCOUNTS=true is not supported yet");
        }

        const firebaseOptions: FirebaseOptions = {
            apiKey: this.env.FIREBASE_API_KEY,
            authDomain: this.env.FIREBASE_AUTH_DOMAIN,
            databaseURL: this.env.FIREBASE_DB_URL,
            projectId: this.env.FIREBASE_PROJECT_ID,
            storageBucket: this.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: this.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: this.env.FIREBASE_APP_ID,
            measurementId: this.env.FIREBASE_MEASUREMENT_ID,
        };

        // todo: ignore if older than 1 day
        this.emailAddress = this._window.localStorage.getItem(
            this.localStorageEmailAddressKey,
        );
        this.EmailActionCodeSettings = {
            url: this._window.location.href,
            handleCodeInApp: true,
        };
        const app = initializeApp(firebaseOptions);
        this.Auth = getAuth(app);
        this.log(`finished initializing firebase SDK`);
        //this.setupFirebaseListeners();
        this.SetupEvents(this.settings, CRUD.Create);
    }

    private log(logMessage: string) {
        this.logger?.({ logMessage });
    }

    private SetupEvents(
        settings: TWrapperSettings,
        eventAction: TCRUDValues,
    ): void {
        const eventListener = this.getEventListener(eventAction);

        const loginButtons = document.querySelectorAll(
            settings.loginButtonCSSClass,
        );
        if (!loginButtons || loginButtons.length === 0) {
            return;
        }
        // todo: refactor to use callbacks instead of css (SRP)
        for (const button of loginButtons) {
            if (!(button instanceof HTMLButtonElement)) continue; // todo: refactor (runtime has no types)
            const provider = button.dataset.serviceProvider as TAuthProviders;
            const foundProvider = settings.authProviderSettings[provider];
            const action =
                foundProvider?.loginButtonClicked ??
                this.serviceProviderNotFoundAction;

            eventListener.call(button, "click", async (e) => {
                const mouseEvent = e as HTMLElementEventMap["click"];
                this.log(`login with ${provider} clicked`);
                await (action === defaultAction
                    ? this.Signin(provider)
                    : action(this, mouseEvent));
            });
        }
    }

    private getEventListener(action: TCRUDValues): TEventListenerMethod {
        switch (action) {
            case CRUD.Create:
                return Element.prototype.addEventListener;
            case CRUD.Delete:
                return Element.prototype.removeEventListener;
            default:
                throw new Error(
                    `action ${action} is not allowed in getEventListener()`,
                );
        }
    }

    public setupCallbackStateChanged(
        callbackStateChanged: (dto: TFirebaseWrapperStateDTO) => Promise<void>,
    ) {
        this.callbackStateChanged = callbackStateChanged;
    }

    public async setupFirebaseListeners(): Promise<void> {
        onAuthStateChanged(this.Auth, this.authStateChanged.bind(this));
        //await this.checkIfURLIsASignInWithEmailLink();
        await this.handleGetRedirectResult();
    }

    private async handleGetRedirectResult(): Promise<void> {
        try {
            const redirectResult: UserCredential | null =
                await getRedirectResult(this.Auth);
            if (redirectResult == null) {
                this.log(`redirectResult fired - null`);
                return;
            }

            // we only get here once - immediately after login
            // (stackoverflow.com/a/44468387)

            const providerId = redirectResult.providerId as TAuthProviders;
            const providerClass = this.authProviderFactory(providerId);
            const credential =
                providerClass.credentialFromResult(redirectResult);
            if (credential == null) {
                this.log(`credential is null immediately after sign-in`);
                return;
            }
            this.logger?.({
                logMessage: `credential immediately after sign-in with ${providerId}`,
                logData: credential,
                safeLocalStorageData: this.safeCredentialResponse(credential),
            });
            const accessToken: string | undefined = credential.accessToken;
            if (accessToken === undefined) {
                this.log(
                    `accessToken is null immediately after sign-in with ${providerId}`,
                );
                return;
            }
            const user = redirectResult.user;
            //renderUserData(user, 1);
            // IdP data available using getAdditionalUserInfo(result)
        } catch (error) {
            const firebaseError = error as FirebaseError;
            // Handle Errors here.
            const errorCode = firebaseError.code;
            const errorMessage = firebaseError.message;
            // The email of the user's account used.
            const email = firebaseError.customData?.email;
            // AuthCredential type that was used.
            //const credential = GithubAuthProvider.credentialFromError(firebaseError);
        }
    }

    private authStateChanged(user: User | null): void {
        if (user) {
            this.afterUserSignedIn(user);
        } else {
            this.log(`firebase auth state changed - user is signed-out`);
            this.settings.signedOutCallback();
        }
    }

    private afterUserSignedIn(user: TUserPlus): void {
        const logMessageStart: string = "firebase auth state changed";
        if (this.userAlreadyCached(user)) {
            this.logger?.({
                logMessage: `${logMessageStart}, but user is already signed-in`,
                logData: user,
                safeLocalStorageData: this.safeUserResponse(user),
            });
            return;
        }

        this.logger?.({
            logMessage: `${logMessageStart} - user is signed-in`,
            logData: user,
            safeLocalStorageData: this.safeUserResponse(user),
        });
        this.cacheUser(user);
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        this.settings.signedInCallback(user);
    }

    public async Signin(providerID: TAuthProviders): Promise<void> {
        if (providerID === authProviders.Email) {
            // this.callEmailAction(
            //     emailSignInActions.UserInputsEmailAddressAndClicksSignInButton,
            // );
            return; // this.emailState.UserInputsEmailAddressAndClicksSignInButton();
            //return await this.emailSignInStateMachine();
        } else {
            let authProvider: AuthProvider;
            try {
                authProvider = new (this.authProviderFactory(providerID))();
            } catch (e) {
                if (e instanceof Error) {
                    this.log(e.message);
                } else {
                    this.logger?.({
                        logMessage: `unknown error for ${providerID} in Signin()`,
                        logData: e,
                    });
                }
                return;
            }
            this.log(`redirecting to ${providerID}`);
            signInWithRedirect(this.Auth, authProvider);
        }
    }

    public async signoutProvider(providerID: TAuthProviders): Promise<void> {
        switch (providerID) {
            case authProviders.Email:
                this.deleteCachedEmail();
                this.deleteFirebaseQuerystringParams();
                await this.callbackStateChanged?.({ emailDataDeleted: true });
                break;
        }
    }

    private authProviderFactory(
        providerId: TAuthProviders,
    ): TAuthProviderConstructor {
        switch (providerId) {
            case authProviders.Google:
                return GoogleAuthProvider;
            case authProviders.Facebook:
                return FacebookAuthProvider;
            case authProviders.GitHub:
                return GithubAuthProvider;
            default:
                throw new Error(`unsupported provider ${providerId}`);
        }
    }

    public async SendSignInLinkToEmail(): Promise<void> {
        try {
            this.log(`instructing firebase to send sign-in link`);
            await sendSignInLinkToEmail(
                this.Auth,
                this.EmailAddress!,
                this.EmailActionCodeSettings,
            );
            this.log(`successfully sent sign-in link`);

            await this.callbackStateChanged?.({
                successfullySentSignInLinkToEmail: true,
            });
            //this.callEmailAction(emailSignInActions.FirebaseOKResponse);
        } catch (error) {
            const error_ = error as Error;
            // this.callEmailAction(emailSignInActions.FirebaseErrorResponse, error);
            this.log(
                `firebase failed to send sign-in link. ` +
                    `error message: "${error_.message}"`,
            );
            await this.callbackStateChanged?.({
                successfullySentSignInLinkToEmail: false,
                errorMessage: error_.message,
            });
        }
    }

    public async checkIfURLIsASignInWithEmailLink(): Promise<void> {
        if (!isSignInWithEmailLink(this.Auth, this._window.location.href)) {
            this.log(
                `just checked: the current page url is not a ` +
                    `sign-in-with-email-link`,
            );
            // note: do not call this.callbackStateChanged() here
            return;
        }

        this.log(
            `just checked: the current page url is a sign-in-with-email-link`,
        );
        if (this.emailAddress == null) {
            this.log(
                `the user has opened the email link on a different browser. ` +
                    `to prevent session fixation attacks, the email address must be entered again.`,
            );
            this.callbackStateChanged?.({
                userOpenedEmailLinkOnSameBrowser: false,
            });
            return;
        }

        this.log(`the user has opened the email link on the same browser.`);
        this.callbackStateChanged?.({
            userOpenedEmailLinkOnSameBrowser: true,
        });
        return;
    }

    public async handleSignInWithEmailLink(): Promise<void> {
        debugger;
        try {
            const userCredentialResult: UserCredential =
                await signInWithEmailLink(
                    this.Auth,
                    this.emailAddress!,
                    this._window.location.href,
                );

            if (userCredentialResult) {
                this.logger?.({
                    logMessage: "user signed in with email link",
                    logData: userCredentialResult,
                    imageURL: userCredentialResult.user.photoURL,
                });
                this.cacheUser(userCredentialResult.user);
                this.callbackStateChanged?.({
                    userCredentialFoundViaEmail: true,
                });
                return;
            } else {
                this.logger?.({
                    logMessage: "user was not signed in with email link",
                    logData: userCredentialResult,
                });
                this.callbackStateChanged?.({
                    userCredentialFoundViaEmail: false,
                });
            }

            // email sign-in step 8/9
            // if (this.settings.clearEmailAfterSignInCallback(this)) {
            //     this.clearEmailCache();
            // }

            // You can access the new user via result.user
            // Additional user info profile not available via:
            // result.additionalUserInfo.profile == null
            // You can check if the user is new or existing:
            // result.additionalUserInfo.isNewUser

            // email sign-in step 9/9
            //this.restoreEmailLoginButtonClicked();
        } catch (error) {
            this.log((error as Error).message);
            this.callbackStateChanged?.({
                userCredentialFoundViaEmail: false,
            });
            // Some error occurred, you can inspect the code: error.code
            // Common errors could be invalid email and invalid or expired OTPs.
        }
    }

    // /** email sign-in step 9/9 */
    // private restoreEmailLoginButtonClicked(): void {
    //     if (this.backedUpEmailLoginButtonClicked === null) return;
    //     this.settings.authProviderSettings[
    //         authProviders.Email
    //     ].loginButtonClicked = this.backedUpEmailLoginButtonClicked;
    // }

    private userAlreadyCached(user: TUserPlus): boolean {
        const cachedUsersJSON: string | null =
            this._window.localStorage.getItem(this.localStorageCachedUserKey);
        if (cachedUsersJSON === null) return false;

        const cachedUsers: Record<string, TUserPlus> =
            JSON.parse(cachedUsersJSON);
        const serviceProvider = user.providerData[0].providerId;
        if (!cachedUsers.hasOwnProperty(serviceProvider)) return false;

        const cachedUser = cachedUsers[serviceProvider];
        const cachedUserJSON = JSON.stringify(
            this.safeUserResponse(this.idempotentUserResponse(cachedUser)),
        );
        const userJSON: string = JSON.stringify(
            this.safeUserResponse(this.idempotentUserResponse(user)),
        );

        return cachedUserJSON === userJSON;
    }

    private cacheUser(user: TUserPlus): void {
        // cache the user under service provider since FIREBASE_LINK_ACCOUNTS=false
        const serviceProvider = user.providerData[0].providerId;
        const cachedUserJSON: string | null = this._window.localStorage.getItem(
            this.localStorageCachedUserKey,
        );
        let cachedUser: Record<string, TUserPlus> = {};
        if (cachedUserJSON !== null) {
            cachedUser = JSON.parse(cachedUserJSON!);
        }
        cachedUser[serviceProvider] = this.safeUserResponse(
            this.idempotentUserResponse(user),
        );
        this._window.localStorage.setItem(
            this.localStorageCachedUserKey,
            JSON.stringify(cachedUser),
        );
    }

    public clearUserCache(): void {
        this._window.localStorage.removeItem(this.localStorageCachedUserKey);
        this.deleteCachedEmail();
    }

    private deleteCachedEmail(): void {
        this._window.localStorage.removeItem(this.localStorageEmailAddressKey);
    }

    public deleteFirebaseQuerystringParams() {
        deleteQuerystringParams(this._window, [
            "apiKey",
            "oobCode",
            "mode",
            "lang",
        ]);
    }

    serviceProviderNotFoundAction(self: FirebaseAuthService, e: MouseEvent) {
        console.error(`Service provider not found`);
    }

    /** use this method to zero out any sensitive fields before saving to localStorage,
     * since localStorage may be vulnerable to xss attacks.
     */
    private safeUserResponse(user: TUserPlus): TUserPlus {
        // deep copy
        const safeUser = JSON.parse(JSON.stringify(user)) as TUserPlus;
        if (safeUser.stsTokenManager) {
            if (safeUser.stsTokenManager.refreshToken) {
                safeUser.stsTokenManager.refreshToken = this.hiddenMessage;
            }
            if (safeUser.stsTokenManager.accessToken) {
                safeUser.stsTokenManager.accessToken = this.hiddenMessage;
            }
        }
        return safeUser;
    }

    private idempotentUserResponse(user: TUserPlus): TUserPlus {
        // deep copy
        const userCopy = JSON.parse(JSON.stringify(user)) as TUserPlus;
        if (userCopy.stsTokenManager) {
            userCopy.stsTokenManager.expirationTime = 0;
            userCopy.lastLoginAt = 0;
        }
        return userCopy;
    }

    private safeCredentialResponse(
        credential: OAuthCredential,
    ): OAuthCredential {
        const safeCredential = JSON.parse(
            JSON.stringify(credential),
        ) as OAuthCredential;
        if (safeCredential.accessToken) {
            safeCredential.accessToken = this.hiddenMessage;
        }
        if (safeCredential.idToken) {
            safeCredential.idToken = this.hiddenMessage;
        }
        return safeCredential;
    }
}
