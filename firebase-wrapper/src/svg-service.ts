import { ArrowCSSClass, StateBoxCSSClass } from "./svg-auto-types";

export enum SVGStateStatus {
    Success = "success",
    Failure = "failure",
}
export const enum SVGCSSClassCategory {
    Arrow = "arrow",
    StateBox = "state-box",
}

export class SVGService {
    private svg: SVGSVGElement;

    constructor(svgQuerySelector: string) {
        const element = document.querySelector(
            svgQuerySelector,
        ) as HTMLObjectElement;
        this.svg = element.contentDocument?.querySelector("svg")!;
    }

    private isCSSEnumValue<
        T extends typeof StateBoxCSSClass | typeof ArrowCSSClass,
    >(enumObj: T, enumValue: string): enumValue is T[keyof T] & string {
        return Object.values(enumObj).includes(
            enumValue as T[keyof T] & string,
        );
    }

    public SetAllStatuses(
        svgCSSClassType: typeof StateBoxCSSClass | typeof ArrowCSSClass,
        status: SVGStateStatus,
    ): void {
        for (const enumKey in svgCSSClassType) {
            const enumValue =
                svgCSSClassType[enumKey as keyof typeof svgCSSClassType];
            this.SetStatus(enumValue, status);
        }
    }

    public SetStatus(
        cssClass: StateBoxCSSClass | ArrowCSSClass,
        status: SVGStateStatus,
    ): void {
        let querySelector: string = "";
        if (this.isCSSEnumValue(StateBoxCSSClass, cssClass)) {
            querySelector = `.state-box.${cssClass}`;
        }
        if (this.isCSSEnumValue(ArrowCSSClass, cssClass)) {
            querySelector = `.arrow.${cssClass}`;
        }
        this.SetElementStatus(querySelector, status);
    }

    public UnsetStatus(
        cssClass: SVGCSSClassCategory,
        status: SVGStateStatus,
    ): void {
        this.UnsetElementStatus(`.${cssClass}`, status);
    }

    public SetElementStatus(querySelector: string, status: string): void {
        const elements: NodeListOf<Element> =
            this.svg.querySelectorAll(querySelector);

        for (const element of elements) {
            if (element.classList.contains(status)) {
                continue;
            }
            element.classList.add(status);
        }
    }

    public UnsetElementStatus(querySelector: string, status: string): void {
        const elements: NodeListOf<Element> =
            this.svg.querySelectorAll(querySelector);

        for (const element of elements) {
            if (!element.classList.contains(status)) {
                continue;
            }
            element.classList.remove(status);
        }
    }
}
