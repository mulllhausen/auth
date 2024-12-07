Browsers block third party storage access so all of the files under `__/` must
be hosted on the same domain as the app. I.e. `PROJECT_DOMAIN` and
`FIREBASE_AUTH_DOMAIN` must be on the same domain. If you don't do this then you
will get errors.

You can fix this in a few different ways as detailed in
[the firebase docs](https://firebase.google.com/docs/auth/web/redirect-best-practices).

While running in a development server it is most convenient to host these files
yourself - option 4 in
[the firebase docs](https://firebase.google.com/docs/auth/web/redirect-best-practices#self-host-helper-code).

Unfortunately this does not work for Apple or SAML sign-in apparently.
