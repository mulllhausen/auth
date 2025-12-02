/** this class is not domain specific. it knows nothing about flowcharts - only svgs.*/
export class SVGService {
    private svg: SVGSVGElement;

    constructor({ svgQuerySelector }: { svgQuerySelector: string }) {
        const element = document.querySelector(
            svgQuerySelector,
        ) as HTMLObjectElement;
        this.svg = element.contentDocument?.querySelector("svg")!;
    }

    public AddCSSClassBySelector(
        querySelector: string,
        cssClass: string,
    ): void {
        const elements: NodeListOf<Element> =
            this.svg.querySelectorAll(querySelector);

        for (const element of elements) {
            if (element.classList.contains(cssClass)) {
                continue;
            }
            element.classList.add(cssClass);
        }
    }

    public RemoveCSSClassBySelector(
        querySelector: string,
        cssClass: string,
    ): void {
        const elements: NodeListOf<Element> =
            this.svg.querySelectorAll(querySelector);

        for (const element of elements) {
            if (!element.classList.contains(cssClass)) {
                continue;
            }
            element.classList.remove(cssClass);
        }
    }
}
