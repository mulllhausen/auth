# Firebase Auth

Sign up for [Google Firebase](https://console.firebase.google.com).

For local debugging, use [ngrok](https://ngrok.com).

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
