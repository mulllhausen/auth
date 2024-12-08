# Firebase Auth

## Signing up

Sign up for [Google Firebase](https://console.firebase.google.com). When you
create an app in firebase, a corresponding app will appear in
[Google Cloud Console](https://console.cloud.google.com). Go to
`APIs & Services` > `Credentials` > `OAuth 2.0 Client IDs`, click
`Web client (auto created by Google Service)` and add
`https://PROJECT_DOMAIN/__/auth/handler` to the _Authorized redirect URIs_.

## Debugging

Local debugging uses [ngrok](https://ngrok.com) and vite. Open a bash terminal
and run

```bash
    $ cd firebase-wrapper
    $ npm run dev
    $ # press F5 a couple of times
```

Open another terminal and run

```bash
    $ cd firebase-wrapper
    $ npm run ngrok
```

The flow is:

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

## notes

### 3rd party storage issues

Browsers block third party storage access so all of the files under `__/` must
be hosted on the same domain as the app. I.e. `PROJECT_DOMAIN` and
`FIREBASE_AUTH_DOMAIN` (as defined in the `.env` files) must be on the same
domain. If you don't do this then you be unable to get the user object from
firebase.

You can fix this in a few different ways as detailed in
[the firebase docs](https://firebase.google.com/docs/auth/web/redirect-best-practices).

While running in a development server it is most convenient to host these files
yourself -
[option 4 in the firebase docs](https://firebase.google.com/docs/auth/web/redirect-best-practices#self-host-helper-code).

But unfortunately this does not work for Apple or SAML sign-in.

### `__/firebase/init.json`

The firebase SDK makes calls to
`https://myapp.firebaseapp.com/__/firebase/init.json`. However this file is
[deprecated for firebase SDK version 9 and above](https://stackoverflow.com/questions/78163133).
This means we cannot download it and host it ourselves:

```bash
$ wget https://myapp.firebaseapp.com/__/firebase/init.json --2024-12-07
19:34:19-- https://myapp.firebaseapp.com/__/firebase/init.json Resolving
myapp.firebaseapp.com (myapp.firebaseapp.com)... 199.36.158.100
Connecting to myapp.firebaseapp.com
(myapp.firebaseapp.com)|199.36.158.100|:443... connected. HTTP request
sent, awaiting response... 404 Not Found 2024-12-07 19:34:20 ERROR 404: Not
Found.
```

However you can just create the `__/firebase/init.json` file yourself:

```json
{
    "apiKey": "AIz...",
    "authDomain": "your.authdomain.com"
}
```

`scripts/update-firebase-static-files.bash` generates this file. Run it from
`package.json`.
