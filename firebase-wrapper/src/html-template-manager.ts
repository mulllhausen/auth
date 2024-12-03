export class HTMLTemplateManager {
    private _document: Document;
    private cachedElements: Record<string, HTMLElement> = {};

    constructor(_document: Document) {
        this._document = _document;
    }

    public append(child: HTMLElement, parentId: string) {
        const parentElement = this.getElementById(parentId);
        if (!parentElement) {
            throw new Error(`Parent element with ID '${parentId}' not found.`);
        }
        parentElement.appendChild(child);
    }

    public prepend(child: HTMLElement, parentId: string) {
        const parentElement = this.getElementById(parentId);
        if (!parentElement) {
            throw new Error(`Parent element with ID '${parentId}' not found.`);
        }
        parentElement.insertBefore(child, parentElement.firstChild);
    }

    public cloneTemplateSingle(templateId: string): HTMLElement {
        const templateElement = this.getElementById(
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

    public getElementById(elementId: string): HTMLElement {
        if (this.cachedElements.hasOwnProperty(elementId)) {
            return this.cachedElements[elementId];
        }
        return (this.cachedElements[elementId] = this._document.getElementById(
            elementId,
        ) as HTMLElement);
    }

    public clearCache(): void {
        this.cachedElements = {};
    }
}
