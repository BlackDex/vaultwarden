#!/bin/sh
set -e
CERTS=/certs

[ -f "${CERTS}/ca.crt" ] && echo "Certs already exist." && exit 0

# Generate CA
openssl genrsa -out "${CERTS}/ca.key" 4096
openssl req -new -x509 -days 3650 \
  -key "${CERTS}/ca.key" \
  -subj "/CN=Docker Test CA/O=Test" \
  -out "${CERTS}/ca.crt"

# Write SAN config — covers all internal Docker hostnames
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
DNS.2 = vaultwarden
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

chmod 644 "${CERTS}"/*.crt
chmod 600 "${CERTS}"/*.key
echo "Certificates generated successfully."
