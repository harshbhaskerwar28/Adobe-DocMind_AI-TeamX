#!/bin/bash

# Adobe Finals TeamX - Docker Build Script

echo "🐳 Building Adobe Finals TeamX Docker Image..."
echo "=============================================="

# Build the Docker image
docker build -t adobe-finals-teamx:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "🚀 To run the application:"
    echo "docker run \\"
    echo "  -e ADOBE_EMBED_API_KEY=<YOUR_ADOBE_KEY> \\"
    echo "  -e LLM_PROVIDER=gemini \\"
    echo "  -e GOOGLE_API_KEY=<YOUR_GOOGLE_KEY> \\"
    echo "  -e GEMINI_MODEL=gemini-2.5-pro \\"
    echo "  -e TTS_PROVIDER=azure \\"
    echo "  -e AZURE_TTS_KEY=<YOUR_AZURE_KEY> \\"
    echo "  -e AZURE_TTS_ENDPOINT=<YOUR_AZURE_ENDPOINT> \\"
    echo "  -e AZURE_TTS_DEPLOYMENT=tts \\"
    echo "  -p 8080:8080 \\"
    echo "  adobe-finals-teamx:latest"
    echo ""
    echo "🌐 Access at: http://localhost:8080"
else
    echo "❌ Docker build failed!"
    exit 1
fi
