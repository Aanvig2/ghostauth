# ─────────────────────────────────────────
# Stage 1: Build
# Uses Node 22 LTS (fixes the version issue)
# ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching — only re-runs npm install if these change)
COPY package.json package-lock.json ./

# Clean install — avoids the corrupted node_modules issue
RUN npm ci

# Copy all source files
COPY . .

# Build the React app → outputs to /app/dist
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Serve
# Tiny nginx image (~23MB) just serves the static dist/
# ─────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built files from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (handles React Router / SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
