import { TGithubFSMStateID } from "./state-machine-github.ts";
import {
    GithubSVGStateBoxCSSClass,
    TGithubArrowKey,
    TGithubStateBoxKey,
    TGithubTransition,
} from "./svg-flowchart-auto-types-github.ts";
import { SVGFlowChartServiceGithub } from "./svg-flowchart-service-github.ts";
import { SVGCSSClassCategory } from "./svg-flowchart-service.ts";

export class StateToSVGMapperServiceGithub {
    private svgService: SVGFlowChartServiceGithub;
    private queue: TGithubStateBoxKey[] = [];

    constructor(props: {
        svgService: SVGFlowChartServiceGithub;
        currentStateBoxCSSClassKey: TGithubFSMStateID | null;
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

    private getPreviousState(): TGithubStateBoxKey | null {
        if (this.queue.length < 2) return null;
        return this.queue[this.queue.length - 2];
    }

    private getCurrentState(): TGithubStateBoxKey | null {
        if (this.queue.length < 1) return null;
        return this.queue[this.queue.length - 1];
    }

    private chopQueueToLength2(): void {
        if (this.queue.length <= 2) return;
        this.queue = [this.getPreviousState()!, this.getCurrentState()!];
    }

    public enqueue(newStateClassKey: TGithubFSMStateID): void {
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
        oldBox: TGithubStateBoxKey | null,
        newBox: TGithubStateBoxKey,
    ): TGithubArrowKey | null {
        switch (`${oldBox}->${newBox}`) {
            case this.generateTransition("Idle0", "RedirectingToGithub0"):
                return "UserClickedLoginButton0";

            case this.generateTransition(
                "RedirectingToGithub0",
                "GithubResponded0",
            ):
                return "OkResponse0";

            case this.generateTransition(
                "RedirectingToGithub0",
                "GithubIsUnavailable0",
            ):
                return "FirebaseReturnedAnError0";

            case this.generateTransition("GithubIsUnavailable0", "Idle0"):
                return "Reset0";

            case this.generateTransition("GithubResponded0", "SignedIn0"):
                return "OkResponse1";

            case this.generateTransition("GithubResponded0", "AuthFailed0"):
                return "Fail0";

            case this.generateTransition("AuthFailed0", "Idle0"):
                return "Reset1";

            default:
                return null;
        }
    }

    /** note: this function exists purely for type safety */
    private generateTransition(
        oldBox: TGithubStateBoxKey,
        newBox: TGithubStateBoxKey,
    ): TGithubTransition {
        return `${oldBox}->${newBox}`;
    }

    private stateBoxMappings: Record<
        TGithubFSMStateID,
        keyof typeof GithubSVGStateBoxCSSClass
    > = {
        Idle: "Idle0",
        RedirectingToGithub: "RedirectingToGithub0",
        GithubResponded: "GithubResponded0",
        GithubIsUnavailable: "GithubIsUnavailable0",
        GithubAuthFailed: "AuthFailed0",
        SignedIn: "SignedIn0",
    };
}
