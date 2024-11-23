var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected);
            }
            step(
                (generator = generator.apply(thisArg, _arguments || [])).next(),
            );
        });
    };
import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithRedirect,
    FacebookAuthProvider,
    GoogleAuthProvider,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    onAuthStateChanged,
} from "firebase/auth";
export var AuthProviders;
(function (AuthProviders) {
    AuthProviders["Email"] = "email";
    AuthProviders["Google"] = "google";
    AuthProviders["Facebook"] = "facebook";
})(AuthProviders || (AuthProviders = {}));
export class FirebaseAuthService {
    constructor(window, env, signedInCallback, signedOutCallback) {
        this.localStorageEmailAddressKey = "firebaseEmailAddress";
        this._window = window;
        this.env = env;
        const firebaseOptions = {
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
    SetupForEmailSign(emailAddress, emailPassword) {
        this.emailAddress = emailAddress;
        this.emailPassword = emailPassword;
    }
    setupListeners(signedInCallback, signedOutCallback) {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                signedInCallback(user);
            } else {
                signedOutCallback(user);
            }
        });
    }
    Signin(provider) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (provider) {
                case AuthProviders.Email:
                    yield this.emailSignInStep1();
                    break;
                case AuthProviders.Google:
                    signInWithRedirect(this.auth, new GoogleAuthProvider());
                    break;
                case AuthProviders.Facebook:
                    signInWithRedirect(this.auth, new FacebookAuthProvider());
                    break;
                default:
                    throw new Error(
                        `unsupported provider for sign-in ${provider}`,
                    );
            }
        });
    }
    emailSignInStep1() {
        return __awaiter(this, void 0, void 0, function* () {
            sendSignInLinkToEmail(
                this.auth,
                this.emailAddress,
                this.emailActionCodeSettings,
            )
                .then(() => {
                    this._window.localStorage.setItem(
                        this.localStorageEmailAddressKey,
                        this.emailAddress,
                    );
                })
                .catch((error) => {
                    console.error("error when signing in by email", error);
                });
        });
    }
    EmailSignInStep2() {
        return __awaiter(this, void 0, void 0, function* () {
            if (
                !isSignInWithEmailLink(
                    this.auth,
                    this._window.localStorage.href,
                )
            ) {
                return;
            }
            let email = this._window.localStorage.getItem(
                this.localStorageEmailAddressKey,
            );
            if (email) {
                this.emailAddress = email.toString();
            } else {
                email = window.prompt(
                    `Please provide your email address to finalise signing-in to ${this.env.PROJECT_NAME}`,
                );
                if (email) {
                    this.emailAddress = email.toString();
                }
            }
            signInWithEmailLink(
                this.auth,
                this.emailAddress,
                this._window.location.href,
            )
                .then((result) => {
                    window.localStorage.removeItem(
                        this.localStorageEmailAddressKey,
                    );
                })
                .catch((error) => {
                    console.log(error);
                });
        });
    }
}
