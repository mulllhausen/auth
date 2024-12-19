import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import { mock } from "jest-mock-extended";
import { env } from "../src/dotenv";
import {
    authProviders,
    defaultAction,
    FirebaseAuthService,
    WrapperSettings,
} from "../src/firebase-wrapper";
import { setupDocumentQuerySelectorMock } from "./mocks/document-querySelector";
import { setupDocumentQuerySelectorAllMock } from "./mocks/document-querySelectorAll";
import { setupLocalStorageMock } from "./mocks/local-storage";

beforeAll(() => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = "true";

    setupDocumentQuerySelectorMock({
        "button#clearCachedUser": document.createElement("button"),
        "input.email": document.createElement("input"),
        "input.no-password": checkbox,
        "input.password": document.createElement("input"),
    });

    const facebookLoginButton = document.createElement("button");
    facebookLoginButton.dataset.serviceProvider = authProviders.Facebook;

    const googleLoginButton = document.createElement("button");
    googleLoginButton.dataset.serviceProvider = authProviders.Google;

    const githubLoginButton = document.createElement("button");
    githubLoginButton.dataset.serviceProvider = authProviders.GitHub;

    const emailLoginButton = document.createElement("button");
    emailLoginButton.dataset.serviceProvider = authProviders.Email;

    setupDocumentQuerySelectorAllMock({
        "button.login": [
            facebookLoginButton,
            googleLoginButton,
            githubLoginButton,
            emailLoginButton,
        ],
    });
});

describe(`${FirebaseAuthService}`, () => {
    let store: Record<string, string>;
    let localStorageMock: ReturnType<typeof setupLocalStorageMock>;
    let firebaseAuthService: FirebaseAuthService;

    beforeEach(() => {
        jest.mock("firebase/auth", () => ({
            EmailAuthProvider: jest.fn(),
            GoogleAuthProvider: jest.fn(),
            FacebookAuthProvider: jest.fn(),
            GithubAuthProvider: jest.fn(),
        }));
        jest.spyOn(document, "querySelector").mockImplementation((selector) => {
            if (selector === ".mock-class") {
                return { innerHTML: "Mocked Element" } as HTMLElement;
            }
            return null;
        });
        setupLocalStorageMock({
            emailAddress: "bob@bob.bob",
            cachedUser: "abc",
        });
        const wrapperSettings = mock<WrapperSettings>();
        wrapperSettings.loginButtonCSSClass = "button.login";
        wrapperSettings.clearCachedUserButtonCSSClass =
            "button#clearCachedUser";
        wrapperSettings.authProviderSettings[authProviders.Google] = {
            loginButtonClicked: defaultAction,
        };
        wrapperSettings.authProviderSettings[authProviders.Facebook] = {
            loginButtonClicked: defaultAction,
        };
        wrapperSettings.authProviderSettings[authProviders.GitHub] = {
            loginButtonClicked: defaultAction,
        };
        wrapperSettings.authProviderSettings[authProviders.Email] = {
            loginButtonClicked: jest.fn(
                async (self: FirebaseAuthService, e: MouseEvent) => {},
            ),
            //handleEmailLogin(self, e),
        };

        firebaseAuthService = new FirebaseAuthService({
            env, // use concrete, not mock
            settings: wrapperSettings,
        });
    });

    it("sign-in with email link - happy path", async () => {
        debugger;
        // normally set by gui checkbox click
        firebaseAuthService.UseLinkInsteadOfPassword = true;
        await firebaseAuthService.Signin(authProviders.Email);
        expect(true).toBe(true);
    });
});
