import { HardhatAccount } from '../types';

// Contract ABI
export const CONTRACT_ABI = [
  "function setMessagingPubKey(bytes pubKey) external",
  "function sendMessage(address to, string cid, bytes32 metaHash) external",
  "event Message(address indexed from, address indexed to, string cid, bytes32 metaHash, uint64 sentAt)"
];

// Contract address (Hardhat local deployment)
export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Hardhat RPC URL
export const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';

// Hardhat default accounts
export const HARDHAT_ACCOUNTS: HardhatAccount[] = [
  { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', name: 'Account #0' },
  { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', name: 'Account #1' },
  { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'Account #2' },
];
