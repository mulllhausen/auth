import {
    FacebookSVGArrowCSSClass,
    FacebookSVGStateBoxCSSClass,
} from "./svg-flowchart-auto-types-facebook";
import type { TSVGStateStatusValues } from "./svg-flowchart-service";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
    SVGStateStatus,
} from "./svg-flowchart-service";

// convention: if a var has `css` in the name then it is a css class at runtime.
// eg. "state-box"

// #region consts

const FacebookSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: FacebookSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: FacebookSVGStateBoxCSSClass,
} as const;

// #endregion consts

// #region types

type TFacebookSVGCSSClassCategory = keyof typeof FacebookSVGHierarchy;

export type TFacebookSVGClassesByCategory = {
    [TCat in TFacebookSVGCSSClassCategory]: (typeof FacebookSVGHierarchy)[TCat];
};

type TFacebookSVGClassKey<TCat extends TFacebookSVGCSSClassCategory> =
    keyof TFacebookSVGClassesByCategory[TCat];

type TFacebookSVGClassValue<TCat extends TFacebookSVGCSSClassCategory> =
    TFacebookSVGClassesByCategory[TCat][TFacebookSVGClassKey<TCat>];

// #endregion types

export class SVGFacebookFlowChartService extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(
        status: TSVGStateStatusValues = SVGStateStatus.Success,
    ): void {
        this.SetAllElementsInCategory(FacebookSVGStateBoxCSSClass, status);
        this.SetAllElementsInCategory(FacebookSVGArrowCSSClass, status);
    }

    public SetElementStatus<TCat extends TFacebookSVGCSSClassCategory>(
        classKey: TFacebookSVGClassKey<TCat>,
        status: TSVGStateStatusValues,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            status,
        );
    }

    public Unset<TCat extends TFacebookSVGCSSClassCategory>(
        classKey: TFacebookSVGClassKey<TCat>,
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

    private SetAllElementsInCategory<TCat extends TFacebookSVGCSSClassCategory>(
        categoryObj: TFacebookSVGClassesByCategory[TCat],
        status: TSVGStateStatusValues,
    ): void {
        for (const key in categoryObj) {
            this.SetElementStatus<TCat>(key, status);
        }
    }

    private getElementData<TCat extends TFacebookSVGCSSClassCategory>(
        svgClassKey: TFacebookSVGClassKey<TCat>,
    ): {
        cssCategory: TCat;
        cssClass: TFacebookSVGClassValue<TCat>;
    } {
        for (const category of Object.keys(FacebookSVGHierarchy) as TCat[]) {
            const FacebookSVGCSSClassObj = FacebookSVGHierarchy[category];

            if (svgClassKey in FacebookSVGCSSClassObj) {
                return {
                    cssCategory: category,
                    cssClass: FacebookSVGCSSClassObj[svgClassKey],
                };
            }
        }
        throw new Error(`css key not found: ${String(svgClassKey)}`);
    }
}
