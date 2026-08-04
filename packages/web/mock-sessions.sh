#!/usr/bin/env bash

API_URL="http://localhost:3000/api/sessions"

TITLES=(
  "Just this one"
)

for i in $(seq 1 2); do
  TITLE="${TITLES[$RANDOM % ${#TITLES[@]}]} #$i"

  curl --noproxy localhost -s -X POST \
    "${API_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${TITLE}\"}" \
    > /dev/null

  echo "Created session $i: $TITLE"
done

echo "Done. Created 100 sessions."