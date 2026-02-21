import type { TFacebookFSMStateID } from "./state-machine-facebook.ts";
import type {
    TFacebookArrowKey,
    TFacebookStateBoxKey,
    TFacebookTransition,
} from "./svg-flowchart-auto-types-facebook.ts";
import { FacebookSVGStateBoxCSSClass } from "./svg-flowchart-auto-types-facebook.ts";
import { SVGFlowChartServiceFacebook } from "./svg-flowchart-service-facebook.ts";
import {
    SVGCSSClassCategory,
    SVGStateStatus,
} from "./svg-flowchart-service.ts";

export class StateToSVGMapperServiceFacebook {
    private svgService: SVGFlowChartServiceFacebook;
    private queue: TFacebookStateBoxKey[] = [];
    // private currentStateBoxCSSClassKey:
    //     | keyof typeof FacebookSVGStateBoxCSSClass
    //     | null = null;

    constructor(props: {
        svgService: SVGFlowChartServiceFacebook;
        currentStateBoxCSSClassKey: TFacebookFSMStateID | null;
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

    private getPreviousState(): TFacebookStateBoxKey | null {
        if (this.queue.length < 2) return null;
        return this.queue[this.queue.length - 2];
    }

    private getCurrentState(): TFacebookStateBoxKey | null {
        if (this.queue.length < 1) return null;
        return this.queue[this.queue.length - 1];
    }

    private chopQueueToLength2(): void {
        if (this.queue.length <= 2) return;
        this.queue = [this.getPreviousState()!, this.getCurrentState()!];
    }

    public enqueue(newStateClassKey: TFacebookFSMStateID): void {
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
        oldBox: TFacebookStateBoxKey | null,
        newBox: TFacebookStateBoxKey,
    ): TFacebookArrowKey | null {
        switch (`${oldBox}->${newBox}`) {
            case this.generateTransition("Idle0", "RedirectingToFacebook0"):
                return "UserClickedLoginButton0";

            case this.generateTransition("RedirectingToFacebook0", "SignedIn0"):
                return "OkResponse0";

            case this.generateTransition(
                "RedirectingToFacebook0",
                "AuthFailed0",
            ):
                return "Fail0";

            case this.generateTransition(
                "RedirectingToFacebook0",
                "FacebookIsUnavailable0",
            ):
                return "FirebaseReturnedAnError0";

            case this.generateTransition("FacebookIsUnavailable0", "Idle0"):
                return "Reset0";

            case this.generateTransition("AuthFailed0", "Idle0"):
                return "Reset1";

            case this.generateTransition("SignedIn0", "Idle0"):
                return "LogoutButtonClicked0";

            default:
                return null;
        }
    }

    /** note: this function exists purely for type safety */
    private generateTransition(
        oldBox: TFacebookStateBoxKey,
        newBox: TFacebookStateBoxKey,
    ): TFacebookTransition {
        return `${oldBox}->${newBox}`;
    }

    private stateBoxMappings: Record<
        TFacebookFSMStateID,
        keyof typeof FacebookSVGStateBoxCSSClass
    > = {
        Idle: "Idle0",
        RedirectingToFacebook: "RedirectingToFacebook0",
        FacebookIsUnavailable: "FacebookIsUnavailable0",
        FacebookAuthFailed: "AuthFailed0",
        SignedIn: "SignedIn0",
    };
}
