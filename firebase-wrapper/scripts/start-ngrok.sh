#!/bin/bash

tunnel="$(./get-1-env.sh NGROK_DEV_TUNNEL_NAME)"
ngrok start $tunnel