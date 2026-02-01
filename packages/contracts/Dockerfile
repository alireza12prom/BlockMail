# BlockMail contracts - Hardhat node & deployment
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Copy contract sources and config
COPY contracts/ contracts/
COPY hardhat.config.ts tsconfig.json ./
COPY scripts/ scripts/

# Compile contracts (artifacts needed for deploy)
RUN npm run compile

# Default: run Hardhat node, reachable from host and other containers
EXPOSE 8545
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
