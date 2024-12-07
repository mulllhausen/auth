#!/bin/bash

# obviously, the firebase project must exist before running this script
# otherwise the download files will not be found

present_filename_absolute=$(realpath "$0")
present_file_path_absolute=$(dirname "$present_filename_absolute")

if [[ ! -x "$(command -v wget)" ]]; then
    echo "Error: wget is not installed" >&2
    exit 1
fi

app_id="$("$present_file_path_absolute"/get-1-env.sh FIREBASE_PROJECT_ID)"
if [[ -z "$app_id" ]]; then
    echo "Error: Failed to retrieve Firebase project ID." >&2
    exit 1
fi

schema_and_domain="https://$app_id.firebaseapp.com"
url_paths=(
    "__/auth/handler"
    "__/auth/handler.js"
    "__/auth/experiments.js"
    "__/auth/iframe"
    "__/auth/iframe.js"
)

for url_path in "${url_paths[@]}"; do
    echo "downloading: $schema_and_domain/$url_path -> $present_file_path_absolute/../$url_path"
    wget "$schema_and_domain/$url_path" -O "$present_file_path_absolute/../$url_path"
done
