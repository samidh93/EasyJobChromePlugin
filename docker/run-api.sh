#!/bin/bash

# EasyJob API Server Management Script
# Manages Node.js API server with Docker containers

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
DOCKER_DIR="$PROJECT_ROOT/docker"

echo "🚀 EasyJob API Server Management Script"
echo "======================================="

case "${1:-help}" in
    "start")
        echo "Starting EasyJob API server..."
        cd "$DOCKER_DIR"
        
        # Check if network exists
        if ! docker network ls | grep -q easyjob-network; then
            echo "❌ Network 'easyjob-network' not found!"
            echo "💡 Please start the database first: ./run-database.sh start"
            exit 1
        fi
        
        docker-compose -f docker-compose-api.yml up -d
        
        echo "⏳ Waiting for API server to be ready..."
        sleep 10
        
        # Wait for API server to be ready
        echo "🔍 Checking API server health..."
        timeout=30
        while [ $timeout -gt 0 ]; do
            if curl -s http://localhost:3001/health >/dev/null 2>&1; then
                echo "✅ API server is ready!"
                break
            fi
            echo "⏳ Waiting for API server... ($timeout seconds left)"
            sleep 1
            timeout=$((timeout - 1))
        done
        
        if [ $timeout -eq 0 ]; then
            echo "❌ API server failed to start within 30 seconds"
            echo "📋 Check logs with: ./run-api.sh logs"
            exit 1
        fi
        
        echo ""
        echo "🎉 EasyJob API server started successfully!"
        echo "🌐 API Server: http://localhost:3001"
        echo "   Health check: http://localhost:3001/health"
        echo "   Endpoints: /api/users/*"
        echo ""
        echo "🧪 Test the API:"
        echo "   curl http://localhost:3001/health"
        ;;
    
    "stop")
        echo "Stopping EasyJob API server..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-api.yml down
        echo "✅ API server stopped!"
        ;;
    
    "restart")
        echo "Restarting EasyJob API server..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-api.yml restart
        echo "✅ API server restarted!"
        ;;
    
    "logs")
        echo "Showing API server logs..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-api.yml logs -f
        ;;
    
    "build")
        echo "Building EasyJob API server..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-api.yml build --no-cache
        echo "✅ API server built!"
        ;;
    
    "rebuild")
        echo "Rebuilding and restarting API server..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-api.yml down
        docker-compose -f docker-compose-api.yml build --no-cache
        docker-compose -f docker-compose-api.yml up -d
        echo "✅ API server rebuilt and restarted!"
        ;;
    
    "status")
        echo "API server status:"
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-api.yml ps
        echo ""
        echo "Container health:"
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            echo "✅ API Server: Healthy"
        else
            echo "❌ API Server: Not responding"
        fi
        echo ""
        echo "Network status:"
        docker network ls | grep easyjob-network && echo "✅ Network: easyjob-network exists" || echo "❌ Network: easyjob-network missing"
        ;;
    
    "test")
        echo "Testing API endpoints..."
        echo ""
        echo "🔍 Health check:"
        curl -s http://localhost:3001/health | jq . || echo "❌ Health check failed"
        echo ""
        echo "🔍 User exists check:"
        curl -s http://localhost:3001/api/users/exists/test@example.com | jq . || echo "❌ User exists check failed"
        echo ""
        echo "✅ API tests complete"
        ;;
    
    "shell")
        echo "Opening shell in API container..."
        docker exec -it easyjob-api /bin/sh
        ;;
    
    "help"|*)
        echo "Usage: $0 COMMAND [OPTIONS]"
        echo ""
        echo "Commands:"
        echo "  start      Start API server"
        echo "  stop       Stop API server"
        echo "  restart    Restart API server"
        echo "  logs       Show API server logs"
        echo "  build      Build API server image"
        echo "  rebuild    Rebuild and restart API server"
        echo "  status     Show container status and health"
        echo "  test       Test API endpoints"
        echo "  shell      Open shell in API container"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start           Start API server"
        echo "  $0 logs            Show logs"
        echo "  $0 rebuild         Rebuild after code changes"
        echo "  $0 test            Test API endpoints"
        echo ""
        echo "Prerequisites:"
        echo "  - Database must be running: ./run-database.sh start"
        echo "  - Network 'easyjob-network' must exist"
        ;;
esac 