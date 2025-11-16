import {
    EmailSVGArrowCSSClass,
    EmailSVGStateBoxCSSClass,
} from "./svg-email-flowchart-auto-types";
import type { TSVGStateStatusValues } from "./svg-flowchart-service";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
    SVGStateStatus,
} from "./svg-flowchart-service";

// convention: if a var has `css` in the name then it is a css class at runtime.
// eg. "state-box"

type TEmailSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: typeof EmailSVGArrowCSSClass;
    [SVGCSSClassCategory.StateBox]: typeof EmailSVGStateBoxCSSClass;
};

const EmailSVGHierarchy: TEmailSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: EmailSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: EmailSVGStateBoxCSSClass,
} as const;

type TEmailSVGCSSClassCategory = keyof typeof EmailSVGHierarchy;

type EmailSVGClassesByCategory = {
    [TCat in TEmailSVGCSSClassCategory]: (typeof EmailSVGHierarchy)[TCat];
};

type EmailSVGClassKey<TCat extends TEmailSVGCSSClassCategory> =
    keyof EmailSVGClassesByCategory[TCat];

type EmailSVGClassValue<TCat extends TEmailSVGCSSClassCategory> =
    EmailSVGClassesByCategory[TCat][EmailSVGClassKey<TCat>];

export class SVGEmailFlowChartService extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(
        status: TSVGStateStatusValues = SVGStateStatus.Success,
    ): void {
        this.SetAllElementsInCategory(EmailSVGStateBoxCSSClass, status);
        this.SetAllElementsInCategory(EmailSVGArrowCSSClass, status);
    }

    public SetElementStatus<TCat extends TEmailSVGCSSClassCategory>(
        classKey: EmailSVGClassKey<TCat>,
        status: TSVGStateStatusValues,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            status,
        );
    }

    private SetAllElementsInCategory<TCat extends TEmailSVGCSSClassCategory>(
        categoryObj: EmailSVGClassesByCategory[TCat],
        status: TSVGStateStatusValues,
    ): void {
        for (const key in categoryObj) {
            this.SetElementStatus<TCat>(key, status);
        }
    }

    private getElementData<TCat extends TEmailSVGCSSClassCategory>(
        svgClassKey: EmailSVGClassKey<TCat>,
    ): {
        cssCategory: TCat;
        cssClass: EmailSVGClassValue<TCat>;
    } {
        for (const category of Object.keys(EmailSVGHierarchy) as TCat[]) {
            const emailSVGCSSClassObj = EmailSVGHierarchy[category];

            if (svgClassKey in emailSVGCSSClassObj) {
                return {
                    cssCategory: category,
                    cssClass: emailSVGCSSClassObj[svgClassKey],
                };
            }
        }
        throw new Error(`css key not found: ${String(svgClassKey)}`);
    }
}
