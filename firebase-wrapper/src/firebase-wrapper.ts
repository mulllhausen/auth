import { initializeApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInWithRedirect,
    FacebookAuthProvider,
    GoogleAuthProvider,
    EmailAuthProvider,
    Auth,
    sendSignInLinkToEmail,
    ActionCodeSettings,
    isSignInWithEmailLink,
    signInWithEmailLink,
    onAuthStateChanged,
} from "firebase/auth";
import { ProcessEnv } from "./.env.d";

type SupportedProviders =
    | FacebookAuthProvider
    | GoogleAuthProvider
    | EmailAuthProvider;

export class FirebaseAuthService {
    private _window: Window;
    private env: ProcessEnv;
    private auth!: Auth;
    private firebase!: FirebaseApp;
    private emailAddress!: string;
    private emailPassword!: string;
    private emailActionCodeSettings!: ActionCodeSettings;
    localStorageEmailAddressKey = "firebaseEmailAddress";

    constructor(
        window: Window,
        env: ProcessEnv,
        signedInCallback: Function,
        signedOutCallback: Function,
    ) {
        this._window = window;
        this.env = env;

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
        this.firebase = initializeApp(firebaseOptions);
        this.auth = getAuth(this.firebase);
        this.setupListeners(signedInCallback, signedOutCallback);
    }

    public SetupForEmailSign(emailAddress: string, emailPassword: string) {
        this.emailAddress = emailAddress;
        this.emailPassword = emailPassword;
    }

    private setupListeners(
        signedInCallback: Function,
        signedOutCallback: Function,
    ) {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                // User is signed in, see docs for a list of available properties
                // https://firebase.google.com/docs/reference/js/firebase.User
                signedInCallback(user);
            } else {
                signedOutCallback(user);
            }
        });
    }

    public async Signin(provider: SupportedProviders) {
        if (provider instanceof EmailAuthProvider) {
            await this.emailSignInStep1();
        } else {
            signInWithRedirect(this.auth, provider);
        }
    }
    private async emailSignInStep1() {
        sendSignInLinkToEmail(
            this.auth,
            this.emailAddress,
            this.emailActionCodeSettings,
        )
            .then(() => {
                // The link was successfully sent. Inform the user.
                // Save the email locally so we don't need to ask the user for it again
                // if they open the link on the same device.
                this._window.localStorage.setItem(
                    this.localStorageEmailAddressKey,
                    this.emailAddress,
                );
            })
            .catch((error) => {
                console.error("error when signing in by email", error);
            });
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
}
