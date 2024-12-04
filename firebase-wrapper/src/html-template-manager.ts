export class HTMLTemplateManager {
    private _document: Document;
    private cachedElements: Record<string, HTMLElement> = {};

    constructor(_document: Document) {
        this._document = _document;
    }

    public append(child: HTMLElement, parentCSS: string) {
        const parentElement = this.querySelector(parentCSS);
        if (!parentElement) {
            throw new Error(
                `Parent element with CSS selector '${parentCSS}' not found.`,
            );
        }
        parentElement.appendChild(child);
    }

    public prepend(child: HTMLElement, parentCSS: string) {
        const parentElement: HTMLElement = this.querySelector(parentCSS);
        if (!parentElement) {
            throw new Error(`Parent element with ID '${parentCSS}' not found.`);
        }
        this.prependElement(child, parentElement.firstChild as HTMLElement);
    }

    public prependElement(
        childElement: HTMLElement,
        parentElement: HTMLElement,
    ) {
        parentElement.insertBefore(childElement, parentElement.firstChild);
    }

    public cloneTemplateSingle(templateId: string): HTMLElement {
        const templateElement = this.querySelector(
            templateId,
        ) as HTMLTemplateElement;

        if (!(templateElement instanceof HTMLTemplateElement)) {
            throw new Error(
                `Element with ID '${templateId}' is not a <template> element.`,
            );
        }

        const fragment = templateElement.content.cloneNode(
            true,
        ) as DocumentFragment;

        const child: Element | null = fragment.firstElementChild;
        if (!child || !(child instanceof HTMLElement)) {
            throw new Error(
                `Template with ID '${templateId}' does not have 1 root element.`,
            );
        }
        return child;
    }

    public querySelector(elementCSS: string): HTMLElement {
        if (this.cachedElements.hasOwnProperty(elementCSS)) {
            return this.cachedElements[elementCSS];
        }
        return (this.cachedElements[elementCSS] = this._document.querySelector(
            elementCSS,
        ) as HTMLElement);
    }

    public clearCache(): void {
        this.cachedElements = {};
    }
}
