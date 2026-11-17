FROM python:3.13-slim

WORKDIR /app

# System deps if you need them (psycopg[binary], etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv and project dependencies (locked, no dev)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

# Copy app code
COPY . .

ENV PATH="/app/.venv/bin:$PATH"
ENV PORT=8000

# Non-root user
RUN adduser --disabled-password --gecos "" myuser && \
    chown -R myuser:myuser /app
USER myuser

# Use adk api_server; configure URIs via env from Dokploy
# Point adk at AGENTS_DIR="." (which contains build_assist_agent)
CMD ["sh", "-c", "adk api_server --host 0.0.0.0 --port $PORT \
    --allow_origins \"$ALLOW_ORIGINS\" \
    --session_service_uri \"$SESSION_SERVICE_URI\" \
    --artifact_service_uri \"$ARTIFACT_SERVICE_URI\" ."]
