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
import { ProcessEnv } from "./dotenv";
import {
    emailSignInActions,
    EmailSignInIdle,
    EmailSignInState,
    emailSignInStates,
} from "./fsm-email";
import { LogItem } from "./gui-logger";

// #endregion

// #region interfaces

export interface FirebaseDependencies {
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
}

export interface WrapperSettings {
    logger: (logItemInput: LogItem) => void;
    emailStateChangedCallback: (
        newState: keyof typeof emailSignInStates, //,
        //    action: keyof typeof emailSignInActions | null,
    ) => void;
    emailActionCallback: (action: keyof typeof emailSignInActions) => void;
    loginButtonCSSClass: string;
    clearCachedUserButtonCSSClass: string;
    authProviderSettings: {
        [key in AuthProviders]: {
            loginButtonClicked:
                | DefaultAction
                | ((self: FirebaseAuthService, e: MouseEvent) => Promise<void>);
        };
    };
    signedInCallback: (user: UserPlus) => void;
    signedOutCallback: () => void;

    /** email sign-in step 5/9 */
    reenterEmailAddressCallback: (self: FirebaseAuthService) => void;

    /** email sign-in step 8/9 */
    clearEmailAfterSignInCallback: (self: FirebaseAuthService) => boolean;
}

// #endregion

// #region types

export type AuthProviders = (typeof authProviders)[keyof typeof authProviders];

export type DefaultAction = null;

// a type for undocumented internal properties that are *actually* returned
// in addition to the User object. note: these could change without warning
// in future.
export type UserPlus = User & {
    stsTokenManager?: {
        refreshToken?: unknown;
        expirationTime: number;
        accessToken?: unknown;
    };
    lastLoginAt?: number;
};

type AuthProviderConstructor =
    | typeof GoogleAuthProvider
    | typeof FacebookAuthProvider
    | typeof GithubAuthProvider;

type EventListenerMethod = <K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
) => void;

// #endregion

// #region consts

export const firebaseDependencies: FirebaseDependencies = {
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

export const defaultAction: DefaultAction = null;

// #endregion

// #region enums

// export enum EmailSignInStates {
//     EmailNotSent,
//     WaitingForUserToFollowEmailLink,
//     EmailLinkOpenedOnDifferentBrowser,
//     EmailLinkOpenedOnSameBrowser,
//     SignedIn,
// }
enum CRUD {
    Create,
    Read,
    Update,
    Delete,
}

// #endregion

export class FirebaseAuthService {
    private settings: WrapperSettings;
    private logger: (logItem: LogItem) => void;
    private env: ProcessEnv;
    public Auth: Auth;
    public emailAddress: string | null;
    public UseLinkInsteadOfPassword: boolean = false;
    public EmailPassword: string | null = null;
    public EmailActionCodeSettings: ActionCodeSettings;
    private localStorageEmailAddressKey = "emailAddress";
    private localStorageCachedUserKey = "cachedUser";
    private hiddenMessage: string =
        "not stored in localStorage to prevent xss attacks";
    private emailState!: EmailSignInState;
    private emailStateChangedCallback: (
        newState: keyof typeof emailSignInStates, //,
        //action: keyof typeof emailSignInActions | null,
    ) => void;
    private emailActionCallback: (
        action: keyof typeof emailSignInActions,
    ) => void;
    private backedUpEmailLoginButtonClicked:
        | DefaultAction
        | ((self: FirebaseAuthService, e: MouseEvent) => Promise<void>)
        | null = null;

    public set Settings(settings: WrapperSettings) {
        this.SetupEvents(this.settings, CRUD.Delete);
        this.settings = settings;
        this.SetupEvents(this.settings, CRUD.Create);
    }

    public get EmailAddress(): string | null {
        return this.emailAddress;
    }
    public set EmailAddress(emailAddress: string) {
        window.localStorage.setItem(
            this.localStorageEmailAddressKey,
            emailAddress,
        );
        this.emailAddress = emailAddress;
    }

    // public get EmailState(): EmailSignInStates | null {
    //     return this.emailState;
    // }
    // private set EmailState(emailState: EmailSignInStates) {
    //     this.Logger?.({ logMessage: `email state changed to ${emailState}` });
    //     this.emailState = emailState;
    // }
    // public SetEmailState<T extends EmailSignInState>(
    //     stateClass: new (
    //         firebaseAuthService: FirebaseAuthService,
    //         logger: (logItem: LogItem) => void,
    //     ) => T,
    //     //action: keyof typeof emailSignInActions | null,
    // ): void {
    //     this.emailStateChangedCallback?.(
    //         stateClass.name as keyof typeof emailSignInStates,
    //         //action,
    //     );
    //     this.logger?.({
    //         logMessage: `email state changed to ${stateClass.name}`,
    //     });
    //     this.emailState = new stateClass(this, this.logger);
    // }
    public SetEmailState<T extends EmailSignInState>(
        stateClass: new () => T,
    ): void {
        this.emailStateChangedCallback?.(
            stateClass.name as keyof typeof emailSignInStates,
        );
        this.logger?.({
            logMessage: `email state changed to ${stateClass.name}`,
        });
        this.emailState = new stateClass();
        this.emailState.firebaseAuthService = this;
        this.emailState.logger = this.logger;
    }

    public CallEmailAction(action: keyof typeof emailSignInActions): void {
        this.emailActionCallback?.(action);
        const methodName = emailSignInActions[action];
        (this.emailState[methodName] as Function)();
    }

    constructor(input: { env: ProcessEnv; settings: WrapperSettings }) {
        this.env = input.env;
        this.settings = input.settings;
        this.logger = input.settings.logger;
        this.SetEmailState(EmailSignInIdle);
        this.emailStateChangedCallback =
            input.settings.emailStateChangedCallback;
        this.emailActionCallback = input.settings.emailActionCallback;
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
        this.emailAddress = window.localStorage.getItem(
            this.localStorageEmailAddressKey,
        );
        this.EmailActionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true,
        };
        const app = initializeApp(firebaseOptions);
        this.Auth = getAuth(app);
        this.logger?.({ logMessage: `finished initializing firebase SDK` });
        this.setupFirebaseListeners();
        this.SetupEvents(this.settings, CRUD.Create);
    }

    private SetupEvents(settings: WrapperSettings, eventAction: CRUD): void {
        const eventListener = this.getEventListener(eventAction);
        const clearCacheButton = document.querySelector(
            settings.clearCachedUserButtonCSSClass,
        );
        if (clearCacheButton) {
            eventListener.call(
                clearCacheButton,
                "click",
                this.clearUserCache.bind(this),
            );
        }
        const loginButtons = document.querySelectorAll(
            settings.loginButtonCSSClass,
        );
        if (!loginButtons || loginButtons.length === 0) {
            return;
        }
        for (const button of loginButtons) {
            if (!(button instanceof HTMLButtonElement)) continue;
            const provider = button.dataset.serviceProvider as AuthProviders;
            const foundProvider = settings.authProviderSettings[provider];
            const action =
                foundProvider?.loginButtonClicked ??
                this.serviceProviderNotFoundAction;

            eventListener.call(button, "click", async (e) => {
                const mouseEvent = e as HTMLElementEventMap["click"];
                this.logger?.({ logMessage: `login with ${provider} clicked` });
                await (action === defaultAction
                    ? this.Signin(provider)
                    : action(this, mouseEvent));
            });
        }
    }

    private getEventListener(action: CRUD): EventListenerMethod {
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

    private async setupFirebaseListeners(): Promise<void> {
        onAuthStateChanged(this.Auth, this.authStateChanged.bind(this));
        await this.emailState.CheckIfURLIsASignInWithEmailLink();
        await this.handleGetRedirectResult();
    }

    private async handleGetRedirectResult(): Promise<void> {
        try {
            const redirectResult: UserCredential | null =
                await getRedirectResult(this.Auth);
            if (redirectResult == null) {
                this.logger?.({ logMessage: `redirectResult fired - null` });
                return;
            }

            // we only get here once - immediately after login
            // (stackoverflow.com/a/44468387)

            const providerId = redirectResult.providerId as AuthProviders;
            const providerClass = this.authProviderFactory(providerId);
            const credential =
                providerClass.credentialFromResult(redirectResult);
            if (credential == null) {
                this.logger?.({
                    logMessage: `credential is null immediately after sign-in`,
                });
                return;
            }
            this.logger?.({
                logMessage: `credential immediately after sign-in with ${providerId}`,
                logData: credential,
                safeLocalStorageData: this.safeCredentialResponse(credential),
            });
            const accessToken: string | undefined = credential.accessToken;
            if (accessToken === undefined) {
                this.logger?.({
                    logMessage: `accessToken is null immediately after sign-in with ${providerId}`,
                });
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
            this.logger?.({
                logMessage: `firebase auth state changed - user is signed-out`,
            });
            this.settings.signedOutCallback();
        }
    }

    private afterUserSignedIn(user: UserPlus): void {
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

    public async Signin(provider: AuthProviders): Promise<void> {
        if (provider === authProviders.Email) {
            return this.emailState.UserInputsEmailAddressAndClicksSignInButton();
            //return await this.emailSignInStateMachine();
        } else {
            let authProvider: AuthProvider;
            try {
                authProvider = new (this.authProviderFactory(provider))();
            } catch (e) {
                if (e instanceof Error) {
                    this.logger?.({ logMessage: e.message });
                } else {
                    this.logger?.({
                        logMessage: `unknown error for ${provider} in Signin()`,
                        logData: e,
                    });
                }
                return;
            }
            this.logger?.({ logMessage: `redirecting to ${provider}` });
            signInWithRedirect(this.Auth, authProvider);
        }
    }

    private authProviderFactory(
        providerId: AuthProviders,
    ): AuthProviderConstructor {
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

    // private changeEmailState(emailState: EmailSignInState): void {
    //     this.logger?.({ logMessage: `email state changed to ${emailState}` });
    //     this.emailState = emailState;
    // }

    // private async emailSignInStateMachine(): Promise<void> {
    //     switch (this.EmailState) {
    //         case EmailSignInStates.EmailNotSent:
    //             if (this.UseLinkInsteadOfPassword) {
    //                 // email sign-in step 1/9
    //                 await this.handleSendLinkToEmail();
    //             } else {
    //                 throw new Error(
    //                     "sign in with email and password not implemented yet",
    //                 );
    //             }
    //             return;
    //         case EmailSignInStates.EmailLinkOpenedOnSameBrowser:
    //             // email sign-in step 7/9
    //             await this.handleSignInWithEmailLink();
    //             break;
    //         default:
    //             break;
    //     }
    // }

    /** email sign-in step 1/9 */
    // private async handleSendLinkToEmail(): Promise<void> {
    //     if (!this.ValidateEmailDataBeforeSignIn()) {
    //         return;
    //     }
    //     try {
    //         debugger;
    //         await sendSignInLinkToEmail(
    //             this.Auth,
    //             this.emailAddress!,
    //             this.EmailActionCodeSettings,
    //         );
    //         this.EmailState = EmailSignInStates.WaitingForUserToFollowEmailLink;
    //         this.logger?.({
    //             logMessage: `a sign-in link has been sent to ${this.emailAddress}.`,
    //         });
    //     } catch (error) {
    //         this.logger?.({
    //             logMessage: "error when sending email link",
    //             logData: error,
    //         });
    //         console.error("error when signing in by email", error);
    //     }
    // }

    // /** email sign-in step 3/9 */
    // private async checkIfURLIsASignInWithEmailLink(): Promise<void> {
    //     if (!isSignInWithEmailLink(this.Auth, window.location.href)) {
    //         this.logger?.({
    //             logMessage:
    //                 `just checked: the current page url is not a ` +
    //                 `sign-in-with-email-link`,
    //         });
    //         this.EmailState = EmailSignInStates.EmailNotSent;
    //         return;
    //     }
    //     this.logger?.({
    //         logMessage:
    //             `just checked: the current page url is a ` +
    //             `sign-in-with-email-link`,
    //     });
    //     if (this.emailAddress != null) {
    //         this.logger?.({
    //             logMessage: `the user has opened the email link on the same browser.`,
    //         });
    //         this.EmailState = EmailSignInStates.EmailLinkOpenedOnSameBrowser;
    //     } else {
    //         this.logger?.({
    //             logMessage:
    //                 `the user has opened the email link on a different browser. ` +
    //                 `<b>to prevent session fixation attacks, you must enter the email ` +
    //                 `address again</b>`,
    //         });
    //         this.EmailState =
    //             EmailSignInStates.EmailLinkOpenedOnDifferentBrowser;

    //         // email sign-in step 4/9
    //         this.backupEmailLoginButtonClicked();

    //         // email sign-in step 5/9
    //         this.settings.reenterEmailAddressCallback(this);
    //     }
    //     await this.emailSignInStateMachine();
    // }

    // /** email sign-in step 4/9 */
    // private backupEmailLoginButtonClicked(): void {
    //     this.backedUpEmailLoginButtonClicked =
    //         this.settings.authProviderSettings[
    //             authProviders.Email
    //         ].loginButtonClicked;
    // }

    // /** email sign-in step 7/9 */
    // private async handleSignInWithEmailLink(): Promise<void> {
    //     try {
    //         const result: UserCredential = await signInWithEmailLink(
    //             this.Auth,
    //             this.emailAddress!,
    //             window.location.href,
    //         );
    //         if (result) {
    //             this.logger?.({
    //                 logMessage: "user signed in with email link",
    //                 logData: result,
    //             });
    //         } else {
    //             this.logger?.({
    //                 logMessage: "user was not signed in with email link",
    //                 logData: result,
    //             });
    //         }

    //         // email sign-in step 8/9
    //         if (this.settings.clearEmailAfterSignInCallback(this)) {
    //             this.clearEmailCache();
    //         }

    //         // You can access the new user via result.user
    //         // Additional user info profile not available via:
    //         // result.additionalUserInfo.profile == null
    //         // You can check if the user is new or existing:
    //         // result.additionalUserInfo.isNewUser

    //         // email sign-in step 9/9
    //         this.restoreEmailLoginButtonClicked();
    //     } catch (error) {
    //         console.log(error);
    //         // Some error occurred, you can inspect the code: error.code
    //         // Common errors could be invalid email and invalid or expired OTPs.
    //     }
    // }

    // /** email sign-in step 9/9 */
    // private restoreEmailLoginButtonClicked(): void {
    //     if (this.backedUpEmailLoginButtonClicked === null) return;
    //     this.settings.authProviderSettings[
    //         authProviders.Email
    //     ].loginButtonClicked = this.backedUpEmailLoginButtonClicked;
    // }

    private userAlreadyCached(user: UserPlus): boolean {
        const cachedUsersJSON: string | null = window.localStorage.getItem(
            this.localStorageCachedUserKey,
        );
        if (cachedUsersJSON === null) return false;

        const cachedUsers: Record<string, UserPlus> =
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

    private cacheUser(user: UserPlus): void {
        // cache the user under service provider since FIREBASE_LINK_ACCOUNTS=false
        const serviceProvider = user.providerData[0].providerId;
        const cachedUserJSON: string | null = window.localStorage.getItem(
            this.localStorageCachedUserKey,
        );
        let cachedUser: Record<string, UserPlus> = {};
        if (cachedUserJSON !== null) {
            cachedUser = JSON.parse(cachedUserJSON!);
        }
        cachedUser[serviceProvider] = this.safeUserResponse(
            this.idempotentUserResponse(user),
        );
        window.localStorage.setItem(
            this.localStorageCachedUserKey,
            JSON.stringify(cachedUser),
        );
    }

    public clearUserCache(): void {
        window.localStorage.removeItem(this.localStorageCachedUserKey);
        this.clearEmailCache();
    }

    private clearEmailCache(): void {
        window.localStorage.removeItem(this.localStorageEmailAddressKey);
    }

    serviceProviderNotFoundAction(self: FirebaseAuthService, e: MouseEvent) {
        console.error(`Service provider not found`);
    }

    /** use this method to zero out any sensitive fields before saving to localStorage,
     * since localStorage may be vulnerable to xss attacks.
     */
    private safeUserResponse(user: UserPlus): UserPlus {
        // deep copy
        const safeUser = JSON.parse(JSON.stringify(user)) as UserPlus;
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

    private idempotentUserResponse(user: UserPlus): UserPlus {
        // deep copy
        const userCopy = JSON.parse(JSON.stringify(user)) as UserPlus;
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
