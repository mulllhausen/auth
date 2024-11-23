import { ProcessEnv } from "./.env.d";
export declare enum AuthProviders {
    Email = "email",
    Google = "google",
    Facebook = "facebook"
}
export declare class FirebaseAuthService {
    private _window;
    private env;
    private auth;
    private firebase;
    private emailAddress;
    private emailPassword;
    private emailActionCodeSettings;
    localStorageEmailAddressKey: string;
    constructor(window: Window, env: ProcessEnv, signedInCallback: Function, signedOutCallback: Function);
    SetupForEmailSign(emailAddress: string, emailPassword: string): void;
    private setupListeners;
    Signin(provider: AuthProviders): Promise<void>;
    private emailSignInStep1;
    EmailSignInStep2(): Promise<void>;
}
