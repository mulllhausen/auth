/** this class is not domain specific. it knows nothing about flowcharts - only svgs.*/
export class SVGService {
    private svgObj: HTMLObjectElement;
    private svg: SVGSVGElement | null = null;
    private svgQuerySelector: string;
    public isSVGReady: boolean = false;

    constructor(props: { document: Document; svgQuerySelector: string }) {
        this.svgQuerySelector = props.svgQuerySelector;
        const svgObj = props.document.querySelector(
            props.svgQuerySelector,
        ) as HTMLObjectElement | null;

        if (!svgObj) {
            throw new Error(`failed to find svg at ${props.svgQuerySelector}`);
        }

        this.svgObj = svgObj;
    }

    public setupOnReady(props: { callback: (svgDoc: Document) => void }): void {
        if (this.checkIfSVGIsReady(props.callback)) return;

        this.svgObj.addEventListener("load", () => {
            this.checkIfSVGIsReady(props.callback);
        });
    }

    private checkIfSVGIsReady(callback: (svgDoc: Document) => void): boolean {
        const doc = this.svgObj.contentDocument;
        if (!doc) {
            return false;
        }

        const svg = doc.querySelector("svg");
        if (!svg) {
            return false;
        }

        this.isSVGReady = true;
        this.svg = svg;
        callback(doc);
        return true;
    }

    private requireSVG(): void {
        if (!this.svg) {
            throw new Error(`SVG at ${this.svgQuerySelector} was not ready`);
        }
    }

    public AddCSSClassBySelector(
        querySelector: string,
        cssClass: string,
    ): void {
        this.requireSVG();

        const elements: NodeListOf<Element> =
            this.svg!.querySelectorAll(querySelector);

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
        this.requireSVG();

        const elements: NodeListOf<Element> =
            this.svg!.querySelectorAll(querySelector);

        for (const element of elements) {
            if (!element.classList.contains(cssClass)) {
                continue;
            }
            element.classList.remove(cssClass);
        }
    }
}
