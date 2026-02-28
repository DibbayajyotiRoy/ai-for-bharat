#!/bin/bash
# ─── Learning Copilot: WhatsApp Bot Setup ─────────────────────────────────────
# Sets up Twilio WhatsApp Sandbox for the Learning Copilot bot.
#
# Prerequisites:
#   - Twilio account (free tier works for sandbox)
#   - Twilio CLI or dashboard access
#
# Cost: FREE (Twilio WhatsApp Sandbox is free for development)
# ──────────────────────────────────────────────────────────────────────────────

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Learning Copilot — WhatsApp Bot Setup               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check for required env vars
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo "⚠️  Twilio credentials not found in environment."
    echo ""
    echo "📋 Setup Instructions:"
    echo ""
    echo "1. Sign up at https://www.twilio.com (free trial)"
    echo ""
    echo "2. Go to Console → Messaging → Try it out → Send a WhatsApp Message"
    echo "   This activates the WhatsApp Sandbox."
    echo ""
    echo "3. Join the sandbox by sending the code to Twilio's WhatsApp number"
    echo "   (shown on the sandbox page)"
    echo ""
    echo "4. Add to your .env file:"
    echo "   TWILIO_ACCOUNT_SID=your_account_sid"
    echo "   TWILIO_AUTH_TOKEN=your_auth_token"
    echo "   TWILIO_WHATSAPP_NUMBER=+14155238886"
    echo ""
    echo "5. Set webhook URL in Twilio Console → Messaging → Settings → WhatsApp Sandbox:"
    echo "   When a message comes in: https://your-domain.com/api/whatsapp"
    echo "   Method: POST"
    echo ""
    echo "💡 For production, apply for a WhatsApp Business Profile via Twilio."
    exit 0
fi

echo "✅ Twilio credentials found!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Deploy your app (e.g., to Vercel)"
echo ""
echo "2. Set webhook URL in Twilio Console:"
echo "   Messaging → Settings → WhatsApp Sandbox → When a message comes in"
echo "   URL: https://your-domain.com/api/whatsapp"
echo "   Method: POST"
echo ""
echo "3. Test by sending a message to your Twilio WhatsApp number"
echo ""
echo "✅ WhatsApp bot configuration complete!"
