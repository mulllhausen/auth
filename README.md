# Firebase Auth

Sign up for [Google Firebase](https://console.firebase.google.com). When you
create an app in firebase, a corresponding app will appear in
[Google Cloud Console](https://console.cloud.google.com). Go to
`APIs & Services` > `Credentials` > `OAuth 2.0 Client IDs`, click
`Web client (auto created by Google Service)` and add
`https://PROJECT_DOMAIN/__/auth/handler` to the _Authorized redirect URIs_.

For local debugging, use [ngrok](https://ngrok.com). The flow is:

1. Start server on localhost with vite (`npm run dev`)
1. Start ngrok in a new terminal session (`npm run ngrok`)
1. In your browser, go to ngrok URL `PROJECT_DOMAIN/firebase-wrapper/dist/` (see
   `.env.development`)
1. Click one of the login buttons
1. The firebase wrapper service calls the firebase SDK
1. The firebase SDK redirects to
   `FIREBASE_AUTH_DOMAIN/__/auth/handler?apiKey=xxx&appName=[DEFAULT]&authType=signInViaRedirect&redirectUrl=PROJECT_DOMAIN/firebase-wrapper/dist/&v=11.0.2&providerId=google.com&customParameters={"redirect_uri":"/firebase-wrapper/dist/"}&scopes=profile`
1. Google's firebase server redirects to an oauth service provider (eg.
   facebook)
1. Enter username and password unless already logged in
1. Allow this app to access your service provider details (eg. your profile
   picture)
1. The service provider redirects back to
   `FIREBASE_AUTH_DOMAIN/__/auth/handler?...`
1. Google's firebase server redirects back to
   `PROJECT_DOMAIN/firebase-wrapper/dist/`

## Setting up ngrok

ngrok can be set up to always use the same domain. If you don't do this then
every time you start ngrok you will have a new domain and will need to update
`.env.development`.

On Windows:

1. Sign up for ngrok
1. Go to `Universal Gateway` > `Edges` > click `New Edge`
1. Download a [config](https://ngrok.com/docs/agent/config/) file:
    1. Click `Start a Tunnel`
    1. Click `Start a tunnel from a config file`
    1. Copy-paste the yml into `%HOMEPATH%\AppData\Local\ngrok\ngrok.yml`
    1. Populate `.env.development` with matching variables for the yml file as
       per [these instructions](/firebase-wrapper/docs/ngrok.example.yml).
