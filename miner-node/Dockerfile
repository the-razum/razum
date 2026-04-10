# ===========================================
#  Razum AI Miner — Docker Image
#  Lightweight Node.js container for mining
# ===========================================
FROM node:20-alpine

LABEL maintainer="Razum AI <hello@airazum.com>"
LABEL description="Razum AI Miner — earn RZM tokens by sharing GPU compute"
LABEL version="1.0.0"

# Create app directory
WORKDIR /app

# Create data directory for persistent state
RUN mkdir -p /root/.razum

# Copy miner script
COPY miner.js .

# Healthcheck — verify miner process is running
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD pgrep -f "node miner.js" > /dev/null || exit 1

# Environment variables with defaults
ENV COORDINATOR=https://airazum.com
ENV OLLAMA_URL=http://ollama:11434
ENV MINER_NAME=docker-miner
ENV WALLET_ADDRESS=
ENV MODELS=
ENV GPU_MODEL=Docker
ENV POLL_INTERVAL=2000
ENV HEARTBEAT_INTERVAL=20000

# Persistent storage for miner state (apiKey, config)
VOLUME ["/root/.razum"]

# Run miner
CMD ["node", "miner.js"]
