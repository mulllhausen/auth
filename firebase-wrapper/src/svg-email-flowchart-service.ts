import type {
    TEmailSVGCSSClass,
    TEmailSVGCSSClassKeys,
} from "./svg-email-flowchart-auto-types";
import {
    EmailSVGArrowCSSClass,
    EmailSVGStateBoxCSSClass,
} from "./svg-email-flowchart-auto-types";
import type {
    TSVGCSSClassCategoryValues,
    TSVGStateStatusValues,
} from "./svg-flowchart-service";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
    SVGStateStatus,
} from "./svg-flowchart-service";

type TEmailSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: typeof EmailSVGArrowCSSClass;
    [SVGCSSClassCategory.StateBox]: typeof EmailSVGStateBoxCSSClass;
};

const EmailSVGHierarchy: TEmailSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: EmailSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: EmailSVGStateBoxCSSClass,
} as const;

export class SVGEmailFlowChartService extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(
        status: TSVGStateStatusValues = SVGStateStatus.Success,
    ): void {
        this.SetAllElementsInCategory(EmailSVGStateBoxCSSClass, status);
        this.SetAllElementsInCategory(EmailSVGArrowCSSClass, status);
    }

    public SetElementStatus(
        singleSVGElement: TEmailSVGCSSClassKeys,
        status: TSVGStateStatusValues,
    ): void {
        const categoryValue = this.getCategory(singleSVGElement); // "state-box"
        const obj = EmailSVGHierarchy[categoryValue] as Record<
            typeof singleSVGElement,
            string
        >;
        const cssClass = obj[singleSVGElement];
        this.AddCSSClassBySelector(`.${categoryValue}.${cssClass}`, status);
    }

    private SetAllElementsInCategory(
        emailSVGCSSClassObj: TEmailSVGCSSClass,
        status: TSVGStateStatusValues,
    ) {
        for (const objKey in emailSVGCSSClassObj) {
            this.SetElementStatus(objKey as TEmailSVGCSSClassKeys, status);
        }
    }

    private getCategory<K extends TEmailSVGCSSClassKeys>(
        elementCSSClassKey: K,
    ): TSVGCSSClassCategoryValues {
        for (const category of Object.keys(
            EmailSVGHierarchy,
        ) as TSVGCSSClassCategoryValues[]) {
            const cssClassObject = EmailSVGHierarchy[category];
            if (elementCSSClassKey in cssClassObject) {
                return category;
            }
        }
        throw new Error(
            `Could not find category for css class key "${elementCSSClassKey}"`,
        );
    }
}
