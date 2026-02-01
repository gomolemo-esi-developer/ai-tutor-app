#!/bin/bash

# Script to clear all chat sessions and messages
# Usage: ./scripts/clear-chats.sh

echo "🔄 Clearing all chats and messages..."
echo ""
echo "⚠️  WARNING: This will delete ALL chat data!"
echo ""
read -p "Type 'DELETE ALL CHATS' to confirm: " confirm

if [ "$confirm" != "DELETE ALL CHATS" ]; then
    echo "❌ Cancelled."
    exit 1
fi

export CONFIRM_DELETE=true
cd "$(dirname "$0")/.."
npx ts-node scripts/clear-all-chats.ts
