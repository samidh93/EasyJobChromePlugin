# Docker Setup for Ollama (Cross-Platform)

This guide will help you run Ollama in a Docker container with GPU support and the required environment variable for the EasyJob Chrome extension.

## Prerequisites

1. **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Docker Compose** - Included with Docker Desktop

## Quick Start

### Option 1: Using the automated script (Recommended)
```bash
./run-ollama-docker.sh
```

### Option 2: Manual setup
```bash
# Build and run the container
docker-compose up --build -d

# Check if it's running
docker ps
```

## GPU Support

### Apple Silicon (M1/M2/M3) Macs
✅ **GPU acceleration is automatically available** - No additional configuration needed. The container will use the Neural Engine and GPU cores.

### Intel Macs
⚠️ **Limited GPU support** - Docker Desktop on Intel Macs doesn't support GPU passthrough. The container will run on CPU only.

### Linux with NVIDIA GPU
For NVIDIA GPU support on Linux, you can add the following to your `docker-compose.yml`:
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

### Windows
GPU support varies by Windows version and Docker Desktop configuration. The container will run on CPU by default.

## Environment Variables

The container is configured with:
- `OLLAMA_ORIGINS="chrome-extension://*"` - Allows Chrome extension connections

## Ports and Access

- **Ollama API**: http://localhost:11434
- **Health check**: http://localhost:11434/api/tags

## Managing the Container

### Start the container
```bash
docker-compose up -d
```

### Stop the container
```bash
docker-compose down
```

### View logs
```bash
docker logs ollama-easyjob
```

### Access container shell
```bash
docker exec -it ollama-easyjob /bin/bash
```

## Model Management

### Download a model
```bash
docker exec ollama-easyjob ollama pull llama2
# or
docker exec ollama-easyjob ollama pull mistral
```

### List installed models
```bash
docker exec ollama-easyjob ollama list
```

### Remove a model
```bash
docker exec ollama-easyjob ollama rm llama2
```

## Volume Management

Models are stored in a Docker volume named `ollama_models`. This ensures models persist between container restarts.

### Backup models
```bash
docker run --rm -v ollama_models:/data -v $(pwd):/backup alpine tar czf /backup/ollama_models_backup.tar.gz -C /data .
```

### Restore models
```bash
docker run --rm -v ollama_models:/data -v $(pwd):/backup alpine tar xzf /backup/ollama_models_backup.tar.gz -C /data
```

## Testing the Setup

1. **Test Ollama API**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Test with Chrome Extension**:
   - Load the EasyJob extension in Chrome
   - The extension should now be able to connect to Ollama

## Troubleshooting

### Container won't start
- Check Docker Desktop is running
- Verify port 11434 is not already in use: `lsof -i :11434` (Mac/Linux) or `netstat -an | findstr :11434` (Windows)

### Chrome extension can't connect
- Verify the container is running: `docker ps`
- Check the logs: `docker logs ollama-easyjob`
- Ensure the `OLLAMA_ORIGINS` environment variable is set correctly

### Poor performance
- For Apple Silicon Macs, ensure you're using the ARM64 version of Docker Desktop
- Check available memory: `docker stats ollama-easyjob`

### Out of disk space
- Clean up unused Docker resources: `docker system prune -a`
- Remove unused models: `docker exec ollama-easyjob ollama rm <model_name>`

## Advanced Configuration

### Custom resource limits
Edit `docker-compose.yml` to add resource limits:
```yaml
deploy:
  resources:
    limits:
      memory: 8G
      cpus: '4'
```

### Custom port
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:11434"  # Use port 8080 instead of 11434
```

## Files Created

- `Dockerfile` - Container definition
- `docker-compose.yml` - Cross-platform Docker Compose configuration
- `run-ollama-docker.sh` - Automated setup script
- `DOCKER_SETUP.md` - This documentation

## Next Steps

1. Start the container using the script or docker-compose
2. Download your preferred model
3. Test the Chrome extension connection
4. Enjoy AI-powered job searching! 🚀 