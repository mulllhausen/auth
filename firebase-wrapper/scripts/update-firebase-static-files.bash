#!/bin/bash

# see __/firebase/README.md for more information

present_filename_absolute=$(realpath "$0")
present_file_path_absolute=$(dirname "$present_filename_absolute")

api_key="$("$present_file_path_absolute"/get-1-env.sh FIREBASE_API_KEY)"
auth_domain="$("$present_file_path_absolute"/get-1-env.sh FIREBASE_AUTH_DOMAIN)"

firebase_init_json=$(
    cat <<EOF
{
    "apiKey": "$api_key",
    "authDomain": "$auth_domain"
}
EOF
)

echo "$firebase_init_json" >"$present_file_path_absolute/__/firebase/init.json"
