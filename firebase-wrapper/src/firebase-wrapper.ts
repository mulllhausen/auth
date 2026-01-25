// #region imports

import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import { FirebaseError, initializeApp } from "firebase/app";
import type {
    ActionCodeSettings,
    Auth,
    AuthProvider,
    CompleteFn,
    ErrorFn,
    NextOrObserver,
    PopupRedirectResolver,
    Unsubscribe,
    User,
    UserCredential,
    UserInfo,
} from "firebase/auth";
import {
    EmailAuthProvider,
    FacebookAuthProvider,
    getAuth,
    getRedirectResult,
    GithubAuthProvider,
    GoogleAuthProvider,
    isSignInWithEmailLink,
    OAuthCredential,
    onAuthStateChanged,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signInWithRedirect,
} from "firebase/auth";
import type { TProcessEnv } from "./dotenv.base.ts";
import type {
    TSafeOAuthCredential,
    TSafeTokenResponse,
    TSafeUser,
    TSafeUserCredential,
    TSafeUserInfo,
} from "./firebase-safe-types.ts";
import type { TLogItem } from "./gui-logger.ts";
import { clearQueryParams } from "./utils.ts";

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
    signInWithEmailLink,
    signInWithRedirect,
};

export type TAuthProvider = (typeof authProviders)[keyof typeof authProviders];

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
    loginButtonCSSClass: string;
    authProviderSettings: {
        [TKey in TAuthProviders]: {
            loginButtonClicked:
                | TDefaultAction
                | ((self: FirebaseAuthService, e: MouseEvent) => Promise<void>);
        };
    };
};

export type TAuthProviders = (typeof authProviders)[keyof typeof authProviders];

export type TFirebaseWrapperStateDTO = {
    successfullySentSignInLinkToEmail?: boolean;
    urlIsAnEmailSignInLink?: boolean;
    userOpenedEmailLinkOnSameBrowser?: boolean;
    userCredentialFoundViaEmail?: boolean;
    emailDataDeleted?: boolean;
    redirectedToAuthProvider?: TAuthProviders;
    failedToRedirectToAuthProvider?: TAuthProviders;
    nullCredentialAfterSignIn?: TAuthProviders;
    signedOutUser?: boolean;
};

export type TDefaultAction = null;

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
    private hiddenMessage = "not stored in localStorage to prevent xss attacks";
    public signedInStatus: Record<keyof typeof authProviders, boolean> = {
        Email: false,
        Google: false,
        Facebook: false,
        GitHub: false,
    };

    // init but may be overriden in constructor
    //private emailState: EmailSignInState = new EmailSignInFSM.Idle();

    private callbackStateChanged?: (
        dto: TFirebaseWrapperStateDTO,
    ) => Promise<void>;
    private backedUpEmailLoginButtonClicked:
        | TDefaultAction
        | ((self: FirebaseAuthService, e: MouseEvent) => Promise<void>)
        | null = null;

    public set Settings(settings: TWrapperSettings) {
        this.setupEvents(this.settings, CRUD.Delete);
        this.settings = settings;
        this.setupEvents(this.settings, CRUD.Create);
    }

    public get EmailAddress(): string | null {
        return this.emailAddress;
    }
    public set EmailAddress(emailAddress: string) {
        const isEmpty = emailAddress == null || emailAddress.length === 0;
        this.log(`${isEmpty ? "empty " : ""}email address cached`);
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
        this.setupEvents(this.settings, CRUD.Create);
    }

    private log(logMessage: string) {
        this.logger?.({ logMessage });
    }

    private setupEvents(
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
                    ? this.signin(provider)
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
    }

    public async logout(): Promise<void> {
        this.clearUserCache();
        this.EmailAddress = "";
        this.deleteFirebaseQuerystringParams();
    }

    public deleteFirebaseQuerystringParams() {
        clearQueryParams(this._window, ["apiKey", "oobCode", "mode", "lang"]);
    }

    serviceProviderNotFoundAction(self: FirebaseAuthService, e: MouseEvent) {
        console.error(`Service provider not found`);
    }

    public async signin(providerID: TAuthProviders): Promise<void> {
        if (providerID === authProviders.Email) {
            await this.sendSignInLinkToEmail();
        } else {
            await this.signInWithRedirect(providerID);
        }
    }

    // #region sign-in oauth providers with redirect

    private async signInWithRedirect(
        providerID: TAuthProviders,
    ): Promise<void> {
        debugger;
        try {
            this.log(`redirecting to ${providerID}`);

            const authProvider: AuthProvider = new (this.authProviderFactory(
                providerID,
            ))();
            signInWithRedirect(this.Auth, authProvider);

            await this.callbackStateChanged?.({
                redirectedToAuthProvider: providerID,
            });
        } catch (error: unknown) {
            const errorCodeMessage =
                error instanceof FirebaseError ? `code: ${error.code}. ` : "";
            const logMessage =
                errorCodeMessage +
                (error instanceof Error ? `"${error.message}"` : "error") +
                ` in signin() for ${providerID}`;

            this.logger?.({
                logMessage,
                logData: error,
            });

            await this.callbackStateChanged?.({
                failedToRedirectToAuthProvider: providerID,
            });
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

    public async checkIfURLIsASignInRedirectResult(): Promise<void> {
        try {
            const redirectResult: UserCredential | null =
                await getRedirectResult(this.Auth);

            if (redirectResult == null) {
                this.log(
                    `just checked: the current page url is not a redirect-result ` +
                        `from a service provider`,
                );
                // note: do not call this.callbackStateChanged() here
                return;
            }

            debugger;

            // we only get here once - immediately after login
            // (stackoverflow.com/a/44468387)

            const providerId = redirectResult.providerId as TAuthProviders;
            const providerClass = this.authProviderFactory(providerId);

            const credential =
                providerClass.credentialFromResult(redirectResult);
            if (credential == null) {
                this.log(
                    `credential is null immediately after sign-in with ${providerId}`,
                );
                await this.callbackStateChanged?.({
                    nullCredentialAfterSignIn: providerId,
                });
                return;
            }

            this.logger?.({
                logMessage: `credential immediately after sign-in with ${providerId}`,
                logData: credential,
                safeLocalStorageData: this.safeCredentialResponse(credential),
            });

            const accessToken: string | undefined = credential.accessToken;
            if (accessToken == null) {
                this.log(
                    `accessToken is null immediately after sign-in with ${providerId}`,
                );
                await this.callbackStateChanged?.({
                    nullCredentialAfterSignIn: providerId,
                });
                return;
            }
            const user = redirectResult.user;
            //renderUserData(user, 1);
            // IdP data available using getAdditionalUserInfo(result)
        } catch (error: unknown) {
            // todo - typeguard
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

    private async authStateChanged(user: User | null): Promise<void> {
        if (user) {
            this.afterUserSignedIn(user);
        } else {
            this.log(`firebase auth state changed - user is signed-out`);
            await this.callbackStateChanged?.({
                signedOutUser: true,
            });
        }
    }

    private async afterUserSignedIn(user: User): Promise<void> {
        // todo: figure out which service provider changed the state
        // for (const userInfo in user.providerData) {
        //     await this.callbackStateChanged?.({
        //         failedToRedirectToAuthProvider: userInfo.providerId// as TAuthProvider,
        //     });
        // }
        debugger;
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
        //this.settings.signedInCallback(user);
    }

    public async signoutProvider(providerID: TAuthProviders): Promise<void> {
        switch (providerID) {
            case authProviders.Email:
                this.deleteCachedEmail();
                this.deleteFirebaseQuerystringParams();
                this.signedInStatus["Email"] = false;
                await this.callbackStateChanged?.({ emailDataDeleted: true });
                break;
        }
    }

    // #endregion sign-in oauth providers with redirect

    // #region sign-in with email

    private async sendSignInLinkToEmail(): Promise<void> {
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
        } catch (error: unknown) {
            const errorCodeMessage =
                error instanceof FirebaseError ? `code: ${error.code}. ` : "";
            this.log(
                `firebase failed to send sign-in link with SendSignInLinkToEmail(). ` +
                    `${errorCodeMessage}message: "${(error as Error).message}".`,
            );
            await this.callbackStateChanged?.({
                successfullySentSignInLinkToEmail: false,
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
                    safeLocalStorageData:
                        this.safeUserCredential(userCredentialResult),
                    imageURL: userCredentialResult.user.photoURL,
                });
                this.cacheUser(userCredentialResult.user);
                this.signedInStatus["Email"] = true;
                this.callbackStateChanged?.({
                    userCredentialFoundViaEmail: true,
                });
                return;
            } else {
                this.logger?.({
                    logMessage: "user was not signed in with email link",
                    logData: this.safeUserCredential(userCredentialResult),
                });
                this.callbackStateChanged?.({
                    userCredentialFoundViaEmail: false,
                });
            }

            // You can access the new user via result.user
            // Additional user info profile not available via:
            // result.additionalUserInfo.profile == null
            // You can check if the user is new or existing:
            // result.additionalUserInfo.isNewUser
        } catch (error) {
            const errorCodeMessage =
                error instanceof FirebaseError ? `code: ${error.code}. ` : "";
            this.log(
                `firebase handleSignInWithEmailLink() error. ${errorCodeMessage}` +
                    `message: "${(error as Error).message}"`,
            );
            this.callbackStateChanged?.({
                userCredentialFoundViaEmail: false,
            });
        }
    }

    // #endregion sign-in with email

    // #region user caching

    private userAlreadyCached(user: User): boolean {
        const cachedUsersJSON: string | null =
            this._window.localStorage.getItem(this.localStorageCachedUserKey);
        if (cachedUsersJSON === null) return false;

        const cachedUsers: Record<string, TSafeUser> =
            JSON.parse(cachedUsersJSON);
        const serviceProvider = user.providerData[0].providerId;
        if (!cachedUsers.hasOwnProperty(serviceProvider)) return false;

        const cachedUser = cachedUsers[serviceProvider];
        const convertToIdempotent = true;
        const cachedUserJSON = JSON.stringify(
            this.safeUserResponse(
                cachedUser as unknown as User,
                convertToIdempotent,
            ),
        );
        const userJSON: string = JSON.stringify(
            this.safeUserResponse(user, convertToIdempotent),
        );

        return cachedUserJSON === userJSON;
    }

    private cacheUser(user: User): void {
        // cache the user under service provider since FIREBASE_LINK_ACCOUNTS=false
        const serviceProvider = user.providerData[0].providerId;
        const cachedUserJSON: string | null = this._window.localStorage.getItem(
            this.localStorageCachedUserKey,
        );
        let cachedUser: Record<string, TSafeUser> = {};
        if (cachedUserJSON !== null) {
            cachedUser = JSON.parse(cachedUserJSON!);
        }
        const convertToIdempotent = true;
        cachedUser[serviceProvider] = this.safeUserResponse(
            user,
            convertToIdempotent,
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

    // #endregion user caching

    // #region make firebase objects safe for storage (remove pii)

    private safeUserCredential(
        userCredential: UserCredential,
        idempotent: boolean = false, // use for comparing objects
    ): TSafeUserCredential {
        return {
            user: this.safeUserResponse(userCredential.user, idempotent),
            providerId: userCredential.providerId,
            operationType: userCredential.operationType,
            _tokenResponse: this.safeTokenResponse(
                (userCredential as unknown as TSafeUserCredential)
                    ._tokenResponse,
                idempotent,
            ),
        };
    }

    private safeTokenResponse(
        tokenResponse: TSafeTokenResponse,
        idempotent: boolean = false, // use for comparing objects
    ): TSafeTokenResponse {
        return {
            kind: tokenResponse.kind,
            idToken: this.hiddenMessage,
            email: tokenResponse.email,
            refreshToken: this.hiddenMessage,
            expiresIn: idempotent ? "0" : tokenResponse.expiresIn,
            localId: tokenResponse.localId,
            isNewUser: tokenResponse.isNewUser,
        };
    }

    private safeUserResponse(
        user: User,
        idempotent: boolean = false, // use for comparing objects
    ): TSafeUser {
        const _user = user as unknown as TSafeUser;
        return {
            uid: _user.uid,
            email: _user.email,
            emailVerified: _user.emailVerified,
            displayName: _user.displayName,
            isAnonymous: _user.isAnonymous,
            photoURL: _user.photoURL,
            providerData: user.providerData.map((eachProviderData) =>
                this.safeUserInfo(eachProviderData),
            ),
            stsTokenManager: {
                refreshToken: this.hiddenMessage,
                accessToken: this.hiddenMessage,
                expirationTime: idempotent
                    ? 0
                    : _user.stsTokenManager?.expirationTime,
            },
            createdAt: idempotent ? "0" : _user.createdAt,
            lastLoginAt: idempotent ? "0" : _user.lastLoginAt,
            apiKey: this.hiddenMessage,
            appName: _user.appName,
            metadata: _user.metadata,
            refreshToken: this.hiddenMessage,
            tenantId: this.hiddenMessage,
            phoneNumber: _user.phoneNumber,
            providerId: _user.providerId,
        };
    }

    private safeUserInfo(userInfo: UserInfo): TSafeUserInfo {
        return {
            providerId: userInfo.providerId,
            uid: userInfo.uid,
            displayName: userInfo.displayName,
            email: userInfo.email,
            phoneNumber: userInfo.phoneNumber,
            photoURL: userInfo.photoURL,
        };
    }

    private safeCredentialResponse(
        credential: OAuthCredential,
    ): TSafeOAuthCredential {
        return {
            idToken: this.hiddenMessage,
            accessToken: this.hiddenMessage,
            secret: this.hiddenMessage,
            nonce: this.hiddenMessage,
            pendingToken: this.hiddenMessage,
        };
    }

    // #endregion make firebase objects safe for storage without pii
}
