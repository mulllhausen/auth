import { jest } from "@jest/globals";

export type DocumentQuerySelectorMockReturnType = jest.Mock<
    (key: string) => HTMLElement | null
>;

export const setupDocumentQuerySelectorMock = (
    documentQueryMappings: Record<string, HTMLElement | null>,
): DocumentQuerySelectorMockReturnType => {
    const querySelectorMock: DocumentQuerySelectorMockReturnType = jest.fn(
        (key: string) => documentQueryMappings[key] ?? null,
    );

    Object.defineProperty(document, "querySelector", {
        value: querySelectorMock,
        configurable: true,
        writable: true,
    });

    return querySelectorMock;
};
