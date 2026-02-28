#!/bin/bash
# ─── Learning Copilot: Telegram Bot Setup ─────────────────────────────────────
# Creates and configures a Telegram bot for Learning Copilot.
#
# Prerequisites:
#   - Telegram account
#   - curl installed
#
# Cost: FREE (Telegram Bot API is completely free)
# ──────────────────────────────────────────────────────────────────────────────

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Learning Copilot — Telegram Bot Setup               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  TELEGRAM_BOT_TOKEN not found in environment."
    echo ""
    echo "📋 Setup Instructions:"
    echo ""
    echo "1. Open Telegram and message @BotFather"
    echo ""
    echo "2. Send /newbot"
    echo "   - Name: Learning Copilot"
    echo "   - Username: learning_copilot_bot (must end in 'bot')"
    echo ""
    echo "3. BotFather will give you a token like:"
    echo "   123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
    echo ""
    echo "4. Add to your .env file:"
    echo "   TELEGRAM_BOT_TOKEN=your_bot_token"
    echo ""
    echo "5. Run this script again to register the webhook."
    exit 0
fi

echo "✅ Telegram bot token found!"
echo ""

# Ask for webhook URL
if [ -z "$1" ]; then
    echo "Usage: $0 <webhook-base-url>"
    echo "Example: $0 https://your-domain.com"
    echo ""
    echo "The webhook will be registered at: <url>/api/telegram"
    exit 1
fi

WEBHOOK_URL="$1/api/telegram"

echo "🔗 Registering webhook: $WEBHOOK_URL"
echo ""

# Register webhook
RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}")

echo "Response: $RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook registered successfully!"
    echo ""
    echo "📋 Bot Commands (optional — send to @BotFather):"
    echo "   /setcommands"
    echo "   explain - Explain a concept or code"
    echo "   level - Set difficulty (Beginner/Intermediate/Advanced)"
    echo "   help - Show available commands"
    echo ""
    echo "🎉 Your Telegram bot is ready! Search for it on Telegram and start chatting."
else
    echo "❌ Webhook registration failed. Check your bot token."
fi
