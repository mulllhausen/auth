import { jest } from "@jest/globals";
import { some } from "../../manual-mocks/some";

// mock all imported classes and functions in firebase-wrapper.ts.
// this prevents the firebase library from attempting to make network calls.
// some classes do not contain methods and so do not actually need mocking,
// but who knows what firebase may change in future... so mocking everything
// makes the tests more robust.

type mockProviderType = jest.Mock & {
    PROVIDER_ID: string;
};

export const ActionCodeSettings = jest.fn();
export const Auth = jest.fn();
export const AuthProvider = jest.fn();
export const CompleteFn = jest.fn();
export const EmailAuthProvider = Object.assign(jest.fn(), {
    PROVIDER_ID: some.EmailAuthProviderID,
}) as mockProviderType;
export const ErrorFn = jest.fn();
export const FacebookAuthProvider = Object.assign(jest.fn(), {
    PROVIDER_ID: some.FacebookAuthProviderID,
}) as mockProviderType;
export const GithubAuthProvider = Object.assign(jest.fn(), {
    PROVIDER_ID: some.GithubAuthProviderID,
}) as mockProviderType;
export const GoogleAuthProvider = Object.assign(jest.fn(), {
    PROVIDER_ID: some.GoogleAuthProviderID,
}) as mockProviderType;
export const NextOrObserver = jest.fn();
export const OAuthCredential = jest.fn();
export const PopupRedirectResolver = jest.fn();
export const Unsubscribe = jest.fn();
export const User = jest.fn();
export const UserCredential = jest.fn();
export const getAuth = jest.fn();
export const getRedirectResult = jest.fn();
export const isSignInWithEmailLink = jest.fn();
export const onAuthStateChanged = jest.fn();
export const sendSignInLinkToEmail = jest.fn();
export const signInWithEmailLink = jest.fn();
export const signInWithRedirect = jest.fn();
