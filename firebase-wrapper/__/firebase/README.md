It appears that file `https://myapp.firebaseapp.com/__/firebase/init.json` is
[deprecated for firebase SDK version 9 and above](https://stackoverflow.com/questions/78163133/unable-to-download-firebase-init-json-for-self-hosting-the-sign-in-helper-code).
Even though firebase attempts to make calls to it:

```bash
$ wget https://myapp.firebaseapp.com/__/firebase/init.json --2024-12-07
19:34:19-- https://myapp.firebaseapp.com/__/firebase/init.json Resolving
myapp.firebaseapp.com (myapp.firebaseapp.com)... 199.36.158.100
Connecting to myapp.firebaseapp.com
(myapp.firebaseapp.com)|199.36.158.100|:443... connected. HTTP request
sent, awaiting response... 404 Not Found 2024-12-07 19:34:20 ERROR 404: Not
Found.
```

You can create the `__/firebase/init.json` file yourself:

```json
{
    "apiKey": "AIz...",
    "authDomain": "your.authdomain.com"
}
```

`scripts/update-firebase-static-files.bash` generates this file. Run it from
`package.json`.
