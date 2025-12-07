import { SVGService } from "./svg-service.ts";

export type TSVGStateStatusValues =
    (typeof SVGStateStatus)[keyof typeof SVGStateStatus];

// todo: just use "active" here. the SVG can specify if
// a state is good or bad and same with arrows
export const SVGStateStatus = {
    Success: "success",
    Failure: "failure",
} as const;

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
    public SetCategory(
        svgCSSClassCategory: TSVGCSSClassCategoryValues,
        status: TSVGStateStatusValues = SVGStateStatus.Success,
    ): void {
        this.AddCSSClassBySelector(`.${svgCSSClassCategory}`, status);
    }

    public UnsetAll(status?: TSVGStateStatusValues): void {
        for (const category of Object.values(SVGCSSClassCategory)) {
            this.UnsetCategory(category, status);
        }
    }

    public UnsetCategory(
        svgCSSClassCategory: TSVGCSSClassCategoryValues,
        unsetStatus?: TSVGStateStatusValues,
    ): void {
        const unsetAllStatuses = unsetStatus === undefined;
        for (const eachStatus of Object.values(SVGStateStatus)) {
            if (unsetAllStatuses || unsetStatus === eachStatus) {
                this.RemoveCSSClassBySelector(
                    `.${svgCSSClassCategory}`,
                    eachStatus,
                );
            }
        }
    }
}
