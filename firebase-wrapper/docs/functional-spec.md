# functional spec

1. initialise FirebaseAuthService and get the object.
2. initialise each FSM SVG flowchart and get the object for each one.✅
3. initialise all of the finite state machines: EmailSignInFSM, FBSignInFSM,
   GoogleSignInFSM.
    - pass the FirebaseAuthService object into each one. they will need this to
      be able to control state transitions.
    - pass the FSM SVG flowchart object relevant to each FSM to its state
      machine class. this object is used to update the SVG.
4. the state machines subscribe to change-of-state events from
   FirebaseAuthService and other sources (button clicks, form submissions). note
   that these events just contain data, not instructions. FSMs only subscribe to
   events that are relevant to them.
5. as the user interacts with the gui they trigger various event emitters. these
   events are caught by the relevant FSMs (1 event could be caught by more than
   1 FSM).
6. when the state machine context class is triggered by an event it passes the
   event to the active state class handle() method, which uses:
    - its current state (class)
    - the type of the event
    - the data accompanying the event to:
    1. figure out if a transition to a new state is necessary. if not then just
       exit.
    2. figure out what the next state is.
    3. call the context class transition() method to action the transition to
       the next state
7. when the context class transition() method is called, it:
    1. runs the onExit() method for the old (current) state
    2. initialises the new state class
    3. runs the onEnter() method for the new state class
8. a state class's onEnter() method:
    1. sets all state boxes in the SVG to inactive (clear color)
    2. sets all transition arrows in the SVG to inactive (black color)
    3. sets the state box corresponding to its own class in the SVG to active
       (blue)
    4. sets the transition path from the previous state to the current state to
       active (green if the transition is a happy path or red if it is an
       unhappy path)
    5. calls any FirebaseAuthService methods

### notes

always trigger an event at the start of each call to firebase so we can update
the transition to in-progress note: it should not be possible for a failure to
result in the same state. if this appears to be happening then we need to
introduce a new state to capture the failure Formal principle (from automata
theory, CS foundations) A “missing state” is always indicated when:

- transitions are non-deterministic
- you need to guess the next state
- you have to correct or undo a transition
- you can’t describe the system at a moment in time
- Introducing a new state resolves the non-determinism.
