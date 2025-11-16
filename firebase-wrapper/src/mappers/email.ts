import { emailSignInActions, EmailSignInFSM } from "../state-machine-email";
import {
    EmailSVGArrowCSSClass,
    EmailSVGStateBoxCSSClass,
} from "../svg-email-flowchart-auto-types";

export const emailStateToCSSBoxClassMappings: Record<
    string,
    keyof typeof EmailSVGStateBoxCSSClass
> = {
    [EmailSignInFSM.Idle.name]: "Idle0",

    [EmailSignInFSM.SubmittingEmailToFirebase.name]:
        "EmailSubmittedToFirebase0",

    [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name]:
        "WaitingForUserToClickLinkInEmail0",

    [EmailSignInFSM.BadEmailAddress.name]: "BadEmailAddress0",

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name]:
        "SignInLinkOpenedOnDifferentBrowser0",

    [EmailSignInFSM.LinkOpenedOnSameBrowser.name]:
        "SignInLinkOpenedOnSameBrowser0",

    [EmailSignInFSM.WaitingForEmailAddressInGUI.name]:
        "WaitingForEmailAddressInGui0",

    [EmailSignInFSM.AuthorisingViaFirebase.name]: "AuthorisingViaFirebase0",

    [EmailSignInFSM.SignedIn.name]: "SignedIn0",
};

export const emailStateToCSSArrowClassMappings: Record<
    string,
    keyof typeof EmailSVGArrowCSSClass
> = {
    [EmailSignInFSM.Idle.name +
    emailSignInActions.UserInputsEmailAddressAndClicksSignInButton]:
        "UserInputsEmailAddressAndClicksSigninButton0",

    [EmailSignInFSM.SubmittingEmailToFirebase.name +
    emailSignInActions.DifferentEmailAddressEntered]: "DifferentEmailAddress0",

    [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name +
    emailSignInActions.CheckIfURLIsASignInWithEmailLink]: "OkResponse0",

    [EmailSignInFSM.BadEmailAddress.name +
    emailSignInActions.FirebaseOKResponse]:
        "UserChangesEmailAddressAndClicksSignInWithEmailButton0",

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.FirebaseErrorResponse]:
        "RequestEmailAddressFromUserAgain0",

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.validateEmailDataBeforeSignIn]: "OkResponse0", // todo

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.urlIsASignInWithEmailLink]: "OkResponse0", // todo

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.continuingOnSameBrowser]: "OkResponse0", // todo
};
