#!/bin/bash

# Load the .env file
set -a
source .env
set +a

# Use the key in the curl command
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY_GEMINI}" \
-H 'Content-Type: application/json' \
-X POST \
-d '{
  "contents": [{
    "parts":[{"text": "say hello"}]
    }]
   }'
