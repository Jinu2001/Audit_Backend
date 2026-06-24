# Use Node.js 20 on Debian (apt-get based, not Nix)
FROM node:20-bookworm-slim

# Install all system dependencies required by Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgtk-3-0 \
    libexpat1 \
    wget \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set Playwright browser path to a persistent location inside /app
ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Playwright's Chromium browser to /app/ms-playwright
RUN npx playwright install chromium

# Copy rest of the source code
COPY . .

# Railway injects PORT automatically
EXPOSE 8080

CMD ["node", "server.js"]
