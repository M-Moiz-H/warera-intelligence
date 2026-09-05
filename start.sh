#!/bin/sh
set -e

echo "⚔️ Registering slash commands..."
node dist/scripts/deploy-commands.js

echo "🤖 Starting bot..."
exec node dist/index.js