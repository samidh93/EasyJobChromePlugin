FROM ollama/ollama:latest

# Set environment variable to allow Chrome extension connections
ENV OLLAMA_ORIGINS="chrome-extension://*"

# Expose the default Ollama port
EXPOSE 11434

# Create a volume for models
VOLUME ["/root/.ollama"]

# Start Ollama server
CMD ["serve"] 