import { TEmailFSMStateID } from "./state-machine-email.ts";
import {
    EmailSVGStateBoxCSSClass,
    TEmailArrowKey,
    TEmailStateBoxKey,
    TEmailTransition,
} from "./svg-flowchart-auto-types-email.ts";
import { SVGFlowChartServiceEmail } from "./svg-flowchart-service-email.ts";
import {
    SVGCSSClassCategory,
    SVGStateStatus,
} from "./svg-flowchart-service.ts";

export class StateToSVGMapperServiceEmail {
    private svgService: SVGFlowChartServiceEmail;
    private queue: TEmailStateBoxKey[] = [];

    constructor(props: {
        svgService: SVGFlowChartServiceEmail;
        currentStateBoxCSSClassKey: TEmailFSMStateID | null;
    }) {
        this.svgService = props.svgService;
        if (props.currentStateBoxCSSClassKey != null) {
            this.enqueue(props.currentStateBoxCSSClassKey);
        }
        this.svgService.setupOnReady({ callback: this.onSVGReady.bind(this) });
    }

    private onSVGReady() {
        this.updateSvg();
    }

    private getPreviousState(): TEmailStateBoxKey | null {
        if (this.queue.length < 2) return null;
        return this.queue[this.queue.length - 2];
    }

    private getCurrentState(): TEmailStateBoxKey | null {
        if (this.queue.length < 1) return null;
        return this.queue[this.queue.length - 1];
    }

    private chopQueueToLength2(): void {
        if (this.queue.length <= 2) return;
        this.queue = [this.getPreviousState()!, this.getCurrentState()!];
    }

    public enqueue(newStateClassKey: TEmailFSMStateID): void {
        this.queue.push(this.stateBoxMappings[newStateClassKey]);
        this.chopQueueToLength2();
        this.updateSvg();
    }

    public updateSvg(): void {
        if (!this.svgService.isSVGReady) return;

        const newStateBoxCSSClassKey = this.getCurrentState();
        if (newStateBoxCSSClassKey == null) return;

        const oldStateBoxCSSClassKey = this.getPreviousState();
        if (oldStateBoxCSSClassKey != null) {
            this.svgService.Unset<typeof SVGCSSClassCategory.StateBox>(
                oldStateBoxCSSClassKey,
            );
        }

        this.svgService.SetElementStatus<typeof SVGCSSClassCategory.StateBox>(
            newStateBoxCSSClassKey,
            SVGStateStatus.Success,
        );

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
                "AuthorisingViaFirebase0",
            ):
                return "UserSubmittedEmailAddressAgain0";

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
                return "ClearUserData0";

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
