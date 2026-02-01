# @blockmail/app

Electron desktop application for BlockMail - a decentralized email system.

## Overview

A native desktop application built with Electron and React that enables sending and receiving blockchain-based messages between Ethereum addresses.

## Features

- Modern React-based UI with Tailwind CSS
- Wallet connection via MetaMask or development accounts
- Real-time message updates via WebSocket polling
- IPFS integration via Pinata for message storage
- Inbox and compose functionality

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **ethers.js** - Ethereum interactions
- **Pinata SDK** - IPFS pinning

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Running local Hardhat node with deployed contract (for development)

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your Pinata credentials in `.env`:

```env
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=your_pinata_gateway_url
```

### Install Dependencies

```bash
npm install
```

### Start Development

```bash
npm start
```

### Linting

```bash
npm run lint
```

### Build for Distribution

Package the app:

```bash
npm run package
```

Create distributable installers:

```bash
npm run make
```

### Build in Docker

Build Linux installers (`.deb`, `.rpm`, etc.) in a container (useful for CI or reproducible builds):

```bash
# From repo root
docker compose run --rm app-build
# or: npm run docker:app-build
```

Artifacts are written to `packages/app/out/`.

## Project Structure

```
src/
├── main.ts           # Electron main process
├── preload.ts        # Preload script for IPC
├── renderer.tsx      # React entry point
├── App.tsx           # Main React component
├── components/       # React components
│   ├── ComposeForm.tsx
│   ├── ConnectModal.tsx
│   ├── EmailDetailModal.tsx
│   ├── EmailList.tsx
│   ├── Header.tsx
│   ├── Toast.tsx
│   └── WelcomeScreen.tsx
├── hooks/            # Custom React hooks
│   ├── useToast.ts
│   └── useWallet.ts
├── config/           # Configuration
│   └── constants.ts  # Contract ABI, addresses
├── types/            # TypeScript types
└── utils/            # Helper utilities
```

## License

MIT
