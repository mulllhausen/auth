import {
    GithubSVGArrowCSSClass,
    GithubSVGStateBoxCSSClass,
} from "./svg-flowchart-auto-types-github";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
} from "./svg-flowchart-service";

// convention: if a var has `css` in the name then it is a css class at runtime.
// eg. "state-box"

// #region consts

const GithubSVGHierarchy = {
    [SVGCSSClassCategory.Arrow]: GithubSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: GithubSVGStateBoxCSSClass,
} as const;

// #endregion consts

// #region types

type TGithubSVGCSSClassCategory = keyof typeof GithubSVGHierarchy;

export type TGithubSVGClassesByCategory = {
    [TCat in TGithubSVGCSSClassCategory]: (typeof GithubSVGHierarchy)[TCat];
};

type TGithubSVGClassKey<TCat extends TGithubSVGCSSClassCategory> =
    keyof TGithubSVGClassesByCategory[TCat];

type TGithubSVGClassValue<TCat extends TGithubSVGCSSClassCategory> =
    TGithubSVGClassesByCategory[TCat][TGithubSVGClassKey<TCat>];

// #endregion types

export class SVGFlowChartServiceGithub extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(): void {
        this.SetAllElementsInCategory(GithubSVGStateBoxCSSClass);
        this.SetAllElementsInCategory(GithubSVGArrowCSSClass);
    }

    public SetElement<TCat extends TGithubSVGCSSClassCategory>(
        classKey: TGithubSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.AddCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    public Unset<TCat extends TGithubSVGCSSClassCategory>(
        classKey: TGithubSVGClassKey<TCat>,
    ): void {
        const data = this.getElementData(classKey);
        this.RemoveCSSClassBySelector(
            `.${data.cssCategory}.${data.cssClass}`,
            "active",
        );
    }

    private SetAllElementsInCategory<TCat extends TGithubSVGCSSClassCategory>(
        categoryObj: TGithubSVGClassesByCategory[TCat],
    ): void {
        for (const key in categoryObj) {
            this.SetElement<TCat>(key);
        }
    }

    private getElementData<TCat extends TGithubSVGCSSClassCategory>(
        svgClassKey: TGithubSVGClassKey<TCat>,
    ): {
        cssCategory: TCat;
        cssClass: TGithubSVGClassValue<TCat>;
    } {
        for (const category of Object.keys(GithubSVGHierarchy) as TCat[]) {
            const gitHubSVGCSSClassObj = GithubSVGHierarchy[category];

            if (svgClassKey in gitHubSVGCSSClassObj) {
                return {
                    cssCategory: category,
                    cssClass: gitHubSVGCSSClassObj[svgClassKey],
                };
            }
        }
        throw new Error(`css key not found: ${String(svgClassKey)}`);
    }
}
