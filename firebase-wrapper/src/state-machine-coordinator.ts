import { FirebaseAuthService } from "./firebase-wrapper.ts";
import { EmailSignInFSMContext } from "./state-machine-email.ts";
import { FacebookSignInFSMContext } from "./state-machine-facebook.ts";
import { GithubSignInFSMContext } from "./state-machine-github.ts";
import { GoogleSignInFSMContext } from "./state-machine-google.ts";

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
        await this.firebaseAuthService.setupFirebaseListeners();
    }

    public async loginEmail(): Promise<void> {
        // todo: can this be combined into the above command?
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
        await this.firebaseAuthService.logout();
    }

    public async clearCachedUser(): Promise<void> {
        await this.firebaseAuthService.logout();
        this.facebookSignInFSMContext.deleteStateFromLocalstorage();
        this.emailSignInFSMContext.deleteStateFromLocalstorage();
        this.githubSignInFSMContext.deleteStateFromLocalstorage();
        this.googleSignInFSMContext.deleteStateFromLocalstorage();
        await this.facebookSignInFSMContext.handle({});
        await this.emailSignInFSMContext.handle({});
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
