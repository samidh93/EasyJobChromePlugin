#!/bin/bash

# Setup Ollama Auto-Start Script
# This script creates a launchd configuration for automatic startup

PLIST_FILE="$HOME/Library/LaunchAgents/com.ollama.autostart.plist"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/start-ollama-service.sh"

echo "🔧 Setting up Ollama auto-start..."

# Create the launchd plist file
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.autostart</string>
    <key>Program</key>
    <string>$SCRIPT_PATH</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT_PATH</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama-autostart.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama-autostart.err</string>
</dict>
</plist>
EOF

echo "✅ Created launchd configuration: $PLIST_FILE"

# Load the service
echo "🚀 Loading auto-start service..."
launchctl load "$PLIST_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Ollama auto-start service loaded successfully!"
    echo "🔄 Ollama will now start automatically on system boot"
    echo ""
    echo "To disable auto-start:"
    echo "  launchctl unload $PLIST_FILE"
    echo "  rm $PLIST_FILE"
else
    echo "❌ Failed to load auto-start service"
    echo "📝 Manual start is still available with: $SCRIPT_PATH start"
fi

echo ""
echo "🎯 Current status:"
$SCRIPT_PATH status 