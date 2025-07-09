#!/bin/bash

# Ollama Service Manager Script
# This script starts Ollama as a background service with Chrome extension support

OLLAMA_PID_FILE="/tmp/ollama.pid"
OLLAMA_LOG_FILE="/tmp/ollama.log"

start_ollama() {
    echo "🚀 Starting Ollama service..."
    
    # Check if already running
    if [ -f "$OLLAMA_PID_FILE" ] && kill -0 $(cat "$OLLAMA_PID_FILE") 2>/dev/null; then
        echo "✅ Ollama is already running (PID: $(cat $OLLAMA_PID_FILE))"
        return 0
    fi
    
    # Start Ollama with Chrome extension support
    OLLAMA_ORIGINS="chrome-extension://*" nohup ollama serve > "$OLLAMA_LOG_FILE" 2>&1 &
    OLLAMA_PID=$!
    
    echo $OLLAMA_PID > "$OLLAMA_PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if kill -0 $OLLAMA_PID 2>/dev/null; then
        echo "✅ Ollama service started successfully (PID: $OLLAMA_PID)"
        echo "🌐 Accessible at: http://localhost:11434"
        echo "🔗 Chrome extension can connect"
        echo "📝 Logs: $OLLAMA_LOG_FILE"
    else
        echo "❌ Failed to start Ollama service"
        rm -f "$OLLAMA_PID_FILE"
        return 1
    fi
}

stop_ollama() {
    echo "🛑 Stopping Ollama service..."
    
    if [ -f "$OLLAMA_PID_FILE" ]; then
        PID=$(cat "$OLLAMA_PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo "✅ Ollama service stopped (PID: $PID)"
        else
            echo "⚠️  Ollama process not found"
        fi
        rm -f "$OLLAMA_PID_FILE"
    else
        echo "⚠️  No PID file found"
    fi
    
    # Kill any remaining ollama processes
    pkill -f "ollama serve" 2>/dev/null || true
}

status_ollama() {
    if [ -f "$OLLAMA_PID_FILE" ] && kill -0 $(cat "$OLLAMA_PID_FILE") 2>/dev/null; then
        echo "✅ Ollama service is running (PID: $(cat $OLLAMA_PID_FILE))"
        echo "🌐 API: http://localhost:11434"
        echo "📝 Logs: $OLLAMA_LOG_FILE"
    else
        echo "❌ Ollama service is not running"
    fi
}

case "$1" in
    start)
        start_ollama
        ;;
    stop)
        stop_ollama
        ;;
    restart)
        stop_ollama
        sleep 1
        start_ollama
        ;;
    status)
        status_ollama
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Ollama service"
        echo "  stop    - Stop Ollama service"
        echo "  restart - Restart Ollama service"
        echo "  status  - Check Ollama service status"
        exit 1
        ;;
esac 