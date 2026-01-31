#!/bin/bash

# obviously, the firebase project must exist before running this script
# otherwise the download files will not be found

environment="$1"

if [[ "$environment" != "dev" && "$environment" != "prod" ]]; then
    echo "❌ usage: $0 <dev|prod>" >&2
    exit 1
fi

present_filename_absolute=$(realpath "$0")
present_file_path_absolute=$(dirname "$present_filename_absolute")

rel_base_path="$(
    "$present_file_path_absolute"/get-1-env.bash \
    FIREBASE_STATIC_FILES_PATH \
    "$environment"
)"
abs_base_path="$(
    realpath "$present_file_path_absolute/../../$rel_base_path"
)"

if [[ ! -x "$(command -v wget)" ]]; then
    echo "❌ error: wget is not installed" >&2
    exit 1
fi

app_id="$(
    "$present_file_path_absolute"/get-1-env.bash \
    FIREBASE_PROJECT_ID \
    "$environment"
)"

schema_and_domain="https://$app_id.firebaseapp.com"
url_paths=(
    "__/auth/handler"
    "__/auth/handler.js"
    "__/auth/experiments.js"
    "__/auth/iframe"
    "__/auth/iframe.js"
)
total_num_files=${#url_paths[@]}

file_i=1
for url_path in "${url_paths[@]}"; do
    mkdir -p "$abs_base_path/$(dirname "$url_path")"
    echo "💾 downloading file $file_i/$total_num_files"
    echo
    wget "$schema_and_domain/$url_path" -O "$abs_base_path/$url_path"
    file_i=$((file_i + 1))
done
echo "🏁 🏁 🏁 🏁 🏁"