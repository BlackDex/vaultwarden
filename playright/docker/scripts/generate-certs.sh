#!/bin/sh
set -e
CERTS=/certs

if [ ! -c "${CERTS}/ca-override.crt" ] && [ ! -c "${CERTS}/ca-override.key" ]; then
  echo "CA Overrides provided"
  ln -sfn "${CERTS}/ca-override.crt" "${CERTS}/ca.crt"
  ln -sfn "${CERTS}/ca-override.key" "${CERTS}/ca.key"
else
  [ "$(readlink "${CERTS}/ca.crt")" = "${CERTS}/ca-override.crt" ] && unlink "${CERTS}/ca.crt"
  [ "$(readlink "${CERTS}/ca.key")" = "${CERTS}/ca-override.key" ] && unlink "${CERTS}/ca.key"
fi

# Check if server.crt already exists, if so assume certificates are already generated
# If these certificates need to be regenerated, delete the volume
if sha256sum -s -c "${CERTS}/ca.sha256" && [ -f "${CERTS}/server.crt" ]; then
  echo "CA has not changed and certs already exist."
  exit 0
fi

# Check if there is a custom ca file provided
# This could be used if the user already has a trusted self-signed CA for other purposes

# Generate CA if needed
if [ -c "${CERTS}/ca-override.crt" ] || [ -c "${CERTS}/ca-override.key" ]; then
  openssl genrsa -out "${CERTS}/ca-self-signed.key" 4096
  openssl req -new -x509 -days 3650 \
    -key "${CERTS}/ca-self-signed.key" \
    -subj "/CN=Docker Test CA/O=Test" \
    -out "${CERTS}/ca-self-signed.crt"

  ln -sfn "${CERTS}/ca-self-signed.crt" "${CERTS}/ca.crt"
  ln -sfn "${CERTS}/ca-self-signed.key" "${CERTS}/ca.key"
fi

# Create a sha256 checksum of the current active CA files
# This will change if overrides are provided or not.
sha256sum "${CERTS}/ca.key" "${CERTS}/ca.crt" > "${CERTS}/ca.sha256"

# Write SAN config — covers all internal Docker hostname's
cat > /tmp/san.cnf << EOF
[req]
distinguished_name = dn
req_extensions     = v3_req
prompt             = no

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt

[alt]
DNS.1 = localhost
DNS.2 = playwright
DNS.3 = vaultwarden
DNS.4 = mysql
DNS.5 = mariadb
DNS.6 = postgresql
DNS.7 = dex
IP.1  = 127.0.0.1
EOF

# Generate server cert signed by the CA
openssl genrsa -out "${CERTS}/server.key" 4096
openssl req -new -key "${CERTS}/server.key" -out /tmp/server.csr -config /tmp/san.cnf
openssl x509 -req -days 365 \
  -in /tmp/server.csr \
  -CA "${CERTS}/ca.crt" -CAkey "${CERTS}/ca.key" -CAcreateserial \
  -out "${CERTS}/server.crt" \
  -extensions v3_req -extfile /tmp/san.cnf

chmod 644 "${CERTS}"/*.crt || true
chmod 600 "${CERTS}"/*.key || true
echo "Certificates generated successfully."
