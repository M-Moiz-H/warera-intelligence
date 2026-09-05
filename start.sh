#!/bin/sh
set -e

echo "Registering WarEra Intelligence slash commands..."
node dist/scripts/deploy-commands.js

echo "Starting WarEra Intelligence..."
exec node dist/index.js