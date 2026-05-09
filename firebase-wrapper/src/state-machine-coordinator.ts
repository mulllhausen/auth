import { FirebaseAuthService } from "./firebase-wrapper.ts";
import { EmailSignInFSMContext, TEmailFSMStateID } from "./state-machine-email.ts";
import { FacebookSignInFSMContext, TFacebookFSMStateID } from "./state-machine-facebook.ts";
import { GithubSignInFSMContext, TGithubFSMStateID } from "./state-machine-github.ts";
import { GoogleSignInFSMContext, TGoogleFSMStateID } from "./state-machine-google.ts";

// todo: put all these callbacks into a single type
//   callbackSetProviderFocus: (authProvider: TAuthProvider) => void;
//   callbackEnableLoginButtonEmail: (enabled: boolean) => void;
//   callbackEnableLoginButtonFacebook: (enabled: boolean) => void;
//   callbackEnableLoginButtonGithub: (enabled: boolean) => void;
//   callbackEnableLoginButtonGoogle: (enabled: boolean) => void;
//   callbackPopulateEmailInput: (value: string | null) => void;
//   callbackEnableEmailInput: (enabled: boolean) => void;
//   callbackEnablePasswordInput: (enabled: boolean) => void;
//   callbackShowInstructionsToClickLinkInEmail: () => void;
//   callbackShowInstructionsToReEnterEmail: () => void;

/** this class should know nothing about SVGs, loggers and the GUI */
export class FSMCoordinator {
    private firebaseAuthService: FirebaseAuthService;
    private facebookSignInFSMContext: FacebookSignInFSMContext;
    private githubSignInFSMContext: GithubSignInFSMContext;
    private googleSignInFSMContext: GoogleSignInFSMContext;
    private emailSignInFSMContext: EmailSignInFSMContext;
    private isSetup: boolean = false;

    constructor(props: {
        firebaseAuthService: FirebaseAuthService;
        emailSignInFSMContext: EmailSignInFSMContext;
        facebookSignInFSMContext: FacebookSignInFSMContext;
        githubSignInFSMContext: GithubSignInFSMContext;
        googleSignInFSMContext: GoogleSignInFSMContext;
    }) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.emailSignInFSMContext = props.emailSignInFSMContext;
        this.facebookSignInFSMContext = props.facebookSignInFSMContext;
        this.githubSignInFSMContext = props.githubSignInFSMContext;
        this.googleSignInFSMContext = props.googleSignInFSMContext;
    }

    public async setup(): Promise<void> {
        if (this.isSetup) return;
        this.isSetup = true;

        await this.facebookSignInFSMContext.setup();
        await this.githubSignInFSMContext.setup();
        await this.googleSignInFSMContext.setup();
        await this.emailSignInFSMContext.setup();
        await this.checkIfRedirectResult();

        // only needed for logout
        await this.firebaseAuthService.setupFirebaseListeners();
    }

    public get currentStateIDs(): {
        facebookStateID: TFacebookFSMStateID | null;
        githubStateID: TGithubFSMStateID | null;
        googleStateID: TGoogleFSMStateID | null;
        emailStateID: TEmailFSMStateID | null;
    } {
        return { 
            facebookStateID: this.facebookSignInFSMContext.stateID ?? null,
            githubStateID: this.githubSignInFSMContext.stateID ?? null,
            googleStateID: this.googleSignInFSMContext.stateID ?? null,
            emailStateID: this.emailSignInFSMContext.stateID ?? null,
        };
    }

    public async loginEmail(): Promise<void> {
        await this.emailSignInFSMContext.handle({ isEmailLoginClicked: true });
    }

    public async loginFacebook(): Promise<void> {
        await this.facebookSignInFSMContext.handle({
            isFacebookLoginClicked: true,
        });
    }

    public async loginGithub(): Promise<void> {
        await this.githubSignInFSMContext.handle({
            isGithubLoginClicked: true,
        });
    }

    public async loginGoogle(): Promise<void> {
        await this.googleSignInFSMContext.handle({
            isGoogleLoginClicked: true,
        });
    }

    public async logout(): Promise<void> {
        await this.emailSignInFSMContext.handle({
            isLogoutClicked: true,
        });
        await this.facebookSignInFSMContext.handle({
            isLogoutClicked: true,
        });
        await this.githubSignInFSMContext.handle({
            isLogoutClicked: true,
        });
        await this.googleSignInFSMContext.handle({
            isLogoutClicked: true,
        });
        await this.firebaseAuthService.logout();
    }

    public async clearCachedUser(): Promise<void> {
        await this.firebaseAuthService.logout();
        this.emailSignInFSMContext.deleteStateFromLocalstorage();
        this.facebookSignInFSMContext.deleteStateFromLocalstorage();
        this.githubSignInFSMContext.deleteStateFromLocalstorage();
        this.googleSignInFSMContext.deleteStateFromLocalstorage();
        await this.emailSignInFSMContext.handle({});
        await this.facebookSignInFSMContext.handle({});
        await this.githubSignInFSMContext.handle({});
        await this.googleSignInFSMContext.handle({});
    }

    private async checkIfRedirectResult(): Promise<void> {
        await this.facebookSignInFSMContext.handle({
            checkingRedirectResult: true,
        });
        await this.githubSignInFSMContext.handle({
            checkingRedirectResult: true,
        });
        await this.googleSignInFSMContext.handle({
            checkingRedirectResult: true,
        });
        await this.firebaseAuthService.checkIfRedirectResult();
    }
}
