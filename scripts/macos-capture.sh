#!/bin/bash

# Configuration
# Replace these with your actual values or set them as environment variables
API_URL="${LEO_API_URL:-https://leo-brain.vercel.app}"
AUTH_TOKEN="${LEO_EXTENSION_TOKEN:-YOUR_EXTENSION_TOKEN_HERE}"

# Get input from stdin (standard input)
CONTENT=$(cat)

# Validation
if [ -z "$CONTENT" ]; then
  osascript -e 'display notification "No content selected" with title "Leo Capture Failed"'
  exit 1
fi

if [ "$AUTH_TOKEN" == "YOUR_EXTENSION_TOKEN_HERE" ]; then
  osascript -e 'display notification "Auth token not configured" with title "Leo Capture Failed"'
  exit 1
fi

# Escape content for JSON (basic escaping)
# Using python for reliable JSON escaping if available, or simple sed
JSON_CONTENT=$(python3 -c "import json, sys; print(json.dumps(sys.stdin.read().strip()))" <<< "$CONTENT")

# Construct JSON payload
# Payload matches CapturePayload in src/app/api/capture/route.ts
PAYLOAD="{\"type\": \"selection\", \"content\": $JSON_CONTENT, \"url\": \"\", \"title\": \"System Capture\", \"timestamp\": $(date +%s%3N), \"source\": \"macos-system\", \"device\": \"mac\"}"

# Send Request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/capture" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$PAYLOAD")

# Parse Response
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" -eq 200 ]; then
  osascript -e 'display notification "Content saved to Leo" with title "Leo Captured"'
else
  osascript -e "display notification \"Failed to save: HTTP $HTTP_STATUS\" with title \"Leo Capture Failed\""
  echo "Error: $HTTP_BODY"
  exit 1
fi
