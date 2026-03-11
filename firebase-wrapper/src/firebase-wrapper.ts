// #region imports

import type { FirebaseOptions } from "firebase/app";
import { FirebaseError, initializeApp } from "firebase/app";
import type {
    ActionCodeSettings,
    Auth,
    AuthProvider,
    User,
    UserCredential,
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
import type { TDBUserDTO } from "./db-user.ts";
import { dbDeleteUser, dbGetUser } from "./db-user.ts";
import type { TProcessEnv } from "./dotenv.d.ts";
import type { TLogItem } from "./gui-logger.ts";
import {
    mapFirebaseUser2DBUserDTO,
    mapMergeUserDTOs,
    safeCredentialResponse,
    safeUserCredential,
    safeUserResponse,
} from "./mappers/user.ts";
import type { TMutable } from "./utils.ts";
import { clearQueryParams, deepCopy, objIsNullOrEmpty } from "./utils.ts";

// #endregion imports

// #region consts and types

type TFacebookMeResponse = {
    id: string;
    picture?: {
        data?: {
            url?: string;
            height?: number;
            width?: number;
            is_silhouette?: boolean;
        };
    };
};

type TAuthProviderName = keyof typeof authProviders;
export type TAuthProvider = (typeof authProviders)[TAuthProviderName];

export const authProviders = {
    Email: EmailAuthProvider.PROVIDER_ID,
    Google: GoogleAuthProvider.PROVIDER_ID,
    Facebook: FacebookAuthProvider.PROVIDER_ID,
    Github: GithubAuthProvider.PROVIDER_ID,
} as const;

export const defaultAction: TDefaultAction = null;

export type TFirebaseWrapperStateDTO = {
    successfullySentSignInLinkToEmail?: boolean;
    urlIsAnEmailSignInLink?: boolean;
    userOpenedEmailLinkOnSameBrowser?: boolean;
    userCredentialFoundViaEmail?: boolean;
    emailDataDeleted?: boolean;

    failedToRedirectToAuthProvider?: TAuthProvider;
    nullCredentialAfterSignIn?: TAuthProvider;
    nullCredentialAfterRedirect?: boolean;
    checkingRedirectResult?: boolean;
    foundUser?: TAuthProvider;
    foundToken?: TAuthProvider;

    // note: some providers include the profile pic in the sign-in response
    // so this is not necessary for them
    gotProfilePic?: TAuthProvider;
    failedToGetProfilePic?: TAuthProvider;

    userNotSignedIn?: boolean;
};

/** the actual User type with missing properties that firebase adds */
export type TUserWithToken = TMutable<User> & {
    token: string;
    tokenExpiry: number;
};

type TStateChangedCallback = (dto: TFirebaseWrapperStateDTO) => Promise<void>;

export type TDefaultAction = null;

type TAuthProviderConstructor =
    | typeof GoogleAuthProvider
    | typeof FacebookAuthProvider
    | typeof GithubAuthProvider;

// #endregion consts and types

/**
 * single responsibility principle: this service does not know anything about
 * state machines and is not a state machine so it does not hold an enumerated state.
 * it just contains firebase-method-wrappers that make taking action more simple and uniform.
 * this service is intended to be controlled externally, so it does not initiate actions
 * (except for publishing firebase events).
 *
 * this class is a singleton. the same instance should be used for all providers.
 *
 * this class holds state data (eg. email address) so the object instances
 * will share user-state, especially via local storage.
 *
 * persistent user data lives in the database, not in this class' state.
 *
 * persistent token data lives in the database (not local-storage) and also in this class's
 * state for easy access.
 */
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
    private hiddenMessage = "not stored in localStorage to prevent xss attacks";
    public signedInStatus: Record<TAuthProvider, boolean> = {
        [authProviders.Email]: false,
        [authProviders.Google]: false,
        [authProviders.Facebook]: false,
        [authProviders.Github]: false,
    };
    private user: TDBUserDTO = null;
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

    public get User(): TDBUserDTO {
        if (!objIsNullOrEmpty(this.user)) {
            return this.user;
        }
        // note: use our own db instead of the firebase db.
        // see docs/user-db.md for a discussion of why.
        this.user = dbGetUser();
        return this.user;
    }

    private set User(user: TUserWithToken) {
        if (objIsNullOrEmpty(user)) {
            this.deleteUser();
            return;
        }
        this.updateUser(user as TUserWithToken);
    }

    private deleteUser(): void {
        this.user = null;
        dbDeleteUser();
    }

    private updateUser(user: TUserWithToken): void {
        const newUserDTO = mapFirebaseUser2DBUserDTO(user);
        this.user = mapMergeUserDTOs(this.user, newUserDTO);
    }

    private setToken(
        providerID: TAuthProvider,
        token?: string,
        tokenExpiry?: number,
    ): void {
        if (objIsNullOrEmpty(this.User)) {
            this.log(
                `unable to set token for provider ${providerID} - user is empty`,
            );
            return;
        }
        if (token == null) return;
        this.User![providerID]!.token = token;
        this.User![providerID]!.tokenExpiry = tokenExpiry;
    }

    private setupSignedInStatus(): void {
        for (const providerID in this.User) {
            this.signedInStatus[providerID as TAuthProvider] = true;
        }
    }

    private log(logMessage: string): void {
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
        await signOut(this.Auth); // will trigger authStateChanged
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
            case authProviders.Github:
                return GithubAuthProvider;
            default:
                throw new Error(`unsupported provider ${providerId}`);
        }
    }

    public async checkIfRedirectResult(): Promise<void> {
        try {
            const redirectResult: UserCredential | null =
                await getRedirectResult(this.Auth);

            if (redirectResult == null) {
                this.log(
                    `just checked: the current page url is not a redirect ` +
                        `from a service provider`,
                );
                // note: do not call this.publishStateChanged() here
                return;
            }

            // we only get here once - immediately after login
            // (stackoverflow.com/a/44468387)

            const providerID = redirectResult.providerId as TAuthProvider;
            const providerClass = this.authProviderFactory(providerID);
            const isIdempotent = true;

            const credential: OAuthCredential | null =
                providerClass.credentialFromResult(redirectResult);
            if (credential == null) {
                this.log(
                    `credential is null immediately after sign-in with ${providerID}`,
                );
                await this.publishStateChanged?.({
                    nullCredentialAfterSignIn: providerID,
                });
                return;
            }

            this.logger?.({
                logMessage: `credential immediately after sign-in with ${providerID}`,
                logData: credential,
                safeLocalStorageData: safeCredentialResponse(
                    credential,
                    this.hiddenMessage,
                ),
            });

            const accessToken: string | undefined = credential.accessToken;
            if (accessToken == null) {
                this.log(
                    `accessToken is null immediately after sign-in with ${providerID}`,
                );
                await this.publishStateChanged?.({
                    nullCredentialAfterSignIn: providerID,
                });
                return;
            }
            this.setSignedInStatus(providerID, true);
            this.User = redirectResult.user as TUserWithToken;

            // this is the only chance we have to save the token - immediately after login
            this.setToken(providerID, credential.accessToken);

            this.logger?.({
                logMessage: `got user via ${providerID}`,
                logData: this.User,
                safeLocalStorageData: safeUserResponse(
                    redirectResult.user,
                    isIdempotent,
                    this.hiddenMessage,
                ),
                imageURL: this.User?.[providerID]?.photoURL,
            });

            await this.publishStateChanged?.({ foundToken: providerID });
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
            this.log(`firebase error after redirect: ${errorMessage}`);
            await this.publishStateChanged?.({
                nullCredentialAfterRedirect: true,
            });
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
                userNotSignedIn: true,
            });
        }
    }

    // todo: we probably only care about email here. the others use checkIfRedirectResult
    private async afterUserSignedIn(user: User): Promise<void> {
        const logMessageStart: string = "firebase auth event.";
        const initialStatuses = deepCopy(this.signedInStatus);

        const isIdempotent = true;
        for (const providerName in authProviders) {
            const providerID = authProviders[providerName as TAuthProviderName];
            if (providerID !== authProviders.Email) {
                continue;
            }
            if (this.isAlreadySignedInWith(providerID, initialStatuses)) {
                this.logger?.({
                    logMessage:
                        logMessageStart +
                        `user is already signed-in with ${providerName}`,
                    logData: this.User,
                    safeLocalStorageData: safeUserResponse(
                        user,
                        isIdempotent,
                        this.hiddenMessage,
                    ),
                    imageURL: user.photoURL,
                });
            }
        }

        if (this.isJustSignedInWith(authProviders.Email, initialStatuses)) {
            this.User = user as TUserWithToken;
            this.logger?.({
                logMessage:
                    logMessageStart + ` user was just signed in via email`,
                logData: user,
                safeLocalStorageData: safeUserResponse(
                    user,
                    isIdempotent,
                    this.hiddenMessage,
                ),
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
                safeLocalStorageData: safeUserResponse(
                    user,
                    isIdempotent,
                    this.hiddenMessage,
                ),
                imageURL: user.photoURL,
            });

            await this.publishStateChanged?.({
                foundUser: authProviders.Facebook,
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

    public async getProfilePicUrl(
        serviceProvider: TAuthProvider,
    ): Promise<void> {
        try {
            switch (serviceProvider) {
                case authProviders.Facebook:
                    const token = this.User?.[authProviders.Facebook]?.token;
                    const getMeResponse = await fetch(
                        `https://graph.facebook.com/me?fields=picture.type(large)&` +
                            `access_token=${token}`,
                    );
                    const me: TFacebookMeResponse = await getMeResponse.json();
                    const imageURL = me?.picture?.data?.url;
                    if (imageURL == null) {
                        const errorMessage = `empty profile pic URL from facebook graph api`;
                        this.log(errorMessage);
                        throw new Error(errorMessage);
                    }
                    this.logger?.({
                        logMessage: `got profile pic URL from facebook graph api`,
                        logData: me,
                        imageURL,
                    });

                    this.User![authProviders.Facebook]!.photoURL = imageURL;
                    this.updateUser(this.User as TUserWithToken);
                    await this.publishStateChanged?.({
                        gotProfilePic: serviceProvider,
                    });
                    return;
                default:
                    throw new Error(
                        `getting the profile pic for ${serviceProvider} is not supported`,
                    );
            }
        } catch (error) {
            this.log(
                `failed to get profile pic for ${serviceProvider}` +
                    `${error instanceof Error ? error.message : ""}`,
            );
            await this.publishStateChanged?.({
                failedToGetProfilePic: serviceProvider,
            });
            return;
        }
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
                const isIdempotent = true;
                this.logger?.({
                    logMessage: "user signed in with email link",
                    logData: userCredentialResult,
                    safeLocalStorageData: safeUserCredential(
                        userCredentialResult,
                        isIdempotent,
                        this.hiddenMessage,
                    ),
                    imageURL: userCredentialResult.user.photoURL,
                });
                this.User = userCredentialResult.user as TUserWithToken;
                this.signedInStatus[authProviders.Email] = true;
                this.publishStateChanged?.({
                    userCredentialFoundViaEmail: true,
                });
                return;
            } else {
                const isIdempotent = true;
                this.logger?.({
                    logMessage: "user was not signed in with email link",
                    logData: safeUserCredential(
                        userCredentialResult,
                        isIdempotent,
                        this.hiddenMessage,
                    ),
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

    public clearUserCache(): void {
        this.deleteUser();
        this.deleteCachedEmail();
    }

    private deleteCachedEmail(): void {
        this.EmailAddress = "";
        this.signedInStatus[authProviders.Email] = false;
        this._window.localStorage.removeItem(this.localStorageEmailAddressKey);
    }

    // #endregion user caching
}
