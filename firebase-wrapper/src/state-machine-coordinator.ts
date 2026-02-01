import { FirebaseAuthService } from "./firebase-wrapper.ts";
import { EmailSignInFSMContext } from "./state-machine-email.ts";
import { FacebookSignInFSMContext } from "./state-machine-facebook.ts";

/** this class should know nothing about SVGs, loggers and the GUI */
export class FSMCoordinator {
    private firebaseAuthService: FirebaseAuthService;
    private facebookSignInFSMContext: FacebookSignInFSMContext;
    private emailSignInFSMContext: EmailSignInFSMContext;

    constructor(props: {
        firebaseAuthService: FirebaseAuthService;
        emailSignInFSMContext: EmailSignInFSMContext;
        facebookSignInFSMContext: FacebookSignInFSMContext;
    }) {
        this.firebaseAuthService = props.firebaseAuthService;
        this.emailSignInFSMContext = props.emailSignInFSMContext;
        this.facebookSignInFSMContext = props.facebookSignInFSMContext;
    }

    public async setup() {
        await this.facebookSignInFSMContext.setup();
        await this.emailSignInFSMContext.setup();

        // note: must run once only after all other setup methods
        await this.firebaseAuthService.setupFirebaseListeners();
    }

    public async loginEmail() {
        await this.emailSignInFSMContext.handle({ isEmailLoginClicked: true }); // todo: can this be combined into the above command?
    }

    public async loginFacebook() {
        await this.facebookSignInFSMContext.handle({
            isFacebookLoginClicked: true,
        });
    }

    public async logout() {
        await this.firebaseAuthService.logout();
    }

    public async clearCachedUser() {
        await this.firebaseAuthService.logout();
        this.facebookSignInFSMContext.deleteStateFromLocalstorage();
        this.emailSignInFSMContext.deleteStateFromLocalstorage();
        await this.facebookSignInFSMContext.handle({});
        await this.emailSignInFSMContext.handle({});
    }
}
