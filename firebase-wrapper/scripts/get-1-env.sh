#!/bin/bash

env_name="$1"

# throw an error if no environment variable was specified
if [[ "$env_name" == "" ]]; then
  echo "Usage: $0 <environment variable>"
  exit 1
fi

absolute_filename=$(realpath $0)
present_file_path=$(dirname "$absolute_filename")
env_files=("$present_file_path/../.env.development" "$present_file_path/../.env")

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
  if [[ ! -f "$env_file" ]]; then
    continue
  fi

  # note: use xargs trims whitespace
  env_value="$(grep "$env_name[[:space:]]*=[[:space:]]*" "$env_file" | cut -d'=' -f2 | xargs)"

  if [[ "$env_value" == "" ]]; then
    continue
  fi

  # doesn't seem to be necessary
  # echo "$(remove_double_quotes "$env_value")"
  echo "$env_value"
  exit 0
done

echo "Environment variable \"$env_name\" not found in .env.development or .env"
exit 1