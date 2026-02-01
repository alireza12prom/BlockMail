# @blockmail/contracts

Smart contracts for the BlockMail decentralized email system.

## Overview

The BlockMail smart contract provides on-chain messaging metadata storage. Messages are sent between Ethereum addresses with content stored off-chain on IPFS.

## Contract

### BlockMail.sol

A simple event-emitting contract that records message metadata:

```solidity
event Message(
    address indexed from,
    address indexed to,
    string cid,
    uint256 timestamp
);

function sendMessage(address to, string calldata cid) external;
```

**Parameters:**
- `to`: Recipient's Ethereum address
- `cid`: IPFS Content Identifier where the message is stored

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Install Dependencies

```bash
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Start Local Node

Start a local Hardhat node for development:

```bash
npm run node
```

### Deploy

Deploy to local network:

```bash
npm run deploy:local
```

Deploy to a configured network:

```bash
npm run deploy -- --network <network-name>
```

## Network Configuration

### Localhost

Default local development network at `http://127.0.0.1:8545`.

### Sepolia Testnet

To deploy to Sepolia:

1. Set up your private key:
   ```bash
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   ```

2. Deploy:
   ```bash
   npm run deploy -- --network sepolia
   ```

## Deployment Artifacts

Deployment artifacts are stored in `ignition/deployments/` and include:
- Contract ABI
- Deployed addresses
- Build info

## License

MIT
