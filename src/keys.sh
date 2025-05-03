openssl genrsa -out ssl-key.pem 2048
openssl req -new -x509 -sha256 -key ssl-key.pem -out ssl.pem -days 365
