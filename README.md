# Gmblr

Gmblr is a full-stack Web3 lottery dApp on Ethereum Sepolia. The React frontend connects wallets to the deployed Solidity contract, and Chainlink VRF supplies verifiable randomness after all tickets are sold.

## Preview

![Gmblr lottery dApp interface](./img/neo_bru.png)



## How it works

1. Each wallet can buy one of five available tickets for `0.001 ETH`.
2. Once all tickets are sold, the contract owner requests a draw.
3. Chainlink VRF returns verifiable randomness, normally within 1–2 minutes.
4. The owner of the selected ticket claims the whole prize pool.

## Project structure

```text
src/                    # React + TypeScript frontend
src/abi/luckyDraw.ts    # App-facing contract ABI
contracts/Gmblr.sol     # Solidity contract source (to be added)
```

The frontend communicates with the contract through three values only: the deployed address, an RPC endpoint, and the ABI. The Solidity source is included for transparency, local development, and future redeployments; it is not required to run the already deployed frontend.

## Requirements

- Node.js 18 or newer
- A wallet with Sepolia ETH
- A WalletConnect project ID
- A Sepolia RPC URL

## Frontend setup

Install dependencies:

```bash
pnpm install
```

Copy `.env.example` to `.env`, then set the deployment and connection values:

```env
VITE_CONTRACT_ADDRESS=0x5eF7a6c490B61CD9522b055c601b277b1e42Ea69
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_SEPOLIA_RPC_URL=https://your-sepolia-rpc-url
```

Never commit `.env`; it can contain credentials for your RPC provider.

## Run locally

```bash
pnpm dev
```

Open the local URL shown by Vite, connect a wallet, and switch to Sepolia when prompted.

## Build

```bash
pnpm build
pnpm preview
```

## Smart-contract and VRF setup

The contract source will live at `contracts/Gmblr.sol`. Before deploying or drawing a winner, configure the Chainlink VRF subscription for Sepolia:

- Fund the subscription with LINK because the request uses `nativePayment: false`.
- Add the deployed Gmblr contract as an approved subscription consumer.
- Connect the contract-owner wallet after all five tickets sell, then use **Draw Winner**.
- Wait for Chainlink VRF to call back (normally 1–2 minutes), then claim from the wallet that owns the winning ticket.

Never expose private keys or subscription-management credentials in the frontend. Wallet signatures are requested through MetaMask/RainbowKit.

## Contract interface used by the frontend

The app reads `tickets`, `TickOwner`, `HasBought`, `ticketsSold`, `draw`, `WinnerTicket`, `claimed`, `owner`, and `isWinner`. It writes through `purchase(index)`, `drawWinner()`, and `claimPrize()`.

The contract implementation exposes five fixed ticket numbers. The app always treats `TicketPurchased`'s `index` event value as the ticket number—not a zero-based slot index.

## Stack

- Solidity
- React + TypeScript + Vite
- wagmi + viem
- RainbowKit

