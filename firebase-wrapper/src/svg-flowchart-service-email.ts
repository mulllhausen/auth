import {
    EmailSVGArrowCSSClass,
    EmailSVGStateBoxCSSClass,
} from "./svg-flowchart-auto-types-email";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
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

export class SVGFlowChartServiceEmail extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(): void {
        this.SetAllElementsInCategory(EmailSVGStateBoxCSSClass);
        this.SetAllElementsInCategory(EmailSVGArrowCSSClass);
    }

    public SetElement<TCat extends TEmailSVGCSSClassCategory>(
        classKey: TEmailSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    public Unset<TCat extends TEmailSVGCSSClassCategory>(
        classKey: TEmailSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.RemoveCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    private SetAllElementsInCategory<TCat extends TEmailSVGCSSClassCategory>(
        categoryObj: TEmailSVGClassesByCategory[TCat],
    ): void {
        for (const key in categoryObj) {
            this.SetElement<TCat>(key);
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
