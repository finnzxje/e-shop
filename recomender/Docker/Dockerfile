# ============================================================================
# Multi-stage Dockerfile for E-Shop Recommendation System
# With GPU Support (CUDA 12.1)
# ============================================================================

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3-dev \
    build-essential \
    curl \
    git \
    libpq-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python
RUN ln -s /usr/bin/python3.10 /usr/bin/python

WORKDIR /app

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM base as dependencies

# Copy requirements
COPY ../requirements.txt .

# Install Python packages
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 2: Application
# ============================================================================
FROM dependencies as application

# Copy application code from etl folder
COPY etl/ .

# Create necessary directories with absolute paths
RUN mkdir -p \
    /app/data/raw/downloads \
    /app/data/raw/mapped_images \
    /app/data/processed \
    /app/data/faiss \
    /app/logs

# Copy entrypoint
COPY Docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command
CMD ["api"]