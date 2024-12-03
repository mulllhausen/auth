#!/bin/bash

absolute_filename=$(realpath $0)
present_file_path=$(dirname "$absolute_filename")
tunnel="$($present_file_path/get-1-env.sh NGROK_DEV_TUNNEL_NAME)"
echo "Starting ngrok tunnel: $tunnel"
ngrok start $tunnel