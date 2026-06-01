# FrontierX Protocol — Deployment & Configuration

> **Doc #**: 05  
> **Referenced by**: Step-by-Step Execution Guide (Doc 06), Steps 17-19

---

## 1. Deployment Architecture

```
┌─────────────────────────────────────────────┐
│              Domain Setup                    │
│  frontierx.khtain.com → Vercel              │
│  (CNAME record in DNS)                       │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│              Vercel                          │
│  ┌──────────────────────────────────────┐   │
│  │  Next.js 14 Application              │   │
│  │  ├── Static pages (SSG)              │   │
│  │  ├── Client-side Web3 (wagmi)        │   │
│  │  └── API Routes (Serverless)         │   │
│  │      ├── /api/ai/scout               │   │
│  │      ├── /api/ai/content             │   │
│  │      └── /api/ai/distill             │   │
│  └──────────────────────────────────────┘   │
└──────────────────────┬──────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌─────▼─────┐  ┌───▼────┐
    │ Sepolia │  │ Polygon   │  │  Base  │
    │ Testnet │  │ Mainnet   │  │Mainnet │
    └─────────┘  └───────────┘  └────────┘
```

---

## 2. Contract Deployment

### 2.1 Pre-Deployment Checklist

Before deploying to ANY chain:

- [ ] All contracts compile without errors: `npx hardhat compile`
- [ ] All tests pass: `npx hardhat test`
- [ ] Gas estimates are reasonable: `npx hardhat test --gas-reporter`
- [ ] Deployer wallet has sufficient native tokens on target chain
- [ ] Treasury wallet address is set in .env
- [ ] IPFS metadata is uploaded and baseURI is known
- [ ] Block explorer API keys are configured for verification

### 2.2 Deployment Order (Critical)

On EACH chain, deploy in this exact order:

```
1. FRXToken(treasuryWallet)
2. FrontierPass(mintPrice, placeholderURI, royaltyReceiver)
3. FRXStaking(frxTokenAddress, frontierPassAddress)
4. FRXLottery(frxTokenAddress)
5. CrystalForge(frxTokenAddress)
6. → Call frxToken.setStakingContract(stakingAddress)
```

### 2.3 Chain-Specific Parameters

```typescript
// Deployment parameters per chain

const SEPOLIA_CONFIG = {
  chainId: 11155111,
  mintPrice: ethers.parseEther("0.003"),  // 0.003 ETH
  treasuryWallet: process.env.TREASURY_WALLET,
  placeholderURI: "ipfs://QmMetadataCID/nft-metadata/placeholder.json",
};

const POLYGON_CONFIG = {
  chainId: 137,
  mintPrice: ethers.parseUnits("10", 18),  // 10 MATIC
  treasuryWallet: process.env.TREASURY_WALLET,
  placeholderURI: "ipfs://QmMetadataCID/nft-metadata/placeholder.json",
};

const BASE_CONFIG = {
  chainId: 8453,
  mintPrice: ethers.parseEther("0.003"),   // 0.003 ETH
  treasuryWallet: process.env.TREASURY_WALLET,
  placeholderURI: "ipfs://QmMetadataCID/nft-metadata/placeholder.json",
};
```

### 2.4 Post-Deployment

After deploying to each chain:

1. **Record addresses**. `npm run deploy:sepolia`, `npm run deploy:polygon`, and `npm run deploy:base` write:
   - `frontierx-contracts/deployments/addresses.json`
   - `frontierx-contracts/deployments/frontend-env.<network>.env`

2. **Reveal metadata only after minting has started**. `FrontierPass.reveal()` requires `totalSupply() > 0`, and minting is intentionally closed after reveal. For Sepolia lifecycle testing, mint at least one pass first, then reveal:

```bash
METADATA_CID=QmMetadataCID/nft-metadata npm run reveal -- --network sepolia
```

For Polygon/Base, add explicit irreversible-action gates:

```bash
ALLOW_MAINNET_REVEAL=true CONFIRM_REVEAL_NETWORK=base METADATA_CID=QmMetadataCID/nft-metadata npm run reveal -- --network base
```

3. **Verify contracts** on block explorer:
```bash
# Sepolia
npx hardhat verify --network sepolia DEPLOYED_ADDRESS constructor_args

# Polygon
npx hardhat verify --network polygon DEPLOYED_ADDRESS constructor_args

# Base
npx hardhat verify --network base DEPLOYED_ADDRESS constructor_args
```

4. **Record all addresses** in a deployment manifest:

```json
// deployments/addresses.json
{
  "sepolia": {
    "chainId": 11155111,
    "frxToken": "0x...",
    "frontierPass": "0x...",
    "staking": "0x...",
    "lottery": "0x...",
    "crystalForge": "0x...",
    "deployedAt": "2026-06-XX",
    "deployerTx": "0x..."
  },
  "polygon": {
    "chainId": 137,
    "frxToken": "0x...",
    "frontierPass": "0x...",
    "staking": "0x...",
    "lottery": "0x...",
    "crystalForge": "0x...",
    "deployedAt": "2026-06-XX",
    "deployerTx": "0x..."
  },
  "base": {
    "chainId": 8453,
    "frxToken": "0x...",
    "frontierPass": "0x...",
    "staking": "0x...",
    "lottery": "0x...",
    "crystalForge": "0x...",
    "deployedAt": "2026-06-XX",
    "deployerTx": "0x..."
  }
}
```

5. **Update frontend config** by copying the generated `frontend-env.<network>.env` values into `.env`, Docker Compose, or Vercel env vars. The app reads contract addresses from `NEXT_PUBLIC_<NETWORK>_*` variables (see Doc 03, Section 4.1). Existing non-local deployment manifests are not overwritten unless `ALLOW_DEPLOYMENT_OVERWRITE=true` is set.

---

## 3. Vercel Deployment

### 3.1 Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable static export for non-API routes (optional, reduces costs)
  // output: 'export', // Don't use — we need API routes

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: '*.pinata.cloud',
      },
    ],
  },

  // Webpack config for Web3 compatibility
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://frontierx.khtain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 3.2 Vercel Project Setup

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Initialize project
cd frontierx-web
vercel

# 4. Set environment variables
vercel env add DEEPSEEK_API_KEY
vercel env add DEEPSEEK_BASE_URL
vercel env add MINIMAX_API_KEY
vercel env add MINIMAX_BASE_URL
vercel env add SEPOLIA_RPC_URL
vercel env add POLYGON_RPC_URL
vercel env add BASE_RPC_URL
# ... (all env vars from Section 2 of Doc 04)

# 5. Deploy
vercel --prod
```

### 3.3 Domain Configuration

In Vercel Dashboard → Project → Settings → Domains:

1. Add domain: `frontierx.khtain.com`
2. Vercel will provide a CNAME value (e.g., `cname.vercel-dns.com`)

In khtain.com DNS settings (at your domain registrar):

```
Type    Name        Value                    TTL
CNAME   frontierx   cname.vercel-dns.com     3600
```

Wait for DNS propagation (up to 24h, usually faster).

Vercel will auto-provision an SSL certificate for the subdomain.

---

## 4. IPFS Configuration (Pinata)

### 4.1 Pinata Setup

1. Create account at [pinata.cloud](https://pinata.cloud)
2. Get API keys from Dashboard → API Keys
3. Add to .env:

```env
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
PINATA_JWT=your_optional_jwt
```

### 4.2 Upload Process

```bash
# 1. Generate NFT art
cd <repo-root>
node scripts/generate-nft-art.js
# Default Pinata Free output: nft-art/common.svg, rare.svg, epic.svg, legendary.svg, placeholder.svg + rarity-map.json

# Optional safety check before upload
node scripts/validate-nft-assets.js --pinata-free

# 2. Upload images folder to Pinata
node scripts/upload-to-pinata.js --target=images --confirm-upload
# Output: Images CID

# 3. Generate metadata with images CID
node scripts/generate-metadata.js --imagesCID=QmXxx/nft-art --feeRecipient=0xYourRoyaltyOrTreasuryWallet
# Output: ./nft-metadata/<rarity>/ (400 JSON files) + placeholder.json + collection.json

# Required safety check after final Images CID is inserted
node scripts/validate-nft-assets.js --require-final-cid --pinata-free

# 4. Upload metadata folder to Pinata
node scripts/upload-to-pinata.js --target=metadata --confirm-upload
# Output: Metadata CID

# 5. Reveal when ready
# Mint at least one pass first; reveal closes minting in the current contract.
METADATA_CID=QmMetadataCID/nft-metadata npm run reveal -- --network sepolia
```

### 4.3 Pinata Gateway URLs

For frontend image display:
```
Direct IPFS image: ipfs://QmImagesCID/nft-art/common.svg
Pinata image gateway: https://gateway.pinata.cloud/ipfs/QmImagesCID/nft-art/common.svg
Direct IPFS metadata: ipfs://QmMetadataCID/nft-metadata/common/1.json
Pinata metadata gateway: https://gateway.pinata.cloud/ipfs/QmMetadataCID/nft-metadata/common/1.json
```

Use Pinata's dedicated gateway for better performance.

---

## 5. External Service Accounts Needed

| Service | Purpose | URL | Free Tier |
|---------|---------|-----|-----------|
| Pinata | IPFS hosting | pinata.cloud | Check active plan limits before uploading 803 NFT files |
| DeepSeek | AI API (primary) | platform.deepseek.com | Pay-per-use |
| MiniMax | AI API (fallback) | platform.minimaxi.com | Pay-per-use |
| Infura | Sepolia RPC | infura.io | 100k req/day |
| WalletConnect | Wallet connection | cloud.walletconnect.com | Free project |
| Etherscan | Contract verification | etherscan.io | Free API key |
| Polygonscan | Contract verification | polygonscan.com | Free API key |
| Basescan | Contract verification | basescan.org | Free API key |
| Vercel | Frontend hosting | vercel.com | Free hobby plan |

---

## 6. Testing Workflow

### 6.1 Local Development

```bash
# Terminal 1: Local Hardhat node
cd frontierx-contracts
npx hardhat node

# Terminal 2: Deploy to local
npx hardhat run scripts/deploy-local.ts --network localhost

# Terminal 3: Frontend
cd frontierx-web
npm run dev
# Access at http://localhost:3000
```

### 6.2 Testnet Flow

```
1. Deploy contracts to Sepolia
2. Get Sepolia ETH from faucet
3. Test full flow:
   a. Connect MetaMask (Sepolia)
   b. Mint NFT (0.003 ETH)
   c. Stake NFT
   d. Wait, then Claim $FRX
   e. Enter Lottery
   f. Play Crystal Forge
   g. Use AI Agent (burns $FRX)
4. Verify all events on Sepolia Etherscan
```

### 6.3 Mainnet Deployment

```
1. Deploy to Polygon first (cheaper gas for testing)
2. Test full flow on Polygon
3. Deploy to Base
4. Test full flow on Base
5. Update frontend with all addresses
6. Deploy frontend to Vercel
7. Configure domain (frontierx.khtain.com)
8. Final end-to-end test on production
```

---

## 7. Monitoring & Maintenance

### Post-Launch Checklist

- [ ] All contracts verified on block explorers
- [ ] Frontend accessible at frontierx.khtain.com
- [ ] Wallet connection works on all 3 chains
- [ ] NFT Mint works on all 3 chains
- [ ] NFTs appear on OpenSea (Polygon + Base)
- [ ] Staking produces correct $FRX amounts
- [ ] Lottery accepts entries and draws work
- [ ] Crystal Forge game works
- [ ] AI Agents respond correctly
- [ ] i18n switching works (EN ↔ CN)
- [ ] Mobile responsive layout works
- [ ] Dashboard shows correct stats

### Ongoing Maintenance

1. **CrystalForge pool**: Monitor and call `burnExcess()` periodically
2. **Lottery draws**: Someone needs to call `drawWinner()` daily — can automate with a cron job or manual trigger
3. **AI API costs**: Monitor DeepSeek/MiniMax usage
4. **IPFS pinning**: Ensure Pinata subscription remains active
