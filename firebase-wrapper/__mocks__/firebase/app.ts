import { jest } from "@jest/globals";

// mock all imported classes and functions in firebase-wrapper.ts.
// some classes do not contain methods and so do not actually need mocking,
// but who knows what firebase may change in future.

export const FirebaseOptions = jest.fn();
export const FirebaseApp = jest.fn();
export const FirebaseError = jest.fn();
export const initializeApp = jest.fn();
