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
    signOut,
} from "firebase/auth";
import type { TProcessEnv } from "./dotenv.d.ts";
import type {
    TSafeOAuthCredential,
    TSafeTokenResponse,
    TSafeUser,
    TSafeUserCredential,
    TSafeUserInfo,
} from "./firebase-safe-types.ts";
import type { TLogItem } from "./gui-logger.ts";
import { clearQueryParams, deepCopy } from "./utils.ts";

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

export type TFirebaseWrapperStateDTO = {
    successfullySentSignInLinkToEmail?: boolean;
    urlIsAnEmailSignInLink?: boolean;
    userOpenedEmailLinkOnSameBrowser?: boolean;
    userCredentialFoundViaEmail?: boolean;
    emailDataDeleted?: boolean;

    failedToRedirectToAuthProvider?: TAuthProvider;
    nullCredentialAfterSignIn?: TAuthProvider;
    nullCredentialAfterRedirect?: boolean;
    userNotsignedIn?: boolean;
    userCredentialFoundViaFacebook?: boolean;
};

type TStateChangedCallback = (dto: TFirebaseWrapperStateDTO) => Promise<void>;

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

// #endregion consts and types

// todo: single responsibility principle. this service should not know anything about
// state machines. it should just contain a bunch of method-wrappers that make taking
// action more simple and uniform
// assumption: this class is a singleton. the same instance should be used for all providers.
// this class holds state data (eg. email address) so the object instances
// will share user-state, especially via local storage.
// this class is not a state machine so it does not hold an enumerated state.
export class FirebaseAuthService {
    private _window: Window & typeof globalThis;
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
    public signedInStatus: Record<TAuthProvider, boolean> = {
        [authProviders.Email]: false,
        [authProviders.Google]: false,
        [authProviders.Facebook]: false,
        [authProviders.GitHub]: false,
    };
    private user: Partial<Record<TAuthProvider, TSafeUser>> = {};
    private callbacksForStateChanged = new Set<TStateChangedCallback>();

    constructor(props: {
        window: Window & typeof globalThis;
        env: TProcessEnv;
        logger?: (logItemInput: TLogItem) => void;
    }) {
        this._window = props.window;
        this.env = props.env;
        this.logger = props.logger;

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
        this.setupSignedInStatus();
        const app = initializeApp(firebaseOptions);
        this.Auth = getAuth(app);
        this.log(`finished initializing firebase SDK`);
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

    public get User(): Partial<Record<TAuthProvider, TSafeUser>> | null {
        if (Object.keys(this.user).length > 0) {
            return this.user;
        }

        const cachedUserJSON: string | null = this._window.localStorage.getItem(
            this.localStorageCachedUserKey,
        );
        if (cachedUserJSON == null) {
            return null;
        }

        this.user = JSON.parse(cachedUserJSON);
        return this.user;
    }

    private set User(user: Partial<Record<TAuthProvider, TSafeUser>>) {
        if (Object.keys(user).length === 0) {
            this.user = {};
            this._window.localStorage.removeItem(
                this.localStorageCachedUserKey,
            );
            return;
        }

        this.user = user;
        this._window.localStorage.setItem(
            this.localStorageCachedUserKey,
            JSON.stringify(user),
        );
    }

    private upsertUser(user: User) {
        const cachedUser: Record<string, TSafeUser> = this.User ?? {};

        for (const userInfo of user.providerData) {
            const providerID = userInfo.providerId as TAuthProvider;

            // todo: remove data for any other service provider from user object

            const convertToIdempotent = true;
            cachedUser[providerID] = this.safeUserResponse(
                user,
                convertToIdempotent,
            );
            this.signedInStatus[providerID] = true;
        }
        this.User = cachedUser;
    }

    private setupSignedInStatus() {
        debugger;
        for (const providerID in this.user) {
            this.signedInStatus[providerID as TAuthProvider] = true;
        }
    }

    private log(logMessage: string) {
        this.logger?.({ logMessage });
    }

    public subscribeStateChanged(
        callbackStateChanged: TStateChangedCallback,
    ): () => void {
        this.callbacksForStateChanged.add(callbackStateChanged);

        const unsubscribeFunction = () => {
            this.callbacksForStateChanged.delete(callbackStateChanged);
        };
        return unsubscribeFunction;
    }

    private async publishStateChanged(
        dto: TFirebaseWrapperStateDTO,
    ): Promise<void> {
        await Promise.allSettled(
            Array.from(this.callbacksForStateChanged).map((callback) =>
                callback(dto),
            ),
        );
    }

    public async setupFirebaseListeners(): Promise<void> {
        onAuthStateChanged(this.Auth, this.authStateChanged.bind(this));
    }

    public async logout(): Promise<void> {
        signOut(this.Auth); // will trigger authStateChanged
        //await this.publishStateChanged?.({ signedOutUser: true });
    }

    public deleteFirebaseQuerystringParams() {
        clearQueryParams(this._window, ["apiKey", "oobCode", "mode", "lang"]);
    }

    private setSignedInStatus(providerID: TAuthProvider, status: boolean) {
        this.signedInStatus[providerID] = status;
    }

    public async signin(providerID: TAuthProvider): Promise<void> {
        if (providerID === authProviders.Email) {
            await this.sendSignInLinkToEmail();
        } else {
            await this.signInWithRedirect(providerID);
        }
    }

    // #region sign-in oauth providers with redirect

    private async signInWithRedirect(providerID: TAuthProvider): Promise<void> {
        //debugger;
        try {
            this.log(`redirecting to ${providerID}`);

            const authProvider: AuthProvider = new (this.authProviderFactory(
                providerID,
            ))();
            await signInWithRedirect(this.Auth, authProvider);
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

            await this.publishStateChanged?.({
                failedToRedirectToAuthProvider: providerID,
            });
        }
    }

    private authProviderFactory(
        providerId: TAuthProvider,
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

    public async checkIfRedirectResult(): Promise<void> {
        debugger;
        try {
            const redirectResult: UserCredential | null =
                await getRedirectResult(this.Auth);

            if (redirectResult == null) {
                this.log(
                    `just checked: the current page url is not a redirect ` +
                        `from a service provider`,
                );
                // await this.publishStateChanged?.({
                //     nullCredentialAfterRedirect: true,
                // });
                // note: do not call this.publishStateChanged() here
                return;
            }

            // we only get here once - immediately after login
            // (stackoverflow.com/a/44468387)

            const providerId = redirectResult.providerId as TAuthProvider;
            const providerClass = this.authProviderFactory(providerId);

            const credential =
                providerClass.credentialFromResult(redirectResult);
            if (credential == null) {
                this.log(
                    `credential is null immediately after sign-in with ${providerId}`,
                );
                await this.publishStateChanged?.({
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
                await this.publishStateChanged?.({
                    nullCredentialAfterSignIn: providerId,
                });
                return;
            }
            this.setSignedInStatus(providerId, true);
            this.upsertUser(redirectResult.user);
            await this.publishStateChanged?.({
                userCredentialFoundViaFacebook: true,
            });
            return;
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
            this.log(`firebase auth event: user is not signed in`);
            this.clearUserCache();
            this.deleteFirebaseQuerystringParams();
            this.deleteCachedEmail();
            await this.publishStateChanged?.({
                userNotsignedIn: true,
            });
        }
    }

    private async afterUserSignedIn(user: User): Promise<void> {
        debugger;
        const logMessageStart: string = "firebase auth event.";
        const initialStatuses = deepCopy(this.signedInStatus);
        this.upsertUser(user);

        for (const providerID in authProviders) {
            if (
                this.isAlreadySignedInWith(
                    providerID as TAuthProvider,
                    initialStatuses,
                )
            ) {
                this.logger?.({
                    logMessage:
                        logMessageStart +
                        `user is already signed-in with ${providerID}`,
                    logData: user,
                    safeLocalStorageData: this.safeUserResponse(user),
                    imageURL: user.photoURL,
                });
            }
        }

        if (this.isJustSignedInWith(authProviders.Email, initialStatuses)) {
            this.logger?.({
                logMessage:
                    logMessageStart + ` user was just signed in via email`,
                logData: user,
                safeLocalStorageData: this.safeUserResponse(user),
                imageURL: user.photoURL,
            });

            await this.publishStateChanged?.({
                userCredentialFoundViaEmail: true,
            });
        }

        if (this.isJustSignedInWith(authProviders.Facebook, initialStatuses)) {
            this.logger?.({
                logMessage:
                    logMessageStart + ` user was just signed in via facebook`,
                logData: user,
                safeLocalStorageData: this.safeUserResponse(user),
                imageURL: user.photoURL,
            });

            await this.publishStateChanged?.({
                userCredentialFoundViaFacebook: true,
            });
        }

        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
    }

    private isJustSignedInWith(
        serviceProvider: TAuthProvider,
        initialStatuses: Record<TAuthProvider, boolean>,
    ): boolean {
        return (
            !initialStatuses[serviceProvider] &&
            this.signedInStatus[serviceProvider]
        );
    }

    private isAlreadySignedInWith(
        serviceProvider: TAuthProvider,
        initialStatuses: Record<TAuthProvider, boolean>,
    ): boolean {
        return (
            initialStatuses[serviceProvider] &&
            this.signedInStatus[serviceProvider]
        );
    }

    /**
     * useful when sign-in fails and we want to roll back a single provider.
     * but do not use this in place of logout(), since logout() applies to all
     * providers at once.
     * */
    public async signoutProvider(providerID: TAuthProvider): Promise<void> {
        this.deleteFirebaseQuerystringParams();
        switch (providerID) {
            case authProviders.Email:
                this.deleteCachedEmail();
                await this.publishStateChanged?.({
                    emailDataDeleted: true,
                });
                break;
        }
    }

    // #endregion sign-in oauth providers with redirect

    // #region sign-in with email

    private async sendSignInLinkToEmail(): Promise<void> {
        try {
            this.log(`instructing firebase to send an email sign-in link`);
            await sendSignInLinkToEmail(
                this.Auth,
                this.EmailAddress!,
                this.EmailActionCodeSettings,
            );
            this.log(`successfully sent sign-in link`);

            await this.publishStateChanged?.({
                successfullySentSignInLinkToEmail: true,
            });
        } catch (error: unknown) {
            const errorCodeMessage =
                error instanceof FirebaseError ? `code: ${error.code}. ` : "";
            this.log(
                `firebase failed to send the email sign-in link. ` +
                    `${errorCodeMessage}message: "${(error as Error).message}".`,
            );
            await this.publishStateChanged?.({
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
            this.publishStateChanged?.({
                userOpenedEmailLinkOnSameBrowser: false,
            });
            return;
        }

        this.log(`the user has opened the email link on the same browser.`);
        this.publishStateChanged?.({
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
                this.upsertUser(userCredentialResult.user);
                this.signedInStatus[authProviders.Email] = true;
                this.publishStateChanged?.({
                    userCredentialFoundViaEmail: true,
                });
                return;
            } else {
                this.logger?.({
                    logMessage: "user was not signed in with email link",
                    logData: this.safeUserCredential(userCredentialResult),
                });
                this.publishStateChanged?.({
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
            this.publishStateChanged?.({
                userCredentialFoundViaEmail: false,
            });
        }
    }

    // #endregion sign-in with email

    // #region user caching

    private userAlreadyCached(user: User): boolean {
        if (this.User == null) return false;

        // todo: loop through providers

        const providerID = user.providerData[0].providerId as TAuthProvider;
        if (!this.User.hasOwnProperty(providerID)) return false;

        const cachedUser = this.User[providerID];
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

    // private saveUser(user: User) {
    //     for (const userInfo of user.providerData) {
    //         const providerID = userInfo.providerId as TAuthProvider;
    //         if (this.user == null) {
    //             this.user = { [providerID]: user };
    //         } else {
    //             this.user[providerID] = user;
    //         }
    //     }
    // }

    // private cacheUser(user: User): void {
    //     // cache the user under service provider since FIREBASE_LINK_ACCOUNTS=false
    //     for (const userInfo of user.providerData) {
    //         const providerID = userInfo.providerId as TAuthProvider;
    //         const cachedUserJSON: string | null =
    //             this._window.localStorage.getItem(
    //                 this.localStorageCachedUserKey,
    //             );
    //         let cachedUser: Record<string, TSafeUser> = {};
    //         if (cachedUserJSON !== null) {
    //             cachedUser = JSON.parse(cachedUserJSON!);
    //         }
    //         const convertToIdempotent = true;
    //         cachedUser[providerID] = this.safeUserResponse(
    //             user,
    //             convertToIdempotent,
    //         );
    //         this._window.localStorage.setItem(
    //             this.localStorageCachedUserKey,
    //             JSON.stringify(cachedUser),
    //         );
    //     }
    // }

    public clearUserCache(): void {
        this.User = {};
        this.deleteCachedEmail();
    }

    private deleteCachedEmail(): void {
        this.EmailAddress = "";
        this.signedInStatus[authProviders.Email] = false;
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
