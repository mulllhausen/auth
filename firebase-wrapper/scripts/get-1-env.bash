#!/bin/bash

environment_variable_name="$1"

if [[ -z "$environment_variable_name" ]]; then
    echo "Usage: $0 <environment variable> <dev|prod>" >&2
    exit 1
fi

environment="$2"

if [[ "$environment" != "dev" && "$environment" != "prod" ]]; then
    echo "Usage: $0 <environment variable> <dev|prod>" >&2
    exit 1
fi

absolute_filename=$(realpath "$0")
present_file_path=$(dirname "$absolute_filename")

if [[ "$environment" == "dev" ]]; then
    env_files=(".env.development" ".env")
elif [[ "$environment" == "prod" ]]; then
    env_files=(".env")
fi

for env_file in "${env_files[@]}"; do
    env_file="$present_file_path/../$env_file"
    if [[ ! -f "$env_file" ]]; then
        continue
    fi

    # note: use xargs trims whitespace
    env_value="$(grep "${environment_variable_name}[[:space:]]*=[[:space:]]*" "$env_file" | cut -d'=' -f2 | xargs)"

    if [[ "$env_value" == "" ]]; then
        continue
    fi

    echo "$env_value"
    exit 0
done

env_files_string="${env_files[*]}"
echo "Environment variable \"$environment_variable_name\" not found in ${env_files_string// / or }" >&2
exit 1
