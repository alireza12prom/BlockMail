# BlockMail

A decentralized email system built on Ethereum blockchain with IPFS storage. Send and receive messages between Ethereum addresses with content stored on IPFS and metadata recorded on-chain.

## Features

- **Decentralized Messaging**: Send messages directly between Ethereum addresses
- **IPFS Storage**: Message content stored on IPFS via Pinata for permanent, decentralized storage
- **On-Chain Records**: Message metadata (sender, recipient, timestamp, IPFS CID) recorded on Ethereum
- **Desktop Application**: Native Electron app with modern React UI
- **Real-Time Updates**: WebSocket-based event polling for instant message notifications
- **Wallet Integration**: Connect via MetaMask or use development accounts

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Electron App  │────▶│  Smart Contract │────▶│    Ethereum     │
│   (React + TS)  │     │   (Solidity)    │     │   Blockchain    │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   IPFS/Pinata   │
│  (Message Data) │
└─────────────────┘
```

## Project Structure

```
blockmail/
├── packages/
│   ├── app/              # Electron desktop application
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── config/       # Configuration & constants
│   │   │   ├── types/        # TypeScript types
│   │   │   └── utils/        # Helper utilities
│   │   └── ...
│   └── contracts/        # Solidity smart contracts
│       ├── contracts/        # Solidity source files
│       ├── ignition/         # Deployment modules
│       ├── scripts/          # Deployment scripts
│       └── test/             # Contract tests
├── package.json          # Root workspace config
└── README.md
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MetaMask browser extension (for production use)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create environment files for the app:

```bash
cp packages/app/.env.example packages/app/.env
```

Edit `packages/app/.env` with your configuration:

```env
# Contract address (use default for local development)
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# RPC URLs
VITE_RPC_URL=http://127.0.0.1:8545
VITE_WS_URL=ws://127.0.0.1:8545

# Pinata IPFS Configuration (get from https://app.pinata.cloud)
VITE_PINATA_JWT=your_pinata_jwt_here
VITE_PINATA_GATEWAY=your_gateway_subdomain.mypinata.cloud
```

### 3. Start Local Blockchain

In one terminal, start the Hardhat local node:

```bash
npm run contracts:node
```

### 4. Deploy Smart Contract

In another terminal, deploy the contract to your local node:

```bash
npm run contracts:deploy:local
```

### 5. Start the Application

```bash
npm run app:start
```

Or run everything together:

```bash
npm run dev
```

## Available Scripts

### Root Level

| Command                          | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `npm run dev`                    | Start local blockchain and app concurrently |
| `npm run app:start`              | Start the Electron app                      |
| `npm run app:build`              | Build the Electron app for distribution     |
| `npm run app:lint`               | Lint the app code                           |
| `npm run contracts:node`         | Start local Hardhat node                    |
| `npm run contracts:deploy:local` | Deploy contracts to local node              |
| `npm run contracts:compile`      | Compile smart contracts                     |
| `npm run contracts:test`         | Run contract tests                          |
| `npm run clean`                  | Remove all node_modules                     |
| `npm run lint`                   | Lint all packages                           |
| `npm run test`                   | Test all packages                           |

### App Package (`packages/app`)

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm start`       | Start development server         |
| `npm run package` | Package app for current platform |
| `npm run make`    | Build distributable installers   |
| `npm run lint`    | Run ESLint                       |

### Contracts Package (`packages/contracts`)

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `npm run compile`      | Compile Solidity contracts   |
| `npm run test`         | Run contract tests           |
| `npm run node`         | Start local Hardhat node     |
| `npm run deploy`       | Deploy to configured network |
| `npm run deploy:local` | Deploy to localhost          |

## Development

### Connecting a Wallet

For local development, you can use the pre-funded Hardhat accounts. The app displays a QR code to connect MetaMask or you can import one of the development private keys.

### Smart Contract

The `BlockMail.sol` contract is a simple event emitter:

```solidity
event Message(
    address indexed from,
    address indexed to,
    string cid,
    uint256 timestamp
);

function sendMessage(address to, string calldata cid) external {
    emit Message(msg.sender, to, cid, block.timestamp);
}
```

Messages are stored off-chain on IPFS; the blockchain only records the metadata.

## Tech Stack

### Application
- **Electron** - Desktop application framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS framework
- **ethers.js** - Ethereum library
- **Pinata SDK** - IPFS pinning service

### Smart Contracts
- **Solidity** - Smart contract language
- **Hardhat** - Development framework
- **Hardhat Ignition** - Deployment system

## Deployment

### Local Development

The default configuration deploys to a local Hardhat node at `http://127.0.0.1:8545`.

### Testnet (Sepolia)

1. Update `packages/contracts/hardhat.config.ts` with your RPC URL and deployer private key
2. Run: `npm run contracts:deploy -- --network sepolia`
3. Update `packages/app/src/config/constants.ts` with the deployed contract address

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Ethereum](https://ethereum.org/) - Blockchain platform
- [IPFS](https://ipfs.io/) - Distributed storage
- [Pinata](https://pinata.cloud/) - IPFS pinning service
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Electron](https://www.electronjs.org/) - Desktop application framework
