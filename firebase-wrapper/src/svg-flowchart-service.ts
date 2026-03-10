import { SVGService } from "./svg-service.ts";

export type TSVGCSSClassCategoryValues =
    (typeof SVGCSSClassCategory)[keyof typeof SVGCSSClassCategory];

export const SVGCSSClassCategory = {
    Arrow: "arrow",
    StateBox: "state-box",
} as const;

/**
 * a common svg-flowchart service.
 * not specific to any type of flowchart (eg. email, fb).
 */
export class SVGFlowChartService extends SVGService {
    public SetCategory(svgCSSClassCategory: TSVGCSSClassCategoryValues): void {
        this.AddCSSClassBySelector(`.${svgCSSClassCategory}`, "active");
    }

    public UnsetAll(): void {
        for (const category of Object.values(SVGCSSClassCategory)) {
            this.UnsetCategory(category);
        }
    }

    public UnsetCategory(
        svgCSSClassCategory: TSVGCSSClassCategoryValues,
    ): void {
        this.RemoveCSSClassBySelector(`.${svgCSSClassCategory}`, "active");
    }
}
