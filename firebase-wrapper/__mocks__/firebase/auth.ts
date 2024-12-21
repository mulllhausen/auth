import { jest } from "@jest/globals";

export const ActionCodeSettings = jest.fn();
export const Auth = jest.fn();
export const AuthProvider = jest.fn();
export const CompleteFn = jest.fn();
export const EmailAuthProvider = jest.fn();
export const ErrorFn = jest.fn();
export const FacebookAuthProvider = jest.fn();
export const GithubAuthProvider = jest.fn();
export const GoogleAuthProvider = jest.fn();
export const NextOrObserver = jest.fn();
export const OAuthCredential = jest.fn();
export const PopupRedirectResolver = jest.fn();
export const Unsubscribe = jest.fn();
export const User = jest.fn();
export const UserCredential = jest.fn();
export const getAuth = jest.fn(() => ({ currentUser: null }));
export const getRedirectResult = jest.fn();
export const isSignInWithEmailLink = jest.fn();
export const onAuthStateChanged = jest.fn();
export const sendSignInLinkToEmail = jest.fn(() => {
    debugger;
    return Promise.resolve();
});
export const signInWithEmailLink = jest.fn();
export const signInWithRedirect = jest.fn();
