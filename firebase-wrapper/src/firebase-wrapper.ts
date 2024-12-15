import {
    initializeApp,
    FirebaseOptions,
    FirebaseApp,
    FirebaseError,
} from "firebase/app";
import {
    getAuth,
    getRedirectResult,
    signInWithRedirect,
    FacebookAuthProvider,
    OAuthCredential,
    GoogleAuthProvider,
    EmailAuthProvider,
    Auth,
    User,
    sendSignInLinkToEmail,
    ActionCodeSettings,
    isSignInWithEmailLink,
    signInWithEmailLink,
    onAuthStateChanged,
    AuthProvider,
    UserCredential,
    GithubAuthProvider,
} from "firebase/auth";
import { ProcessEnv } from "./dotenv";
import { LogItem } from "./gui-logger";

type AuthProviderConstructor =
    | typeof GoogleAuthProvider
    | typeof FacebookAuthProvider
    | typeof GithubAuthProvider;

export const authProviders = {
    Email: EmailAuthProvider.PROVIDER_ID,
    Google: GoogleAuthProvider.PROVIDER_ID,
    Facebook: FacebookAuthProvider.PROVIDER_ID,
    GitHub: GithubAuthProvider.PROVIDER_ID,
} as const;
export type AuthProviders = (typeof authProviders)[keyof typeof authProviders];

export type DefaultAction = null;
export const defaultAction: DefaultAction = null;

// a type for undocumented internal properties. these could change without warning
// in future.
export type UserPlus = User & {
    stsTokenManager?: {
        refreshToken?: unknown;
        expirationTime: number;
        accessToken?: unknown;
    };
    lastLoginAt?: number;
};

export interface WrapperSettings {
    logger: (logItemInput: LogItem) => void;
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
}

export class FirebaseAuthService {
    private _window: Window;
    _document: Document;
    private logger: (logItem: LogItem) => void;
    private env: ProcessEnv;
    private settings: WrapperSettings;
    private auth: Auth;
    private firebase: FirebaseApp;
    private emailAddress!: string;
    private useLinkInsteadOfPassword!: boolean;
    private emailPassword!: string;
    private emailActionCodeSettings: ActionCodeSettings;
    localStorageEmailAddressKey = "firebaseEmailAddress";
    private localStorageCachedUserKey = "cachedUser";
    private hiddenMessage: string =
        "not stored in localStorage to prevent xss attacks";

    constructor(window: Window, env: ProcessEnv, settings: WrapperSettings) {
        this._window = window;
        this._document = window.document;
        this.env = env;
        this.settings = settings;
        this.logger = settings.logger;

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
        this.emailActionCodeSettings = {
            url: env.PROJECT_DOMAIN,
            handleCodeInApp: true,
        };
        this.logger?.({ logMessage: `initializing the firebase SDK` });
        this.firebase = initializeApp(firebaseOptions);
        this.auth = getAuth(this.firebase);
        this.logger?.({ logMessage: `finished initializing firebase SDK` });
        this.setupFirebaseListeners();
        this.SetupEvents();
    }

    private SetupEvents(): void {
        this._document
            .querySelector(this.settings.clearCachedUserButtonCSSClass)
            ?.addEventListener("click", this.clearUserCache.bind(this));

        const loginButtons = this._document.querySelectorAll(
            this.settings.loginButtonCSSClass,
        );
        if (!loginButtons) return;
        for (const button of loginButtons) {
            const tsButton = button as HTMLButtonElement;
            const provider = tsButton.dataset.serviceProvider as AuthProviders;
            const foundProvider = this.settings.authProviderSettings[provider];
            let action;
            if (foundProvider) action = foundProvider?.loginButtonClicked;
            else action = this.serviceProviderNotFoundAction;
            tsButton.addEventListener("click", async (e) => {
                this.logger?.({ logMessage: `login with ${provider} clicked` });
                if (action === defaultAction) await this.Signin(provider);
                else await action(this, e);
            });
        }
    }

    public SetupForEmailSign(
        emailAddress: string,
        useLinkInsteadOfPassword: boolean,
        emailPassword: string,
    ): FirebaseAuthService {
        this.emailAddress = emailAddress;
        this.useLinkInsteadOfPassword = useLinkInsteadOfPassword;
        this.emailPassword = emailPassword;
        return this;
    }

    private async setupFirebaseListeners(): Promise<void> {
        try {
            const redirectResult: UserCredential | null =
                await getRedirectResult(this.auth);
            if (redirectResult == null) return;

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
            debugger;
            //const credential = GithubAuthProvider.credentialFromError(firebaseError);
        }

        const logMessageStart: string = "firebase auth state changed";
        onAuthStateChanged(this.auth, (user) => {
            if (user) this.afterUserSignedIn(user);
            else {
                this.logger?.({
                    logMessage: `${logMessageStart} - user is signed-out`,
                });
                this.settings.signedOutCallback();
            }
        });
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
            if (this.useLinkInsteadOfPassword) {
                await this.handleSendLinkToEmail();
            } else {
                // TODO: sign in with email and password
            }
            return;
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
                    });
                }
                return;
            }
            this.logger?.({ logMessage: `redirecting to ${provider}` });
            signInWithRedirect(this.auth, authProvider);
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

    private async handleSendLinkToEmail(): Promise<void> {
        try {
            const xxx = await sendSignInLinkToEmail(
                this.auth,
                this.emailAddress,
                this.emailActionCodeSettings,
            );

            // The link was successfully sent. Inform the user.
            // Save the email locally so we don't need to ask the user for it again
            // if they open the link on the same device.
            this._window.localStorage.setItem(
                this.localStorageEmailAddressKey,
                this.emailAddress,
            );
        } catch (error) {
            console.error("error when signing in by email", error);
        }
    }

    public async EmailSignInStep2() {
        if (!isSignInWithEmailLink(this.auth, this._window.localStorage.href)) {
            // the current page url was not a sign-in-with-email-link.
            // no worries. no action needed
            return;
        }
        let email = this._window.localStorage.getItem(
            this.localStorageEmailAddressKey,
        );
        if (email) {
            this.emailAddress = email.toString();
        } else {
            // User opened the link on a different device. To prevent session fixation
            // attacks, ask the user to provide the associated email again. For example:
            email = window.prompt(
                `Please provide your email address to finalise signing-in to ${this.env.PROJECT_NAME}`,
            );
            if (email) {
                this.emailAddress = email.toString();
            }
        }
        // The client SDK will parse the code from the link for you.
        signInWithEmailLink(
            this.auth,
            this.emailAddress,
            this._window.location.href,
        )
            .then((result) => {
                // Clear email from storage.
                window.localStorage.removeItem(
                    this.localStorageEmailAddressKey,
                );
                // You can access the new user via result.user
                // Additional user info profile not available via:
                // result.additionalUserInfo.profile == null
                // You can check if the user is new or existing:
                // result.additionalUserInfo.isNewUser
            })
            .catch((error) => {
                console.log(error);
                // Some error occurred, you can inspect the code: error.code
                // Common errors could be invalid email and invalid or expired OTPs.
            });
    }

    private userAlreadyCached(user: UserPlus): boolean {
        debugger;
        const cachedUsersJSON: string | null =
            this._window.localStorage.getItem(this.localStorageCachedUserKey);
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
        const cachedUserJSON: string | null = this._window.localStorage.getItem(
            this.localStorageCachedUserKey,
        );
        let cachedUser: Record<string, UserPlus> = {};
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
