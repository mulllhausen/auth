import { describe, expect, it } from "@jest/globals";
import { sendSignInLinkToEmail } from "firebase/auth";
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
    let firebaseAuthService: FirebaseAuthService;

    describe("happy path", () => {
        it("the initial state is correct", async () => {
            // arrange
            setupGUIMock({ ...some, ...defaultHappyPath });
            firebaseAuthService = setupFirebaseAuthService({
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
            firebaseAuthService = setupFirebaseAuthService({
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
            firebaseAuthService = setupFirebaseAuthService({
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
            expect(firebaseAuthService.UseLinkInsteadOfPassword).toBe(
                expectedinputNoPasswordCheckboxIsChecked,
            );
            expect(sendSignInLinkToEmail).toHaveBeenCalledTimes(1);
            expect(firebaseAuthService.EmailState).toBe(
                EmailSignInStates.EmailSent,
            );
        });

        it("following the email link redirects to the firebase server", async () => {});

        it("the response back from the firebase server asserts the user is signed-in", async () => {});
    });

    describe("sad path", () => {});
});
