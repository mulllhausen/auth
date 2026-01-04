import { TEmailFSMStateID } from "./state-machine-email";
import {
    EmailSVGStateBoxCSSClass,
    TEmailArrowKey,
    TEmailStateBoxKey,
    TEmailTransition,
} from "./svg-email-flowchart-auto-types.ts";
import { SVGEmailFlowChartService } from "./svg-email-flowchart-service";
import { SVGCSSClassCategory, SVGStateStatus } from "./svg-flowchart-service";

type TStateBox = keyof typeof EmailSVGStateBoxCSSClass;

export class StateToSVGMapperService {
    private svgService: SVGEmailFlowChartService;
    private currentStateBoxCSSClassKey:
        | keyof typeof EmailSVGStateBoxCSSClass
        //    | keyof TEmailSVGClassesByCategory[typeof SVGCSSClassCategory.StateBox]
        | null = null;

    constructor(props: {
        svgService: SVGEmailFlowChartService;
        currentStateBoxCSSClassKey:
            | keyof typeof EmailSVGStateBoxCSSClass
            //| keyof TEmailSVGClassesByCategory[typeof SVGCSSClassCategory.StateBox]
            | null;
    }) {
        this.svgService = props.svgService;
        this.currentStateBoxCSSClassKey = props.currentStateBoxCSSClassKey;
    }

    public updateSvg(newStateClassKey: TEmailFSMStateID): void {
        const oldStateBoxCSSClassKey = this.currentStateBoxCSSClassKey;
        if (oldStateBoxCSSClassKey != null) {
            this.svgService.Unset<typeof SVGCSSClassCategory.StateBox>(
                oldStateBoxCSSClassKey,
            );
        }

        const newStateBoxCSSClassKey = this.stateBoxMappings[newStateClassKey];
        this.svgService.SetElementStatus<typeof SVGCSSClassCategory.StateBox>(
            newStateBoxCSSClassKey,
            SVGStateStatus.Success,
        );
        this.currentStateBoxCSSClassKey = newStateBoxCSSClassKey;

        this.svgService.UnsetCategory(
            SVGCSSClassCategory.Arrow,
            SVGStateStatus.Success,
        );

        const arrowCSSClassKey = this.getArrowClass(
            oldStateBoxCSSClassKey,
            newStateBoxCSSClassKey,
        );

        if (arrowCSSClassKey == null) return;

        this.svgService.SetElementStatus<typeof SVGCSSClassCategory.Arrow>(
            arrowCSSClassKey,
            SVGStateStatus.Success,
        );
    }

    private getArrowClass(
        oldBox: TEmailStateBoxKey | null,
        newBox: TEmailStateBoxKey,
    ): TEmailArrowKey | null {
        switch (`${oldBox}->${newBox}`) {
            case this.generateTransition("Idle0", "UserIsInputtingDetails0"):
                return "UserBeganTyping0";

            case this.generateTransition("UserIsInputtingDetails0", "Idle0"):
                return "UserDeletedAllInputText0";

            case this.generateTransition(
                "UserIsInputtingDetails0",
                "SendingEmailAddressToFirebase0",
            ):
                return "UserClickedLoginButton0";

            case this.generateTransition(
                "SendingEmailAddressToFirebase0",
                "WaitingForUserToClickLinkInEmail0",
            ):
                return "OkResponse1";

            case this.generateTransition(
                "SendingEmailAddressToFirebase0",
                "BadEmailAddress0",
            ):
                return "FirebaseReturnedAnError0";

            case this.generateTransition(
                "BadEmailAddress0",
                "UserIsInputtingDetails0",
            ):
                return "UserIsTypingAgain0";

            case this.generateTransition(
                "Idle0",
                "SignInLinkOpenedOnSameBrowser0",
            ):
            case this.generateTransition(
                "WaitingForUserToClickLinkInEmail0",
                "SignInLinkOpenedOnSameBrowser0",
            ):
                return "UserClickedLinkInEmail0";

            case this.generateTransition(
                "Idle0",
                "SignInLinkOpenedOnDifferentBrowser0",
            ):
            case this.generateTransition(
                "WaitingForUserToClickLinkInEmail0",
                "SignInLinkOpenedOnDifferentBrowser0",
            ):
                return "UserClickedLinkInEmail1";

            case this.generateTransition(
                "SignInLinkOpenedOnSameBrowser0",
                "AuthorisingViaFirebase0",
            ):
                return "AutomaticallySubmitToFirebase0";

            case this.generateTransition(
                "SignInLinkOpenedOnDifferentBrowser0",
                "WaitingForEmailAddressInGui0",
            ):
                return "RequestEmailAddressFromUserAgain0";

            case this.generateTransition(
                "WaitingForEmailAddressInGui0",
                "SendingEmailAddressToFirebase0",
            ):
                return "DifferentEmailAddress0";

            case this.generateTransition(
                "WaitingForEmailAddressInGui0",
                "AuthorisingViaFirebase0",
            ):
                return "SameEmailAddress0";

            case this.generateTransition(
                "AuthorisingViaFirebase0",
                "SignedIn0",
            ):
                return "OkResponse0";

            case this.generateTransition(
                "AuthorisingViaFirebase0",
                "AuthFailed0",
            ):
                return "Fail0";

            case this.generateTransition("AuthFailed0", "Idle0"):
                return "Restart0";

            case this.generateTransition("SignedIn0", "Idle0"):
                return "UserClickedLogoutButton0";

            default:
                return null;
        }
    }

    /** note: this function exists purely for type safety */
    private generateTransition(
        oldBox: TEmailStateBoxKey,
        newBox: TEmailStateBoxKey,
    ): TEmailTransition {
        return `${oldBox}->${newBox}`;
    }

    private stateBoxMappings: Record<
        TEmailFSMStateID,
        keyof typeof EmailSVGStateBoxCSSClass
    > = {
        Idle: "Idle0",
        UserInputtingText: "UserIsInputtingDetails0",
        SendingEmailAddressToFirebase: "SendingEmailAddressToFirebase0",
        WaitingForUserToClickLinkInEmail: "WaitingForUserToClickLinkInEmail0",
        BadEmailAddress: "BadEmailAddress0",
        SignInLinkOpenedOnSameBrowser: "SignInLinkOpenedOnSameBrowser0",
        SignInLinkOpenedOnDifferentBrowser:
            "SignInLinkOpenedOnDifferentBrowser0",
        WaitingForReEnteredEmail: "WaitingForEmailAddressInGui0",
        AuthorisingViaFirebase: "AuthorisingViaFirebase0",
        SignedIn: "SignedIn0",
        AuthFailed: "AuthFailed0",
    };
}
