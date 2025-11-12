import {
    EmailSVGArrowCSSClass,
    EmailSVGCSSClass,
    EmailSVGStateBoxCSSClass,
} from "./svg-auto-types";
import { SVGService } from "./svg-service";

export enum SVGStateStatus {
    Success = "success",
    Failure = "failure",
}

export enum SVGCSSClassCategory {
    Arrow = "arrow",
    StateBox = "state-box",
}

interface SVGCategoryInfo<TEnum> {
    values: readonly string[];
    valueType: TEnum;
}

type EmailSVGHierarchyType = {
    [K in SVGCSSClassCategory]: SVGCategoryInfo<EmailSVGCSSClass>;
};

export const EmailSVGHierarchy: EmailSVGHierarchyType = {
    [SVGCSSClassCategory.Arrow]: {
        values: Object.values(EmailSVGArrowCSSClass),
        valueType: EmailSVGArrowCSSClass,
    },
    [SVGCSSClassCategory.StateBox]: {
        values: Object.values(EmailSVGStateBoxCSSClass),
        valueType: EmailSVGStateBoxCSSClass,
    },
} as const;

export class SVGEmailFlowService {
    private svgService: SVGService;

    constructor(svgQuerySelector: string) {
        this.svgService = new SVGService(svgQuerySelector);
    }

    /** for testing */
    public SetAll(status: SVGStateStatus = SVGStateStatus.Failure): void {
        this.SetAllByType(EmailSVGStateBoxCSSClass, status);
        this.SetAllByType(EmailSVGArrowCSSClass, status);
    }

    public UnsetAll(): void {
        this.UnsetElementStatus(
            EmailSVGStateBoxCSSClass,
            SVGStateStatus.Success,
        );
        this.UnsetElementStatus(
            EmailSVGStateBoxCSSClass,
            SVGStateStatus.Failure,
        );
        this.UnsetElementStatus(EmailSVGArrowCSSClass, SVGStateStatus.Success);
        this.UnsetElementStatus(EmailSVGArrowCSSClass, SVGStateStatus.Failure);
    }

    public SetAllByType(
        svgCSSClassType: EmailSVGCSSClass,
        status: SVGStateStatus,
    ): void {
        for (const enumKey in svgCSSClassType) {
            const enumValue =
                svgCSSClassType[enumKey as keyof typeof svgCSSClassType];
            this.SetElementStatus(enumValue, status);
        }
    }

    public UnsetAllByType(svgCSSClassType: EmailSVGCSSClass): void {
        for (const enumKey in svgCSSClassType) {
            const enumValue =
                svgCSSClassType[enumKey as keyof typeof svgCSSClassType];

            this.UnsetElementStatus(enumValue, SVGStateStatus.Success);
            this.UnsetElementStatus(enumValue, SVGStateStatus.Failure);
        }
    }

    public SetElementStatus(
        cssClass: EmailSVGStateBoxCSSClass | EmailSVGArrowCSSClass,
        status: SVGStateStatus,
    ): void {
        let querySelector: string = "";
        if (this.isCSSEnumValue(EmailSVGStateBoxCSSClass, cssClass)) {
            querySelector = `.state-box.${cssClass}`;
        }
        if (this.isCSSEnumValue(EmailSVGArrowCSSClass, cssClass)) {
            querySelector = `.arrow.${cssClass}`;
        }
        this.svgService.SetElementStatus(querySelector, status);
    }

    public UnsetElementStatus(
        cssClass: EmailSVGCSSClass,
        status: SVGStateStatus,
    ): void {
        this.svgService.UnsetElementStatus(
            `.${this.getCategory(cssClass)}`,
            status,
        );
    }

    private getCategory(cssClass: EmailSVGCSSClass): SVGCSSClassCategory {
        type tupleArray = [
            SVGCSSClassCategory,
            SVGCategoryInfo<EmailSVGCSSClass>,
        ][];
        const entries = Object.entries(EmailSVGHierarchy) as tupleArray;
        const found = entries.find(
            ([, categoryInfo]) => categoryInfo.valueType === cssClass,
        )?.[0];
        if (!found) throw new Error(`Unknown CSS class "${cssClass}"`);
        return found;
    }

    private isCSSEnumValue<
        T extends
            | typeof EmailSVGStateBoxCSSClass
            | typeof EmailSVGArrowCSSClass,
    >(enumObj: T, enumValue: string): enumValue is T[keyof T] & string {
        return Object.values(enumObj).includes(
            enumValue as T[keyof T] & string,
        );
    }
}
