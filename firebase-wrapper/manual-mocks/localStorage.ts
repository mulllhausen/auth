import { jest } from "@jest/globals";

type returnType = {
    getItem: jest.Mock<(key: string) => string | null>;
    setItem: jest.Mock<(key: string, value: string) => void>;
    removeItem: jest.Mock<(key: string) => void>;
    clear: jest.Mock<() => void>;
};

export const setupLocalStorageMock = (
    store: Record<string, string>,
): returnType => {
    const mocks: returnType = {
        getItem: jest.fn((key: string) => store[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            Object.keys(store).forEach((key) => delete store[key]);
        }),
    };
    Object.defineProperty(window, "localStorage", {
        value: mocks,
        configurable: true,
        writable: true,
    });
    return mocks;
};
