#!/bin/bash

# Ollama Manager - Main launcher for EasyJob
# Manages both Docker and native Ollama services

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_SCRIPT="$PROJECT_ROOT/docker/run-ollama-docker.sh"
SERVICE_SCRIPT="$PROJECT_ROOT/scripts/start-ollama-service.sh"
AUTOSTART_SCRIPT="$PROJECT_ROOT/scripts/setup-ollama-autostart.sh"

show_help() {
    cat << EOF
🚀 Ollama Manager for EasyJob

USAGE:
    ./ollama-manager.sh <command> [options]

COMMANDS:
    Docker Commands:
        docker-start    Start Ollama in Docker container
        docker-stop     Stop Ollama Docker container
        docker-status   Check Docker container status

    Native Service Commands:
        start           Start native Ollama service (recommended)
        stop            Stop native Ollama service
        restart         Restart native Ollama service
        status          Check native Ollama service status
        autostart       Enable auto-start on system boot

    Utility Commands:
        compare         Compare Docker vs Native performance
        help            Show this help message

EXAMPLES:
    # Start native service (recommended for M1/M2/M3 Macs)
    ./ollama-manager.sh start

    # Start Docker container
    ./ollama-manager.sh docker-start

    # Check status
    ./ollama-manager.sh status

    # Enable auto-start on boot
    ./ollama-manager.sh autostart

PERFORMANCE:
    📊 Native service: 100% GPU, ~36s response time
    📊 Docker service: CPU only, ~86s response time
    ✨ Native is 2.4x faster on Apple Silicon!

EOF
}

docker_start() {
    echo "🐳 Starting Ollama Docker container..."
    bash "$DOCKER_SCRIPT"
}

docker_stop() {
    echo "🐳 Stopping Ollama Docker container..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.yml down
}

docker_status() {
    echo "🐳 Docker container status:"
    docker ps | grep ollama-easyjob || echo "❌ Ollama Docker container not running"
}

native_start() {
    echo "🚀 Starting native Ollama service..."
    bash "$SERVICE_SCRIPT" start
}

native_stop() {
    echo "🛑 Stopping native Ollama service..."
    bash "$SERVICE_SCRIPT" stop
}

native_restart() {
    echo "🔄 Restarting native Ollama service..."
    bash "$SERVICE_SCRIPT" restart
}

native_status() {
    echo "🔍 Native Ollama service status:"
    bash "$SERVICE_SCRIPT" status
}

setup_autostart() {
    echo "⚙️ Setting up auto-start..."
    bash "$AUTOSTART_SCRIPT"
}

performance_compare() {
    echo "📊 Performance Comparison:"
    echo ""
    echo "Native Service (Recommended):"
    echo "  ✅ 100% GPU acceleration"
    echo "  ✅ ~36 second response time"
    echo "  ✅ Unified memory access"
    echo "  ✅ Metal framework optimization"
    echo ""
    echo "Docker Service:"
    echo "  ❌ CPU-only execution"
    echo "  ❌ ~86 second response time"
    echo "  ✅ Containerized isolation"
    echo "  ✅ Cross-platform compatibility"
    echo ""
    echo "🎯 For M1/M2/M3 Macs: Use native service for 2.4x better performance!"
}

# Main command handling
case "${1:-help}" in
    "docker-start")
        docker_start
        ;;
    "docker-stop")
        docker_stop
        ;;
    "docker-status")
        docker_status
        ;;
    "start")
        native_start
        ;;
    "stop")
        native_stop
        ;;
    "restart")
        native_restart
        ;;
    "status")
        native_status
        ;;
    "autostart")
        setup_autostart
        ;;
    "compare")
        performance_compare
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 