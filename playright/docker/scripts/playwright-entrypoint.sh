#!/usr/bin/env bash
set -e

# Install shared CA cert so all browsers and Node trust it
if [ -f /certs/ca.crt ]; then
  cp /certs/ca.crt /usr/local/share/ca-certificates/docker-test-ca.crt
  update-ca-certificates --fresh
fi

exec "$@"
