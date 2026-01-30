#!/bin/bash

# see __/firebase/README.md for more information

environment="$1"

if [[ "$environment" != "development" && "$environment" != "prod" ]]; then
    echo "Usage: $0 <dev|prod>" >&2
    exit 1
fi

present_filename_absolute=$(realpath "$0")
present_file_path_absolute=$(dirname "$present_filename_absolute")

rel_base_path="$("$present_file_path_absolute"/get-1-env.bash FIREBASE_STATIC_FILES_PATH "$environment")"
abs_base_path=$(realpath "$present_file_path_absolute/../../$rel_base_path")

api_key="$("$present_file_path_absolute"/get-1-env.bash FIREBASE_API_KEY "$environment")"
auth_domain="$("$present_file_path_absolute"/get-1-env.bash FIREBASE_AUTH_DOMAIN "$environment")"

firebase_init_json=$(
    cat <<EOF
{
    "apiKey": "$api_key",
    "authDomain": "$auth_domain"
}
EOF
)

abs_output_file="$abs_base_path/__/firebase/init.json"
mkdir -p "$(dirname "$abs_output_file")"
echo "$firebase_init_json" >"$abs_output_file"
echo "successfully updated $abs_output_file with $firebase_init_json"
