FROM python:3.13-slim

WORKDIR /app

# System deps if you need them (psycopg[binary], etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install project dependencies
COPY pyproject.toml poetry.lock* ./
RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --no-root

# Copy app code
COPY . .

# Non-root user
RUN adduser --disabled-password --gecos "" myuser && \
    chown -R myuser:myuser /app
USER myuser

ENV PATH="/home/myuser/.local/bin:$PATH"
ENV PORT=8000

# Use adk api_server; configure URIs via env from Dokploy
# Point adk at AGENTS_DIR="." (which contains build_assist_agent)
CMD ["sh", "-c", "adk api_server --host 0.0.0.0 --port $PORT \
  --session_service_uri \"$SESSION_SERVICE_URI\" \
  --artifact_service_uri \"$ARTIFACT_SERVICE_URI\" ."]
