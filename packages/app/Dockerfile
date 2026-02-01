# BlockMail Electron app - build and optional dev run
FROM node:20-bookworm-slim

# Electron + Chromium dependencies and virtual display for headless build
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libgbm1 \
    libvulkan1 \
    xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Copy app source and config
COPY . .

# Build runs at container start so you can mount a volume to get artifacts:
#   docker run -v $(pwd)/out:/app/out blockmail-app
# Output: .deb, .rpm, etc. in /app/out (and in your mounted directory)
VOLUME ["/app/out"]
CMD ["xvfb-run", "--auto-servernum", "npm", "run", "make"]
