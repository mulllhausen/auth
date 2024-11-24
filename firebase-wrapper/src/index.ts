import { User } from "firebase/auth";
import {
    AuthProviders,
    FirebaseAuthService,
    WrapperSettings,
    defaultAction,
} from "./firebase-wrapper";
import { env } from "./.env";

const wrapperSettings: WrapperSettings = {
    loginButtonCssClass: "button.login",
    signedInCallback: signedInCallback,
    signedOutCallback: signedOutCallback,
    authProviderSettings: {
        [AuthProviders.Google]: {
            loginButtonClicked: defaultAction,
        },
        [AuthProviders.Facebook]: {
            loginButtonClicked: defaultAction,
        },
        [AuthProviders.Email]: {
            loginButtonClicked: async (
                _this: FirebaseAuthService,
                e: MouseEvent,
            ) => {
                const email: string = (
                    _this._document.querySelector(
                        "input.email",
                    ) as HTMLInputElement
                )?.value;
                if (email === undefined) {
                    console.error("Email is undefined");
                }
                const password: string = (
                    _this._document.querySelector(
                        "input.password",
                    ) as HTMLInputElement
                )?.value;

                if (password === undefined) {
                    console.error("Password is undefined");
                }

                _this.SetupForEmailSign(email, password);
                await _this.Signin(AuthProviders.Email);
            },
        },
    },
};

const firebaseAuthService = new FirebaseAuthService(
    window,
    env,
    wrapperSettings,
);

function signedInCallback(user: User) {
    console.log("Signed in");
}
function signedOutCallback() {
    console.log("Signed out");
}
function buttonClickCallback() {
    console.log("Signed in");
}
