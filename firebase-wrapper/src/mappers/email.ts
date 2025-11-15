import { emailSignInActions, EmailSignInFSM } from "../state-machine-email";
import {
    EmailSVGArrowCSSClass,
    EmailSVGStateBoxCSSClass,
} from "../svg-email-flowchart-auto-types";

export const emailStateToCSSBoxClassMappings: Record<
    string,
    EmailSVGStateBoxCSSClass
> = {
    [EmailSignInFSM.Idle.name]: EmailSVGStateBoxCSSClass.Idle0,

    [EmailSignInFSM.SubmittingEmailToFirebase.name]:
        EmailSVGStateBoxCSSClass.EmailSubmittedToFirebase0,

    [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name]:
        EmailSVGStateBoxCSSClass.WaitingForUserToClickLinkInEmail0,

    [EmailSignInFSM.BadEmailAddress.name]:
        EmailSVGStateBoxCSSClass.BadEmailAddress0,

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name]:
        EmailSVGStateBoxCSSClass.SignInLinkOpenedOnDifferentBrowser0,

    [EmailSignInFSM.LinkOpenedOnSameBrowser.name]:
        EmailSVGStateBoxCSSClass.SignInLinkOpenedOnSameBrowser0,

    [EmailSignInFSM.WaitingForEmailAddressInGUI.name]:
        EmailSVGStateBoxCSSClass.WaitingForEmailAddressInGui0,

    [EmailSignInFSM.AuthorisingViaFirebase.name]:
        EmailSVGStateBoxCSSClass.AuthorisingViaFirebase0,

    [EmailSignInFSM.SignedIn.name]: EmailSVGStateBoxCSSClass.SignedIn0,
};

export const emailStateToCSSArrowClassMappings: Record<
    string,
    EmailSVGArrowCSSClass
> = {
    [EmailSignInFSM.Idle.name +
    emailSignInActions.UserInputsEmailAddressAndClicksSignInButton]:
        EmailSVGArrowCSSClass.UserInputsEmailAddressAndClicksSigninButton0,

    [EmailSignInFSM.SubmittingEmailToFirebase.name +
    emailSignInActions.DifferentEmailAddressEntered]:
        EmailSVGArrowCSSClass.DifferentEmailAddress0,

    [EmailSignInFSM.WaitingForUserToClickLinkInEmail.name +
    emailSignInActions.CheckIfURLIsASignInWithEmailLink]:
        EmailSVGArrowCSSClass.OkResponse0,

    [EmailSignInFSM.BadEmailAddress.name +
    emailSignInActions.FirebaseOKResponse]:
        EmailSVGArrowCSSClass.UserChangesEmailAddressAndClicksSignInWithEmailButton0,

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.FirebaseErrorResponse]:
        EmailSVGArrowCSSClass.RequestEmailAddressFromUserAgain0,

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.validateEmailDataBeforeSignIn]:
        EmailSVGArrowCSSClass.OkResponse0, // todo

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.urlIsASignInWithEmailLink]:
        EmailSVGArrowCSSClass.OkResponse0, // todo

    [EmailSignInFSM.LinkOpenedOnDifferentBrowser.name +
    emailSignInActions.continuingOnSameBrowser]:
        EmailSVGArrowCSSClass.OkResponse0, // todo
};
