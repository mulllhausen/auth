export class SVGService {
    private svg: SVGSVGElement;

    constructor(svgID: string) {
        const element = document.getElementById(svgID) as HTMLObjectElement;
        this.svg = element.contentDocument?.getElementsByTagName("svg")[0]!;
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
