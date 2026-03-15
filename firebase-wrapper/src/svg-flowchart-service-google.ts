import {
    GoogleSVGArrowCSSClass,
    GoogleSVGStateBoxCSSClass,
} from "./svg-flowchart-auto-types-google";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
} from "./svg-flowchart-service";

// convention: if a var has `css` in the name then it is a css class at runtime.
// eg. "state-box"

// #region consts

const GoogleSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: GoogleSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: GoogleSVGStateBoxCSSClass,
} as const;

// #endregion consts

// #region types

type TGoogleSVGCSSClassCategory = keyof typeof GoogleSVGHierarchy;

export type TGoogleSVGClassesByCategory = {
    [TCat in TGoogleSVGCSSClassCategory]: (typeof GoogleSVGHierarchy)[TCat];
};

type TGoogleSVGClassKey<TCat extends TGoogleSVGCSSClassCategory> =
    keyof TGoogleSVGClassesByCategory[TCat];

type TGoogleSVGClassValue<TCat extends TGoogleSVGCSSClassCategory> =
    TGoogleSVGClassesByCategory[TCat][TGoogleSVGClassKey<TCat>];

// #endregion types

export class SVGFlowChartServiceGoogle extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(): void {
        this.SetAllElementsInCategory(GoogleSVGStateBoxCSSClass);
        this.SetAllElementsInCategory(GoogleSVGArrowCSSClass);
    }

    public SetElement<TCat extends TGoogleSVGCSSClassCategory>(
        classKey: TGoogleSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    public Unset<TCat extends TGoogleSVGCSSClassCategory>(
        classKey: TGoogleSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.RemoveCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    private SetAllElementsInCategory<TCat extends TGoogleSVGCSSClassCategory>(
        categoryObj: TGoogleSVGClassesByCategory[TCat],
    ): void {
        for (const key in categoryObj) {
            this.SetElement<TCat>(key);
        }
    }

    private getElementData<TCat extends TGoogleSVGCSSClassCategory>(
        svgClassKey: TGoogleSVGClassKey<TCat>,
    ): {
        cssCategory: TCat;
        cssClass: TGoogleSVGClassValue<TCat>;
    } {
        for (const category of Object.keys(GoogleSVGHierarchy) as TCat[]) {
            const googleSVGCSSClassObj = GoogleSVGHierarchy[category];

            if (svgClassKey in googleSVGCSSClassObj) {
                return {
                    cssCategory: category,
                    cssClass: googleSVGCSSClassObj[svgClassKey],
                };
            }
        }
        throw new Error(`css key not found: ${String(svgClassKey)}`);
    }
}
