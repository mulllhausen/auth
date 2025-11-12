/** not domain specific */
export class SVGService {
    private svg: SVGSVGElement;

    constructor(svgQuerySelector: string) {
        const element = document.querySelector(
            svgQuerySelector,
        ) as HTMLObjectElement;
        this.svg = element.contentDocument?.querySelector("svg")!;
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
