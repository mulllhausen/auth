// functional spec:
// 1. initialise FirebaseAuthService and get the object.
// 2. initialise each FSM SVG flowchart and get the object for each one.
// 3. initialise all of the finite state machines: EmailSignInFSM, FBSignInFSM,
//    GoogleSignInFSM.
//    - pass the FirebaseAuthService object into each one. they will need this to be able
//      to control state transitions.
//    - pass the FSM SVG flowchart object relevant to each FSM to its state machine class.
//      this object is used to update the SVG.
// 4. the state machines subscribe to change-of-state events from FirebaseAuthService and
//    other sources (button clicks, form submissions). note that these events just contain
//    data, not instructions. FSMs only subscribe to events that are relevant to them.
// 5. as the user interacts with the gui they trigger various event emitters. these events
//    are caught by the relevant FSMs (1 event could be caught by more than 1 FSM).
// 6. when the state machine context class is triggered by an event it passes the event
//    to the active state class handle() method, which uses:
//    - its current state (class)
//    - the type of the event
//    - the data accompanying the event
//    to:
//    1. figure out if a transition to a new state is necessary. if not then just exit.
//    2. figure out what the next state is.
//    3. call the context class transition() method to action the transition to the next state
// 7. when the context class transition() method is called, it:
//    1. runs the onExit() method for the old (current) state
//    2. initialises the new state class
//    3. runs the onEnter() method for the new state class
// 8. a state class's onEnter() method:
//    1. sets all state boxes in the SVG to inactive (clear color)
//    2. sets all transition arrows in the SVG to inactive (black color)
//    3. sets the state box corresponding to its own class in the SVG to active (blue)
//    4. sets the transition path from the previous state to the current state to active (green
//      if the transition is a happy path or red if it is an unhappy path)
//    5. calls any FirebaseAuthService methods

// note: always trigger an event at the start of each call to firebase so we can update the
// transition to in-progress
// note: it should not be possible for a failure to result in the same state. if this appears
// to be happening then we need to introduce a new state to capture the failure
// Formal principle (from automata theory, CS foundations)
// A “missing state” is always indicated when:
// - transitions are non-deterministic
// - you need to guess the next state
// - you have to correct or undo a transition
// - you can’t describe the system at a moment in time
// - Introducing a new state resolves the non-determinism.

import {
    authProviders,
    FirebaseAuthService,
    TAuthProvider,
} from "./firebase-wrapper.ts";
import { GUILogger } from "./gui-logger.ts";
import { HTMLTemplateManager } from "./html-template-manager.ts";
import "./index.css";
import {
    authProviderToGUINameMap,
    mapAuthProvider2NavTabElement,
} from "./mappers-gui.ts";
import { FSMCoordinator } from "./state-machine-coordinator.ts";
import {
    EmailSignInFSMContext,
    TEmailStateDTO,
} from "./state-machine-email.ts";
import { FacebookSignInFSMContext } from "./state-machine-facebook.ts";
import { StateToSVGMapperServiceEmail } from "./state-to-svg-mapper-service-email.ts";
import { StateToSVGMapperServiceFacebook } from "./state-to-svg-mapper-service-facebook.ts";
import { SVGFlowChartServiceEmail } from "./svg-flowchart-service-email.ts";
import { SVGFlowChartServiceFacebook } from "./svg-flowchart-service-facebook.ts";
import { SVGStateStatus } from "./svg-flowchart-service.ts";
import { debounce, getEnv, onReady } from "./utils.ts";

export type TGUIStateDTO = {
    inputEmailValue?: string;
    inputPasswordValue?: string;
    isEmailLoginClicked?: boolean;
    isFacebookLoginClicked?: boolean;
};

const htmlTemplateManager = new HTMLTemplateManager(document);

const guiLogger = new GUILogger({
    _window: window,
    htmlTemplateManager,
    cleaLogStreamButtonCSS: "button#clearLogstream",
    logContainerCSS: "#windowLogContainer",
    logItemCSS: "#windowLogItem",
})
    .initEvents()
    .initGUIFromLocalStorage();

const firebaseAuthService = new FirebaseAuthService({
    window,
    env: getEnv(),
    logger: guiLogger.log.bind(guiLogger),
});

const emailFSMSVGService = new SVGFlowChartServiceEmail({
    document,
    svgQuerySelector: "#emailLinkFSMChart",
});

const facebookFSMSVGService = new SVGFlowChartServiceFacebook({
    document,
    svgQuerySelector: "#facebookFSMChart",
});

const stateToEmailSVGMapperService = new StateToSVGMapperServiceEmail({
    svgService: emailFSMSVGService,
    currentStateBoxCSSClassKey: null,
});

const emailSignInFSMContext = new EmailSignInFSMContext({
    window,
    firebaseAuthService,
    stateToSVGMapperService: stateToEmailSVGMapperService,
    logger: guiLogger.log.bind(guiLogger),
    callbackSetTab,
    callbackEnableLoginButton: callbackEnableLoginButtonEmail,
    callbackPopulateEmailInput,
    callbackEnableEmailInput,
    callbackEnablePasswordInput,
    callbackShowInstructionsToClickLinkInEmail,
    callbackShowInstructionsToReEnterEmail,
});

const stateToFacebookSVGMapperService = new StateToSVGMapperServiceFacebook({
    svgService: facebookFSMSVGService,
    currentStateBoxCSSClassKey: null,
});

const facebookSignInFSMContext = new FacebookSignInFSMContext({
    window,
    firebaseAuthService,
    stateToSVGMapperService: stateToFacebookSVGMapperService,
    logger: guiLogger.log.bind(guiLogger),
    callbackSetTab,
    callbackEnableLoginButton: callbackEnableLoginButtonFacebook,
});

const fsmCoordinator = new FSMCoordinator({
    firebaseAuthService,
    emailSignInFSMContext,
    facebookSignInFSMContext,
});
await fsmCoordinator.setup();

onReady(() => {
    const allTabs = document.querySelectorAll<HTMLAnchorElement>(".tabs a");
    allTabs.forEach((tab) =>
        tab.addEventListener("click", (e) => {
            e.preventDefault();
            activateTab(tab);
        }),
    );
    const defaultTab = authProviders.Email;
    clickTab(defaultTab);

    document
        .querySelector("button#clearCachedUser")
        ?.addEventListener("click", async () => {
            await fsmCoordinator.clearCachedUser();
        });

    document
        .querySelector<HTMLInputElement>("input.email")
        ?.addEventListener("input", onInputtingEmail);

    document
        .querySelector<HTMLInputElement>("input.password")
        ?.addEventListener("input", onInputtingPassword);

    document
        .querySelector<HTMLInputElement>(
            `button.login[data-service-provider` +
                `="${authProviderToGUINameMap[authProviders.Email]}"]`,
        )
        ?.addEventListener("click", onLoginClickEmail);

    document
        .querySelector<HTMLInputElement>(
            `button.login[data-service-provider` +
                `="${authProviderToGUINameMap[authProviders.Facebook]}"]`,
        )
        ?.addEventListener("click", onLoginClickFacebook);

    document
        .querySelector<HTMLInputElement>("button.logout")
        ?.addEventListener("click", async () => {
            fsmCoordinator.logout();
        });

    document
        .querySelector("button#enableAllSVGElements")
        ?.addEventListener("click", enableAllSVGElements);
});

// callback functions

function clickTab(authProvider: TAuthProvider) {
    const activeTab: HTMLAnchorElement =
        mapAuthProvider2NavTabElement(authProvider);

    activateTab(activeTab);
}

function activateTab(activeTab: HTMLAnchorElement) {
    const activePanelID = activeTab.dataset.tab!;

    const allTabs = document.querySelectorAll<HTMLAnchorElement>("nav.tabs a");
    allTabs.forEach((eachTab) => eachTab.classList.remove("active"));

    const allPanels = document.querySelectorAll<HTMLElement>(".tab-panel");
    allPanels.forEach((eachPanel) => eachPanel.classList.remove("active"));

    activeTab.classList.add("active");
    document.getElementById(activePanelID)?.classList.add("active");
}

function enableAllSVGElements(event_: Event) {
    const buttonEl = event_.target as HTMLButtonElement;
    let buttonState = buttonEl.dataset.state;
    switch (buttonState) {
        case "unset":
            emailFSMSVGService.SetAllIndividually(SVGStateStatus.Failure);
            facebookFSMSVGService.SetAllIndividually(SVGStateStatus.Failure);
            buttonEl.innerText = "disable all SVG elements";
            buttonEl.dataset.state = "set";
            break;
        case "set":
            emailFSMSVGService.UnsetAll();
            facebookFSMSVGService.UnsetAll();
            buttonEl.innerText = "enable all SVG elements";
            buttonEl.dataset.state = "unset";
            break;
    }
}

function callbackPopulateEmailInput(emailAddress: string | null): void {
    const emailInput = document.querySelector(
        "input.email",
    ) as HTMLInputElement;
    if (emailInput == null || emailAddress == null) {
        return;
    }
    emailInput.value = emailAddress;
}

// single function for simplicity
// note: typing in one field resets the debounce for the other
const debouncedEmailSignInFSMContextHandler = debounce(
    (emailStateDTO: TEmailStateDTO) => {
        emailSignInFSMContext.handle(emailStateDTO);
    },
    500,
);

function onInputtingEmail(e: Event): void {
    const inputEl = e.currentTarget as HTMLInputElement;
    const inputEmailValue: string = inputEl.value;
    debouncedEmailSignInFSMContextHandler.call({ inputEmailValue });
}

function onInputtingPassword(e: Event): void {
    const inputEl = e.currentTarget as HTMLInputElement;
    const inputPasswordValue: string = inputEl.value;
    debouncedEmailSignInFSMContextHandler.call({ inputPasswordValue });
}

async function onLoginClickEmail(e: Event): Promise<void> {
    clickTab(authProviders.Email);
    const inputEmailValue: string =
        document.querySelector<HTMLInputElement>("input.email")!.value;

    const inputPasswordValue: string =
        document.querySelector<HTMLInputElement>("input.password")!.value;

    debouncedEmailSignInFSMContextHandler.flush({
        inputEmailValue,
        inputPasswordValue,
    });
    await fsmCoordinator.loginEmail();
}

async function onLoginClickFacebook(e: Event): Promise<void> {
    clickTab(authProviders.Facebook);
    await fsmCoordinator.loginFacebook();
}

function callbackSetTab(authProvider: TAuthProvider): void {
    clickTab(authProvider);
}

function callbackEnableLoginButtonEmail(enabled: boolean): void {
    const guiName = authProviderToGUINameMap[authProviders.Email];
    document.querySelector<HTMLInputElement>(
        `button.login[data-service-provider="${guiName}"]`,
    )!.disabled = !enabled;
}

function callbackEnableLoginButtonFacebook(enabled: boolean): void {
    const guiName = authProviderToGUINameMap[authProviders.Facebook];
    document.querySelector<HTMLInputElement>(
        `button.login[data-service-provider="${guiName}"]`,
    )!.disabled = !enabled;
}

function callbackEnableEmailInput(enabled: boolean): void {
    document.querySelector<HTMLInputElement>("input.email")!.disabled =
        !enabled;
}

function callbackEnablePasswordInput(enabled: boolean): void {
    document.querySelector<HTMLInputElement>("input.password")!.disabled =
        !enabled;
}

function callbackShowInstructionsToReEnterEmail(enabled: boolean): void {
    document.querySelector<HTMLInputElement>(
        ".instructions-re-enter-email",
    )!.style.display = enabled ? "block" : "none";
}

function callbackShowInstructionsToClickLinkInEmail(enabled: boolean): void {
    document.querySelector<HTMLInputElement>(
        ".instructions-click-link-in-email",
    )!.style.display = enabled ? "block" : "none";
}
