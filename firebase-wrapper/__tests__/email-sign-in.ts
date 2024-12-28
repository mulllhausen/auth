import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { sendSignInLinkToEmail } from "firebase/auth";
import {
    isSignInWithEmailLink,
    signInWithEmailLink,
} from "../__mocks__/firebase/auth";
import { defaultHappyPath } from "../manual-mocks/default";
import { setupFirebaseAuthService } from "../manual-mocks/firebase-wrapper";
import { clickButtonByQuerySelector, setupGUIMock } from "../manual-mocks/gui";
import { some } from "../manual-mocks/some";
import {
    authProviders,
    EmailSignInStates,
    FirebaseAuthService,
} from "../src/firebase-wrapper";

describe(`${FirebaseAuthService.name} - email sign-in`, () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clears the call count for all mocked functions
    });

    describe("happy path", () => {
        it("the initial state is correct", async () => {
            // arrange
            setupGUIMock({ ...some, ...defaultHappyPath });
            const firebaseAuthService = setupFirebaseAuthService({
                ...some,
                ...defaultHappyPath,
            });

            // assert
            expect(firebaseAuthService.EmailState).toBe(
                EmailSignInStates.EmailNotSent,
            );
        });

        it("clicking the email sign-in button loads the email address", async () => {
            // arrange
            setupGUIMock({ ...some, ...defaultHappyPath });
            const firebaseAuthService = setupFirebaseAuthService({
                ...some,
                ...defaultHappyPath,
            });
            const expectedEmailAddress = some.mockEmailAddress;

            // act
            clickButtonByQuerySelector(
                defaultHappyPath.emailButtonQuerySelector,
            );

            // assert
            expect(firebaseAuthService.EmailState).toBe(
                EmailSignInStates.EmailNotSent,
            );
            expect(firebaseAuthService.EmailAddress).toBe(expectedEmailAddress);
            expect(
                localStorage.getItem(
                    defaultHappyPath.localStorageEmailAddressKey,
                ),
            ).toBe(expectedEmailAddress);
        });

        it("sign-in with email link sends email", async () => {
            // arrange
            const expectedinputNoPasswordCheckboxIsChecked = true;
            setupGUIMock({
                ...some,
                ...defaultHappyPath,
                inputNoPasswordCheckboxIsChecked:
                    expectedinputNoPasswordCheckboxIsChecked,
            });
            const firebaseAuthService = setupFirebaseAuthService({
                ...some,
                ...defaultHappyPath,
            });
            const expectedEmailAddress = some.mockEmailAddress;

            // act
            clickButtonByQuerySelector(
                defaultHappyPath.emailButtonQuerySelector,
            );
            await firebaseAuthService.Signin(authProviders.Email);

            // assert
            expect(firebaseAuthService.EmailAddress).toBe(expectedEmailAddress);
            expect(
                localStorage.getItem(
                    defaultHappyPath.localStorageEmailAddressKey,
                ),
            ).toBe(expectedEmailAddress);
            expect(firebaseAuthService.UseLinkInsteadOfPassword).toBe(
                expectedinputNoPasswordCheckboxIsChecked,
            );
            expect(sendSignInLinkToEmail).toHaveBeenCalledTimes(1);
            expect(firebaseAuthService.EmailState).toBe(
                EmailSignInStates.WaitingForUserToFollowEmailLink,
            );
        });

        it("following the email link using the same browser signs the user in", async () => {
            // arrange
            const expectedEmailAddress = some.mockEmailAddress;

            // normally this would check the URL and only return true if it originated from the email
            isSignInWithEmailLink.mockImplementation(() => true);

            // on the same browser the email address is available from local storage
            localStorage.setItem(
                defaultHappyPath.localStorageEmailAddressKey,
                expectedEmailAddress,
            );

            setupGUIMock({ ...some, ...defaultHappyPath });

            // act
            const firebaseAuthService = setupFirebaseAuthService({
                ...some,
                ...defaultHappyPath,
            });

            // assert
            expect(firebaseAuthService.EmailAddress).toBe(expectedEmailAddress);
            expect(
                localStorage.getItem(
                    defaultHappyPath.localStorageEmailAddressKey,
                ),
            ).toBe(expectedEmailAddress);
            expect(isSignInWithEmailLink).toHaveBeenCalledTimes(1);
            expect(firebaseAuthService.EmailState).toBe(
                EmailSignInStates.EmailLinkOpenedOnSameBrowser,
            );
            expect(signInWithEmailLink).toHaveBeenCalledTimes(1);
        });

        it("the response back from the firebase server asserts the user is signed-in", async () => {});
    });

    describe("sad path", () => {});
});
