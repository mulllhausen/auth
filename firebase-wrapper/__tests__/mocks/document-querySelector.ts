import { jest } from "@jest/globals";

type returnType = jest.Mock<(key: string) => HTMLElement | null>;

export const setupDocumentQuerySelectorMock = (
    documentQueryMappings: Record<string, HTMLElement | null>,
): returnType => {
    const querySelectorMock: returnType = jest.fn(
        (key: string) => documentQueryMappings[key] ?? null,
    );

    Object.defineProperty(document, "querySelector", {
        value: querySelectorMock,
        configurable: true,
        writable: true,
    });

    return querySelectorMock;
};
