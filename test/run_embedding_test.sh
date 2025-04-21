#!/bin/bash

echo "Starting embedding test..."
echo "This will generate embedding requests that you can monitor in Ollama logs."
echo "Make sure Ollama is running before proceeding."

# Run the test directly with Node
node test/test_embeddings.js 