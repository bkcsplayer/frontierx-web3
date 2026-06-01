# FrontierX Protocol

FrontierX Protocol is a portfolio-grade Web3 + AI demo project.

It combines an ERC-20 token, an ERC-721 access pass, NFT staking, token-consuming games, NFT-gated areas, and token-powered AI agents into one full-stack product.

## What This Project Demonstrates

- ERC-20 token minting and burning.
- ERC-721 NFT minting with rarity tiers and IPFS metadata.
- NFT staking that earns FRX rewards.
- Token utility through lottery, game, and AI agent flows.
- NFT-gated pages.
- Multi-chain deployment across Sepolia, Polygon, and Base.
- Next.js frontend with wallet connection and polished Web3 UX.
- Vercel serverless APIs that verify on-chain burns before AI calls.

## Canonical Files

- `doc/logo.png` - canonical FrontierX logo source asset.
- `doc/README.md` - documentation index and read order.
- `doc/06-STEP-BY-STEP-EXECUTION.md` - build sequence and checkpoints.
- `doc/00-MASTER-PLAN.md` - architecture and product overview.
- `doc/01-SMART-CONTRACTS.md` - contract specifications.
- `doc/02-NFT-ART-METADATA.md` - NFT art, metadata, and IPFS workflow.
- `doc/03-FRONTEND-DESIGN.md` - frontend pages, components, and UX flows.
- `doc/04-BACKEND-API.md` - AI agent APIs and burn verification.
- `doc/05-DEPLOYMENT.md` - deployment, environment, and QA plan.
- `doc/07-DOCKER-WINDOWS.md` - Docker Desktop on Windows port rules and workflow.

## Recommended Build Order

Follow `doc/06-STEP-BY-STEP-EXECUTION.md` exactly:

1. Smart contract foundation.
2. NFT art and metadata.
3. Frontend core.
4. Game zone.
5. AI integration.
6. Polish and deployment.

Do not skip alignment checkpoints. They are part of the project spec.

## Docker Development

All host-exposed Docker ports use the `983x` series:

- Web: `http://localhost:9830`
- Hardhat RPC: `http://127.0.0.1:9831`

Start both services from the repository root:

```bash
docker compose up --build
```

Before running deploy/API flows, fill the root `.env` file. Use a fresh burner
wallet private key for `PRIVATE_KEY`; never use a main MetaMask wallet that holds
real funds.

## Design Direction

The UI should feel like a premium Web3 command center: dark OLED, controlled neon, glass cards, precise data surfaces, and explicit wallet/transaction states.

See `doc/03-FRONTEND-DESIGN.md` for page structure, wallet UX, and implementation notes.

## Environment Setup

Copy `.env.example` to `.env` at the repository root and fill in your own keys. Never commit `.env` or real private keys.

Contract addresses for Sepolia are recorded in `frontierx-contracts/deployments/addresses.json` after deploy.

## Status

Core contracts, frontend, Docker dev stack, and Sepolia test deployment are in progress. Follow `doc/06-STEP-BY-STEP-EXECUTION.md` for checkpoints.
