import { EmailEvents } from "./state-machine-email";
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

    public updateSvg(newStateClassKey: keyof typeof EmailEvents): void {
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
            case this.generateTransition("Idle0", "UserIsEnteringDetails0"):
                return "UserBeganTyping0";
            default:
                return null;
        }
    }

    private generateTransition(
        oldBox: TEmailStateBoxKey,
        newBox: TEmailStateBoxKey,
    ): TEmailTransition {
        return `${oldBox}->${newBox}`;
    }

    private stateBoxMappings: Record<
        keyof typeof EmailEvents,
        keyof typeof EmailSVGStateBoxCSSClass
    > = {
        IdleNoText: "Idle0",
        UserInputtingText: "UserIsEnteringDetails0",
        UserClickedLogin: "EmailSentToFirebase0",
    };
}
