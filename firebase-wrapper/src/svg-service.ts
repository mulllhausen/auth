export class SVGService {
    private svg: SVGSVGElement;

    constructor(svgQuerySelector: string) {
        const element = document.querySelector(
            svgQuerySelector,
        ) as HTMLObjectElement;
        this.svg = element.contentDocument?.querySelector("svg")!;
    }

    public SetElementsActive(querySelector: string): void {
        const elements: NodeListOf<Element> =
            this.svg.querySelectorAll(querySelector);

        for (const element of elements) {
            if (element.classList.contains("active")) {
                continue;
            }
            element.classList.add("active");
        }
    }

    public SetElementsInactive(querySelector: string): void {
        const elements: NodeListOf<Element> =
            this.svg.querySelectorAll(querySelector);

        for (const element of elements) {
            if (!element.classList.contains("active")) {
                continue;
            }
            element.classList.remove("active");
        }
    }
}
