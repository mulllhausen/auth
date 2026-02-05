#!/bin/bash

present_filename_absolute=$(realpath $0)
present_file_path_absolute=$(dirname "$present_filename_absolute")
echo "Starting ngrok tunnel: firebase-test"
ngrok start --config=../ngrok.secret.yml firebase-test
