# Ollama Service Setup Guide

This guide shows you how to run Ollama as a persistent service on macOS with GPU acceleration and Chrome extension support.

## 🚀 Quick Start (Recommended)

### Option 1: Manual Service Management
```bash
# Start Ollama service
./start-ollama-service.sh start

# Check status
./start-ollama-service.sh status

# Stop service
./start-ollama-service.sh stop

# Restart service
./start-ollama-service.sh restart
```

### Option 2: Auto-Start on System Boot
```bash
# Set up automatic startup
./setup-ollama-autostart.sh

# Ollama will now start automatically when you boot your Mac
```

## 📋 Service Management Commands

### Manual Control
| Command | Action |
|---------|--------|
| `./start-ollama-service.sh start` | Start Ollama service |
| `./start-ollama-service.sh stop` | Stop Ollama service |
| `./start-ollama-service.sh restart` | Restart Ollama service |
| `./start-ollama-service.sh status` | Check service status |

### Auto-Start Management
| Command | Action |
|---------|--------|
| `./setup-ollama-autostart.sh` | Enable auto-start on boot |
| `launchctl unload ~/Library/LaunchAgents/com.ollama.autostart.plist` | Disable auto-start |
| `rm ~/Library/LaunchAgents/com.ollama.autostart.plist` | Remove auto-start config |

## 🔧 Service Features

### ✅ What's Included
- **GPU Acceleration**: Full M1/M2/M3 GPU support
- **Chrome Extension Support**: Pre-configured with `OLLAMA_ORIGINS="chrome-extension://*"`
- **Persistent Service**: Runs in background, survives terminal closes
- **Logging**: All output logged to `/tmp/ollama.log`
- **Process Management**: Proper PID tracking and cleanup
- **Auto-Recovery**: Service manager handles restarts

### 🌐 API Access
- **URL**: http://localhost:11434
- **Health Check**: `curl http://localhost:11434/api/tags`
- **Models**: `curl http://localhost:11434/api/tags | jq '.models[].name'`

## 🛠️ Troubleshooting

### Service Won't Start
```bash
# Check if port is in use
lsof -i :11434

# Check logs
cat /tmp/ollama.log
cat /tmp/ollama-autostart.log

# Kill any existing processes
pkill -f "ollama serve"
```

### Auto-Start Not Working
```bash
# Check if service is loaded
launchctl list | grep ollama

# Reload the service
launchctl unload ~/Library/LaunchAgents/com.ollama.autostart.plist
launchctl load ~/Library/LaunchAgents/com.ollama.autostart.plist
```

### Performance Issues
```bash
# Check service status
./start-ollama-service.sh status

# Verify GPU usage
ollama ps
```

## 📊 Performance Comparison

### Native Service vs Docker
| Metric | Native Service | Docker |
|--------|---------------|---------|
| **GPU Usage** | ✅ 100% GPU | ❌ CPU Only |
| **Response Time** | ✅ ~36 seconds | ❌ ~86 seconds |
| **Memory Usage** | ✅ Unified Memory | ❌ Container Overhead |
| **Startup Time** | ✅ Fast | ❌ Slower |

## 🔄 Migration from Docker

### Stop Docker Version
```bash
docker-compose down
```

### Start Native Service
```bash
./start-ollama-service.sh start
```

### Your models are already available!
Both Docker and native Ollama share the same model storage, so no re-downloading needed.

## 🏃‍♂️ Usage Examples

### Test the Service
```bash
# Check if running
./start-ollama-service.sh status

# Test API
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "qwen2.5:3b", "prompt": "Hello!", "stream": false}' \
  -H "Content-Type: application/json"
```

### Chrome Extension
Your EasyJob Chrome extension will automatically connect to:
- **URL**: http://localhost:11434
- **Environment**: `OLLAMA_ORIGINS="chrome-extension://*"` is pre-configured

## 📁 Files Created

- `start-ollama-service.sh` - Main service management script
- `setup-ollama-autostart.sh` - Auto-start configuration script
- `~/Library/LaunchAgents/com.ollama.autostart.plist` - macOS service configuration
- `/tmp/ollama.log` - Service output logs
- `/tmp/ollama.pid` - Process ID file

## 🎯 Next Steps

1. **Choose your setup**:
   - Manual control: `./start-ollama-service.sh start`
   - Auto-start: `./setup-ollama-autostart.sh`

2. **Test the service**:
   - `./start-ollama-service.sh status`
   - `curl http://localhost:11434/api/tags`

3. **Use your Chrome extension**:
   - Load EasyJob extension
   - Extension will connect to native Ollama
   - Enjoy 2.4x faster AI responses! 🚀

## 💡 Tips

- Use `./start-ollama-service.sh status` to check service health
- Logs are in `/tmp/ollama.log` for debugging
- The service uses your M1 GPU automatically
- Models are shared between Docker and native versions
- Chrome extension gets much faster responses with native service 