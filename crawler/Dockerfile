# ============================================
# Crawler Dockerfile - Production Optimized
# Multi-stage build with optimized Python
# ============================================

# Stage 1: Dependencies
FROM python:3.11-slim AS dependencies

WORKDIR /app

# Install build dependencies for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production Runtime
FROM python:3.11-slim

WORKDIR /app

# Add non-root user for security
RUN useradd -m -u 1001 appuser

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from stage 1
COPY --from=dependencies /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Health check - attempt to import main module
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import database; print('OK')" || exit 1

# Set Python to unbuffered mode for better logging
ENV PYTHONUNBUFFERED=1

# Run scheduler
CMD ["python", "scheduler.py"]
