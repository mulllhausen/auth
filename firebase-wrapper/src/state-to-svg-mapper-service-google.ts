import { TGoogleFSMStateID } from "./state-machine-google.ts";
import {
    GoogleSVGStateBoxCSSClass,
    TGoogleArrowKey,
    TGoogleStateBoxKey,
    TGoogleTransition,
} from "./svg-flowchart-auto-types-google.ts";
import { SVGFlowChartServiceGoogle } from "./svg-flowchart-service-google.ts";
import { SVGCSSClassCategory } from "./svg-flowchart-service.ts";

export class StateToSVGMapperServiceGoogle {
    private svgService: SVGFlowChartServiceGoogle;
    private queue: TGoogleStateBoxKey[] = [];

    constructor(props: {
        svgService: SVGFlowChartServiceGoogle;
        currentStateBoxCSSClassKey: TGoogleFSMStateID | null;
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

    private getPreviousState(): TGoogleStateBoxKey | null {
        if (this.queue.length < 2) return null;
        return this.queue[this.queue.length - 2];
    }

    private getCurrentState(): TGoogleStateBoxKey | null {
        if (this.queue.length < 1) return null;
        return this.queue[this.queue.length - 1];
    }

    private chopQueueToLength2(): void {
        if (this.queue.length <= 2) return;
        this.queue = [this.getPreviousState()!, this.getCurrentState()!];
    }

    public enqueue(newStateClassKey: TGoogleFSMStateID): void {
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

        this.svgService.SetElement<typeof SVGCSSClassCategory.StateBox>(
            newStateBoxCSSClassKey,
        );

        this.svgService.UnsetCategory(SVGCSSClassCategory.Arrow);

        const arrowCSSClassKey = this.getArrowClass(
            oldStateBoxCSSClassKey,
            newStateBoxCSSClassKey,
        );

        if (arrowCSSClassKey == null) return;

        this.svgService.SetElement<typeof SVGCSSClassCategory.Arrow>(
            arrowCSSClassKey,
        );
    }

    private getArrowClass(
        oldBox: TGoogleStateBoxKey | null,
        newBox: TGoogleStateBoxKey,
    ): TGoogleArrowKey | null {
        switch (`${oldBox}->${newBox}`) {
            case this.generateTransition("Idle0", "RedirectingToGoogle0"):
                return "UserClickedLoginButton0";

            case this.generateTransition(
                "RedirectingToGoogle0",
                "GoogleResponded0",
            ):
                return "OkResponse1";

            case this.generateTransition(
                "RedirectingToGoogle0",
                "GoogleIsUnavailable0",
            ):
                return "FirebaseReturnedAnError0";

            case this.generateTransition("GoogleIsUnavailable0", "Idle0"):
                return "Reset0";

            case this.generateTransition("GoogleResponded0", "SignedIn0"):
                return "OkResponse0";

            case this.generateTransition("GoogleResponded0", "AuthFailed0"):
                return "Fail0";

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
        oldBox: TGoogleStateBoxKey,
        newBox: TGoogleStateBoxKey,
    ): TGoogleTransition {
        return `${oldBox}->${newBox}`;
    }

    private stateBoxMappings: Record<
        TGoogleFSMStateID,
        keyof typeof GoogleSVGStateBoxCSSClass
    > = {
        Idle: "Idle0",
        RedirectingToGoogle: "RedirectingToGoogle0",
        GoogleResponded: "GoogleResponded0",
        GoogleIsUnavailable: "GoogleIsUnavailable0",
        GoogleAuthFailed: "AuthFailed0",
        SignedIn: "SignedIn0",
    };
}
