#!/usr/bin/env bash

API_URL="http://localhost:5173/api/sessions"

TITLES=(
  "Just this one"
)

DIRECTORY="C:/Users/Steven/downloads/aero favicon"

for i in $(seq 1 1000); do
  TITLE="${TITLES[$RANDOM % ${#TITLES[@]}]} #$i"

  echo "=== Creating session $i: $TITLE ==="

  TMP_BODY=$(mktemp)

  HTTP_STATUS=$(curl --noproxy localhost -s -o "$TMP_BODY" -w "%{http_code}" -X POST \
    "${API_URL}" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"${TITLE}\",
      \"directory\": \"${DIRECTORY}\",
      \"parts\": [
        {
          \"type\": \"text\",
          \"text\": \"Initial prompt for ${TITLE}\"
        }
      ]
    }")

  echo "Status: $HTTP_STATUS"
  echo "Response:"

  if command -v jq &> /dev/null; then
    jq . "$TMP_BODY"
  else
    cat "$TMP_BODY"
  fi

  rm -f "$TMP_BODY"

  echo -e "\n-----------------------------------\n"
done

echo "Done."