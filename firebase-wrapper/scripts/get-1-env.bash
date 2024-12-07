#!/bin/bash

environment_variable_name="$1"

if [[ -z "$environment_variable_name" ]]; then
    echo "Usage: $0 <environment variable> <dev|prod>"
    exit 1
fi

environment="$2"

if [[ "$environment" != "dev" && "$environment" != "prod" ]]; then
    echo "Usage: $0 <environment variable> <dev|prod>"
    exit 1
fi

# throw an error if no environment variable was specified
if [[ "$environment_variable_name" == "" ]]; then
    echo "Usage: $0 <environment variable>"
    exit 1
fi

absolute_filename=$(realpath "$0")
present_file_path=$(dirname "$absolute_filename")

if [[ "$environment" == "dev" ]]; then
    env_files=(".env.development" ".env")
elif [[ "$environment" == "prod" ]]; then
    env_files=(".env")
fi

function remove_double_quotes() {
    # if the first character is not a double quote
    if [[ ${1:0:1} != '"' ]]; then
        # then there is no need for this function - just return the original string
        echo "$1"
        return
    fi
    # removes leading and trailing double quotes from string
    echo "$1" | sed 's/^"\(.*\)"$/\1/'
}

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

    # doesn't seem to be necessary
    # echo "$(remove_double_quotes "$env_value")"
    echo "$env_value"
    exit 0
done

env_files_string="${env_files[*]}"
echo "Environment variable \"$environment_variable_name\" not found in ${env_files_string// / or }"
exit 1
