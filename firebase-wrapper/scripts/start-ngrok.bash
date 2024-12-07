#!/bin/bash

present_filename_absolute=$(realpath $0)
present_file_path_absolute=$(dirname "$present_filename_absolute")
tunnel="$($present_file_path_absolute/get-1-env.bash NGROK_DEV_TUNNEL_NAME dev)"
echo "Starting ngrok tunnel: $tunnel"
ngrok start $tunnel
