#!/bin/bash

function localtunnel {
node_modules/.bin/lt --port 3000 --subdomain iqxbraintree
}

until localtunnel; do
echo "localtunnel server crashed"
sleep 2
done
