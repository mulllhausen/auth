import type {
    TEmailSVGCSSClass,
    TEmailSVGCSSClassValues,
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

const EmailSVGHierarchy: {
    [K in TSVGCSSClassCategoryValues]: TEmailSVGCSSClass;
} = {
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
        singleSVGElement: TEmailSVGCSSClassValues,
        status: TSVGStateStatusValues,
    ): void {
        this.AddCSSClassBySelector(
            `.${this.getCategory(singleSVGElement)}.${singleSVGElement}`,
            status,
        );
    }

    private SetAllElementsInCategory(
        emailSVGCSSClassObj: TEmailSVGCSSClass,
        status: TSVGStateStatusValues,
    ) {
        for (const objKey in emailSVGCSSClassObj) {
            this.SetElementStatus(objKey as TEmailSVGCSSClassValues, status);
        }
    }

    private getCategory(
        elementCSSClassKey: TEmailSVGCSSClassValues,
    ): TSVGCSSClassCategoryValues {
        for (const category of Object.keys(
            EmailSVGHierarchy,
        ) as TSVGCSSClassCategoryValues[]) {
            const cssClassObject: TEmailSVGCSSClass =
                EmailSVGHierarchy[category];

            if (elementCSSClassKey in cssClassObject) {
                //if (Object.keys(cssClassObject).includes(elementCSSClassKey)) {
                return category;
            }
        }
        throw new Error(
            `could not find a category for CSS class "${elementCSSClassKey}"`,
        );
    }
}
