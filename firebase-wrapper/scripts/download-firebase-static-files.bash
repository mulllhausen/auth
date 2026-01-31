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
num_successful_downloads=0
for url_path in "${url_paths[@]}"; do
    mkdir -p "$abs_base_path/$(dirname "$url_path")"
    echo "💾 downloading file $file_i/$total_num_files"
    echo
    if wget "$schema_and_domain/$url_path" -O "$abs_base_path/$url_path"; then
        num_successful_downloads=$((num_successful_downloads + 1))
    else
        echo "❌ failed download: $schema_and_domain/$url_path"
        echo
    fi
    file_i=$((file_i + 1))
done

echo "🏁 🏁 🏁 🏁 🏁 end of file downloads"
if [[ $num_successful_downloads -ne $total_num_files ]]; then
    error_message="❌ only $num_successful_downloads of $total_num_files"
    error_message="$error_message files were downloaded successfully"
    echo "$error_message" >&2
    exit 1
else
    echo "✅ successfully downloaded all $total_num_files files"
fi