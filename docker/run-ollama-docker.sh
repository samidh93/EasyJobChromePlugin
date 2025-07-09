#!/bin/bash

# Script to run Ollama in Docker with GPU support (cross-platform)

echo "🚀 Starting Ollama Docker container for EasyJob..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Build and run the container
echo "🔨 Building Ollama container..."
cd "$PROJECT_ROOT"
docker-compose -f docker/docker-compose.yml up --build -d

if [ $? -eq 0 ]; then
    echo "✅ Ollama container is running!"
    echo "🌐 Ollama is now accessible at: http://localhost:11434"
    echo "🔗 Chrome extension can now connect to Ollama"
    echo ""
    echo "To check container logs: docker logs ollama-easyjob"
    echo "To stop the container: docker-compose -f docker/docker-compose.yml down"
    echo ""
    echo "📥 To download a model, run:"
    echo "docker exec ollama-easyjob ollama pull llama2"
else
    echo "❌ Failed to start Ollama container"
    exit 1
fi 