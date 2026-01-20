import type { TFacebookFSMStateID } from "./state-machine-facebook.ts";
import type {
    TFacebookArrowKey,
    TFacebookStateBoxKey,
    TFacebookTransition,
} from "./svg-facebook-flowchart-auto-types.ts";
import { FacebookSVGStateBoxCSSClass } from "./svg-facebook-flowchart-auto-types.ts";
import { SVGFacebookFlowChartService } from "./svg-facebook-flowchart-service.ts";
import {
    SVGCSSClassCategory,
    SVGStateStatus,
} from "./svg-flowchart-service.ts";

export class StateToFacebookSVGMapperService {
    private svgService: SVGFacebookFlowChartService;
    private currentStateBoxCSSClassKey:
        | keyof typeof FacebookSVGStateBoxCSSClass
        | null = null;

    constructor(props: {
        svgService: SVGFacebookFlowChartService;
        currentStateBoxCSSClassKey:
            | keyof typeof FacebookSVGStateBoxCSSClass
            | null;
    }) {
        this.svgService = props.svgService;
        this.currentStateBoxCSSClassKey = props.currentStateBoxCSSClassKey;
    }

    public updateSvg(newStateClassKey: TFacebookFSMStateID): void {
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
        oldBox: TFacebookStateBoxKey | null,
        newBox: TFacebookStateBoxKey,
    ): TFacebookArrowKey | null {
        switch (`${oldBox}->${newBox}`) {
            case this.generateTransition("Idle0", "UserIsInputtingDetails0"):
                return "UserBeganTyping0";

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
    };
}
