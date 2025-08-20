# Multi-stage build for Adobe Finals TeamX Project
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# Final stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for production
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from frontend stage
COPY --from=frontend-builder /app/frontend/dist ./backend/static

# Create necessary directories and set proper permissions
RUN mkdir -p /app/backend/uploads /app/backend/vector_db /app/backend/static
RUN chmod -R 755 /app/backend/uploads /app/backend/vector_db /app/backend/static

# Set environment variables
ENV PYTHONPATH=/app/backend
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Environment variables for API keys (will be overridden at runtime)
ENV GOOGLE_API_KEY=""
ENV GEMINI_MODEL="gemini-2.5-pro"
ENV AZURE_TTS_KEY=""
ENV AZURE_TTS_ENDPOINT=""
ENV AZURE_TTS_DEPLOYMENT="tts"
ENV LLM_PROVIDER="gemini"
ENV TTS_PROVIDER="azure"

# Set proper working directory for runtime
WORKDIR /app/backend

# Expose port 8080 as required by Adobe evaluation
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application (bind to 0.0.0.0 for Docker compatibility)
CMD ["python", "-m", "uvicorn", "pdf_extractor:app", "--host", "0.0.0.0", "--port", "8080"]
