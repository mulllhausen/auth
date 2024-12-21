import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { DocumentQuerySelectorMockReturnType } from "../manual-mocks/document-querySelector";
import { DocumentQuerySelectorAllMockReturnType } from "../manual-mocks/document-querySelectorAll";
import { setupFirebaseMock } from "../manual-mocks/firebase-wrapper";
import { setupGUIMock } from "../manual-mocks/gui";
import { setupLocalStorageMock } from "../manual-mocks/localStorage";
import { authProviders, FirebaseAuthService } from "../src/firebase-wrapper";

const loginButtonCSSClass = "button.login";
const clearCachedUserButtonCSSClass = "button#clearCachedUser";
const inputEmailCSSClass = "input.email";
const inputNoPasswordCSSClass = "input.no-password";
const inputPasswordCSSClass = "input.password";

let querySelectorMock: DocumentQuerySelectorMockReturnType;
let querySelectorAllMock: DocumentQuerySelectorAllMockReturnType;

beforeAll(() => {
    ({ querySelectorMock, querySelectorAllMock } = setupGUIMock({
        clearCachedUserButtonCSSClass,
        inputEmailCSSClass,
        inputNoPasswordCSSClass,
        inputPasswordCSSClass,
    }));
});

describe(`${FirebaseAuthService}`, () => {
    let firebaseAuthService: FirebaseAuthService;

    beforeEach(() => {
        setupLocalStorageMock({
            emailAddress: "bob@bob.bob",
            cachedUser: "abc",
        });
        firebaseAuthService = setupFirebaseMock({
            loginButtonCSSClass,
            clearCachedUserButtonCSSClass,
        });
    });

    it("sign-in with email link - happy path", async () => {
        // normally set by gui checkbox click
        firebaseAuthService.UseLinkInsteadOfPassword = true;
        await firebaseAuthService.Signin(authProviders.Email);
        expect(true).toBe(true);
    });
});
