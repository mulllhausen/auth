#!/bin/bash

# see __/firebase/README.md for more information

environment="$1"

if [[ "$environment" != "dev" && "$environment" != "prod" ]]; then
    echo "Usage: $0 <dev|prod>"
    exit 1
fi

present_filename_absolute=$(realpath "$0")
present_file_path_absolute=$(dirname "$present_filename_absolute")

api_key="$("$present_file_path_absolute"/get-1-env.bash FIREBASE_API_KEY prod "$environment")"
auth_domain="$("$present_file_path_absolute"/get-1-env.bash FIREBASE_AUTH_DOMAIN "$environment")"

firebase_init_json=$(
    cat <<EOF
{
    "apiKey": "$api_key",
    "authDomain": "$auth_domain"
}
EOF
)

echo "$firebase_init_json" >"$present_file_path_absolute/../__/firebase/init.json"

echo "successfully updated $present_file_path_absolute/../__/firebase/init.json"
