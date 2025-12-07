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

// #region consts

const EmailSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: EmailSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: EmailSVGStateBoxCSSClass,
} as const;

// #endregion consts

// #region types

type TEmailSVGCSSClassCategory = keyof typeof EmailSVGHierarchy;

export type TEmailSVGClassesByCategory = {
    [TCat in TEmailSVGCSSClassCategory]: (typeof EmailSVGHierarchy)[TCat];
};

type TEmailSVGClassKey<TCat extends TEmailSVGCSSClassCategory> =
    keyof TEmailSVGClassesByCategory[TCat];

type TEmailSVGClassValue<TCat extends TEmailSVGCSSClassCategory> =
    TEmailSVGClassesByCategory[TCat][TEmailSVGClassKey<TCat>];

// #endregion types

export class SVGEmailFlowChartService extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(
        status: TSVGStateStatusValues = SVGStateStatus.Success,
    ): void {
        this.SetAllElementsInCategory(EmailSVGStateBoxCSSClass, status);
        this.SetAllElementsInCategory(EmailSVGArrowCSSClass, status);
    }

    public SetElementStatus<TCat extends TEmailSVGCSSClassCategory>(
        classKey: TEmailSVGClassKey<TCat>,
        status: TSVGStateStatusValues,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            status,
        );
    }

    public Unset<TCat extends TEmailSVGCSSClassCategory>(
        classKey: TEmailSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.RemoveCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "success",
        );
        this.RemoveCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "failure",
        );
    }

    private SetAllElementsInCategory<TCat extends TEmailSVGCSSClassCategory>(
        categoryObj: TEmailSVGClassesByCategory[TCat],
        status: TSVGStateStatusValues,
    ): void {
        for (const key in categoryObj) {
            this.SetElementStatus<TCat>(key, status);
        }
    }

    private getElementData<TCat extends TEmailSVGCSSClassCategory>(
        svgClassKey: TEmailSVGClassKey<TCat>,
    ): {
        cssCategory: TCat;
        cssClass: TEmailSVGClassValue<TCat>;
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
