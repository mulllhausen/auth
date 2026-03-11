import {
    FacebookSVGArrowCSSClass,
    FacebookSVGStateBoxCSSClass,
} from "./svg-flowchart-auto-types-facebook";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
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

export class SVGFlowChartServiceFacebook extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(): void {
        this.SetAllElementsInCategory(FacebookSVGStateBoxCSSClass);
        this.SetAllElementsInCategory(FacebookSVGArrowCSSClass);
    }

    public SetElement<TCat extends TFacebookSVGCSSClassCategory>(
        classKey: TFacebookSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    public Unset<TCat extends TFacebookSVGCSSClassCategory>(
        classKey: TFacebookSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.RemoveCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    private SetAllElementsInCategory<TCat extends TFacebookSVGCSSClassCategory>(
        categoryObj: TFacebookSVGClassesByCategory[TCat],
    ): void {
        for (const key in categoryObj) {
            this.SetElement<TCat>(key);
        }
    }

    private getElementData<TCat extends TFacebookSVGCSSClassCategory>(
        svgClassKey: TFacebookSVGClassKey<TCat>,
    ): {
        cssCategory: TCat;
        cssClass: TFacebookSVGClassValue<TCat>;
    } {
        for (const category of Object.keys(FacebookSVGHierarchy) as TCat[]) {
            const facebookSVGCSSClassObj = FacebookSVGHierarchy[category];

            if (svgClassKey in facebookSVGCSSClassObj) {
                return {
                    cssCategory: category,
                    cssClass: facebookSVGCSSClassObj[svgClassKey],
                };
            }
        }
        throw new Error(`css key not found: ${String(svgClassKey)}`);
    }
}
