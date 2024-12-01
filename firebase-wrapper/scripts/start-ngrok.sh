#!/bin/bash

tunnel=$(grep 'NGROK_DEV_TUNNEL_NAME[[:space:]]*=[[:space:]]*' .env.development | cut -d'=' -f2 | xargs)
ngrok start $tunnel