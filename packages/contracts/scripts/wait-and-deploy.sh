#!/bin/sh
# Wait for Hardhat node to be ready, then deploy BlockMail contract.
set -e

ETH_RPC_URL="${ETH_RPC_URL:-http://blockchain:8545}"
export ETH_RPC_URL
MAX_ATTEMPTS=30
ATTEMPT=1

echo "Waiting for blockchain at $ETH_RPC_URL..."
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if npx hardhat run scripts/deploy.ts --network docker 2>/dev/null; then
    echo "Deploy complete."
    exit 0
  fi
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "Deploy failed after $MAX_ATTEMPTS attempts."
    exit 1
  fi
  echo "Attempt $ATTEMPT failed, retrying in 2s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 2
done
