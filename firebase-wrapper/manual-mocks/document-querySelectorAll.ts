import { jest } from "@jest/globals";

export type DocumentQuerySelectorAllMockReturnType = jest.Mock<
    (key: string) => HTMLElement[] | null
>;

export const setupDocumentQuerySelectorAllMock = (
    documentQueryMappings: Record<string, HTMLElement[] | null>,
): DocumentQuerySelectorAllMockReturnType => {
    const querySelectorMock: DocumentQuerySelectorAllMockReturnType = jest.fn(
        (key: string) => documentQueryMappings[key] ?? null,
    );

    Object.defineProperty(document, "querySelectorAll", {
        value: querySelectorMock,
        configurable: true,
        writable: true,
    });

    return querySelectorMock;
};
