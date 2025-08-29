# -----------------------------------------------------------------------------
# deps: Ubuntu + Node 20 + Yarn (corepack), install deps for both apps
# -----------------------------------------------------------------------------
FROM ubuntu:22.04 AS deps
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Basics + Node 20 (NodeSource)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg git \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*
# Enable Yarn via Corepack (bundled with Node 20)
RUN corepack enable

# Install backend deps
COPY backend/package.json backend/yarn.lock ./backend/
RUN cd backend && yarn install --frozen-lockfile

# Install frontend deps
COPY frontend/package.json frontend/yarn.lock ./frontend/
RUN cd frontend && yarn install --frozen-lockfile

# -----------------------------------------------------------------------------
# build: compile frontend (vite) and backend (ts/js) using cached node_modules
# -----------------------------------------------------------------------------
FROM ubuntu:22.04 AS build
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Bring node_modules from deps
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Copy sources
COPY backend ./backend
COPY frontend ./frontend

# Build both (ensure these scripts exist)
RUN yarn --cwd frontend build
RUN yarn --cwd backend build

# -----------------------------------------------------------------------------
# runtime: lightweight Ubuntu with Node 20; run backend and serve static frontend
# -----------------------------------------------------------------------------
FROM ubuntu:22.04 AS runner
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg tini \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN useradd -m -u 10001 appuser

ENV NODE_ENV=production

# Copy only what we need to run
# Backend runtime
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/public ./backend/public
# Frontend static bundle (served by backend)
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /data && chown -R appuser:appuser /data
RUN mkdir -p /downloads && chown -R appuser:appuser /downloads
USER appuser

# Adjust if your backend listens on another port
EXPOSE 5173

# tini for proper signal handling
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","backend/dist/server.js"]
