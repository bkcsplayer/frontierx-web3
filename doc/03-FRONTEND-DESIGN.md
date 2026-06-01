# FrontierX Protocol — Frontend Design Document

> **Doc #**: 03  
> **Referenced by**: Step-by-Step Execution Guide (Doc 06), Steps 7-13

---

## 1. Project Structure

```
frontierx-web/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx                # Root layout (providers, navbar, footer)
│   ├── page.tsx                  # Landing page (/)
│   ├── mint/
│   │   └── page.tsx              # NFT Mint page
│   ├── stake/
│   │   └── page.tsx              # Staking page
│   ├── arena/
│   │   └── page.tsx              # Game Zone (NFT gated)
│   ├── ai-hub/
│   │   └── page.tsx              # AI Agent Hub (NFT gated)
│   ├── dashboard/
│   │   └── page.tsx              # Stats Dashboard
│   └── api/
│       ├── ai/
│       │   ├── scout/route.ts    # AI Search Visibility Scout
│       │   ├── content/route.ts  # Smart Content Forge
│       │   └── distill/route.ts  # Knowledge Distiller
│       └── verify-burn/route.ts  # Verify FRX burn tx
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx            # Navigation + wallet + lang switch
│   │   ├── Footer.tsx
│   │   └── PageWrapper.tsx       # Animated page transitions
│   ├── wallet/
│   │   ├── ConnectButton.tsx     # Wallet connect button
│   │   ├── ChainSwitcher.tsx     # Network selector
│   │   └── WalletProvider.tsx    # wagmi + WalletConnect setup
│   ├── nft/
│   │   ├── MintCard.tsx          # NFT mint interface
│   │   ├── NFTGrid.tsx           # Display owned NFTs
│   │   ├── NFTCard.tsx           # Single NFT display
│   │   └── NFTGate.tsx           # Gate check component
│   ├── staking/
│   │   ├── StakePanel.tsx        # Stake/unstake interface
│   │   ├── RewardsDisplay.tsx    # Pending rewards
│   │   └── StakedNFTList.tsx     # List of staked NFTs
│   ├── games/
│   │   ├── LotteryPanel.tsx      # Daily lottery interface
│   │   ├── CrystalForge.tsx      # Crystal forge game
│   │   ├── CountdownTimer.tsx    # Next draw countdown
│   │   └── GameHistory.tsx       # Recent results
│   ├── ai/
│   │   ├── AIAgentCard.tsx       # Agent selection card
│   │   ├── ScoutAgent.tsx        # AI Search Visibility Scout UI
│   │   ├── ContentAgent.tsx      # Smart Content Forge UI
│   │   └── DistillAgent.tsx      # Knowledge Distiller UI
│   ├── dashboard/
│   │   ├── StatCard.tsx          # Stat display card
│   │   ├── EconomyPanel.tsx      # Treasury / Burned / Minted
│   │   └── ActivityFeed.tsx      # Recent on-chain activity
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Loading.tsx
│       ├── Toast.tsx
│       └── GlowEffect.tsx       # Reusable glow/neon effect
│
├── lib/
│   ├── contracts/
│   │   ├── addresses.ts          # Contract addresses per chain
│   │   ├── abis/                 # ABI JSON files
│   │   │   ├── FRXToken.json
│   │   │   ├── FrontierPass.json
│   │   │   ├── FRXStaking.json
│   │   │   ├── FRXLottery.json
│   │   │   └── CrystalForge.json
│   │   └── hooks/                # Custom wagmi hooks
│   │       ├── useFRXToken.ts
│   │       ├── useFrontierPass.ts
│   │       ├── useFRXStaking.ts
│   │       ├── useFRXLottery.ts
│   │       └── useCrystalForge.ts
│   ├── i18n/
│   │   ├── config.ts             # i18n configuration
│   │   ├── en.json               # English translations
│   │   └── zh.json               # Chinese translations
│   └── utils/
│       ├── format.ts             # Number formatting (display integers)
│       └── chains.ts             # Chain configurations
│
├── public/
│   ├── logo.png                  # Copied from doc/logo.png
│   ├── og-image.png              # OpenGraph image
│   └── fonts/                    # Custom fonts
│
├── styles/
│   └── globals.css               # Tailwind base + CSS variables
│
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── .env.local
```

---

## 2. Design System

> **Canonical source**: Root `DESIGN.md` is the visual source of truth. This section provides implementation notes and examples for the frontend. If this document conflicts with `DESIGN.md`, follow `DESIGN.md`.

### 2.1 Aesthetic Direction

**Tone**: Cyberpunk-Luxury meets Clean Tech. Dark backgrounds with neon accent glows. Not cluttered or "hacker" — more like a refined tech company's internal tool from the future.

**Key Visual Elements**:
- Primary logo asset from `doc/logo.png` (metallic black ring with cyan energy glow)
- Dark mode only (background: #050510)
- Neon glow accents (blue primary, purple secondary)
- Glass-morphism cards (backdrop-blur + semi-transparent)
- Subtle grid pattern background
- Smooth transitions and hover effects
- Monospace font for numbers/data, sans-serif for body
- SVG icons from one icon set (no emoji as production UI icons)

### 2.2 Color Palette (CSS Variables)

```css
:root {
  /* Backgrounds */
  --bg-primary: #050510;
  --bg-secondary: #0A0A1F;
  --bg-card: rgba(15, 15, 35, 0.8);
  --bg-card-hover: rgba(25, 25, 55, 0.9);
  
  /* Accent Colors */
  --accent-blue: #3B82F6;
  --accent-purple: #8B5CF6;
  --accent-gold: #F59E0B;
  --accent-green: #10B981;
  --accent-red: #EF4444;
  --accent-cyan: #06B6D4;
  
  /* Glow Effects */
  --glow-blue: 0 0 20px rgba(59, 130, 246, 0.3);
  --glow-purple: 0 0 20px rgba(139, 92, 246, 0.3);
  --glow-gold: 0 0 20px rgba(245, 158, 11, 0.3);
  
  /* Text */
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  
  /* Borders */
  --border-default: rgba(59, 130, 246, 0.2);
  --border-hover: rgba(59, 130, 246, 0.5);
  
  /* Glass */
  --glass-bg: rgba(15, 15, 40, 0.6);
  --glass-border: rgba(59, 130, 246, 0.15);
  --glass-blur: 12px;
}
```

### 2.3 Typography

Use Orbitron sparingly for logo, hero, and display moments. Use Sora for most UI text so the app feels premium and readable rather than like a generic sci-fi template.

```css
/* Display / Headings */
font-family: 'Orbitron', 'Rajdhani', monospace;
/* Body */
font-family: 'Sora', 'Noto Sans SC', sans-serif;
/* Data / Numbers */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

Load from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&family=Noto+Sans+SC:wght@300;400;700&display=swap" rel="stylesheet">
```

### 2.4 Card Component Pattern

```tsx
// components/ui/Card.tsx
// Glass-morphism card with neon border glow on hover
const Card = ({ children, className, glowColor = 'blue' }) => {
  const glowMap = {
    blue: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    purple: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]',
    gold: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-[rgba(15,15,35,0.8)] backdrop-blur-xl
      border border-[rgba(59,130,246,0.15)]
      hover:border-[rgba(59,130,246,0.4)]
      transition-all duration-500
      ${glowMap[glowColor]}
      ${className}
    `}>
      {children}
    </div>
  );
};
```

---

## 3. Page Designs

### 3.1 Landing Page (/)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] FrontierX    Mint  Stake  Arena  AI Hub  Dashboard   │
│                                          [EN/CN] [Connect]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              FRONTIERX PROTOCOL                             │
│              ═══════════════════                             │
│                                                             │
│         Where AI Meets Web3                                 │
│         AI 与 Web3 的交汇点                                   │
│                                                             │
│     A dual-token ecosystem demonstrating the full           │
│     lifecycle of Web3: mint, stake, play, and               │
│     power AI agents with blockchain tokens.                 │
│                                                             │
│         [Connect Wallet]    [Explore →]                     │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │  100     │  │  $FRX    │  │  3       │  │  3       │  │
│   │  NFTs    │  │  Token   │  │  Games   │  │  AI      │  │
│   │  Total   │  │  Staking │  │  Zone    │  │  Agents  │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   HOW IT WORKS                                              │
│                                                             │
│   ①  Mint NFT ──→ ② Stake NFT ──→ ③ Earn $FRX            │
│                                         │                   │
│                    ┌────────────────────┘                   │
│                    ▼                                        │
│              ④  Use $FRX                                    │
│          ┌────────┼────────┐                                │
│          ▼        ▼        ▼                                │
│       Lottery   Game    AI Agent                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   TOKEN ECONOMICS                                           │
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │ $FRX Token           │  │ Frontier Access Pass  │       │
│   │ ERC-20               │  │ ERC-721 NFT          │       │
│   │ Unlimited supply     │  │ 100 limited supply   │       │
│   │ Earned via staking   │  │ 4 rarity tiers       │       │
│   │ Burned by games/AI   │  │ Your key to the      │       │
│   │                      │  │ ecosystem             │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   LIVE STATS                                                │
│                                                             │
│   Treasury: 1,234 $FRX    Burned: 5,678 $FRX              │
│   Minted:   12,345 $FRX   Circulating: 5,433 $FRX         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Footer: Built by Kuo | FutureFrontier Technology Ltd.       │
│ Powered by Khtain Block Technology Ltd.                     │
│ Sepolia · Polygon · Base                                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Mint Page (/mint)

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   MINT YOUR FRONTIER ACCESS PASS                            │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Chain Selector: [Sepolia] [Polygon] [Base]     │       │
│   │                                                  │       │
│   │  ┌──────────────┐                               │       │
│   │  │              │  Price: 0.003 ETH             │       │
│   │  │  NFT Preview │  Supply: 42 / 100 minted     │       │
│   │  │  (animated   │  Your NFTs: 2                 │       │
│   │  │   card)      │                               │       │
│   │  │              │  Rarity chances:              │       │
│   │  └──────────────┘  60% Common | 25% Rare        │       │
│   │                    10% Epic   | 5% Legendary    │       │
│   │                                                  │       │
│   │              [ MINT NOW ]                        │       │
│   │                                                  │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   ─── MY FRONTIER PASSES ──────────────────────────────     │
│                                                             │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                  │
│   │ #003 │  │ #017 │  │ #042 │  │ #099 │                  │
│   │Common│  │ Rare │  │ Epic │  │Legend│                  │
│   │  🔵  │  │  🟣  │  │  🟡  │  │  🌈  │                  │
│   └──────┘  └──────┘  └──────┘  └──────┘                  │
│                                                             │
│   ─── NFT GATED CONTENT ───────────────────────────────     │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │  🔒 You hold a Frontier Access Pass!             │       │
│   │                                                  │       │
│   │  Welcome to the inner sanctum. You now have      │       │
│   │  access to:                                      │       │
│   │  → Game Zone (Arena)                             │       │
│   │  → AI Agent Hub                                  │       │
│   │  → Staking Dashboard                             │       │
│   │                                                  │       │
│   │  This section proves that NFT-based access       │       │
│   │  control works. Only pass holders can see this.  │       │
│   │                                                  │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   OR (if no NFT):                                           │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │  🔒 Access Denied                                │       │
│   │                                                  │       │
│   │  You need a Frontier Access Pass to view         │       │
│   │  this content. Mint one above to unlock.         │       │
│   │                                                  │       │
│   │  [ Mint Now ↑ ]                                  │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Staking Page (/stake)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   STAKING DASHBOARD                                         │
│                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │ Total Staked  │  │ Pending $FRX │  │ Total Earned │    │
│   │     3 NFTs    │  │   127.5      │  │   2,450      │    │
│   └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│           [ CLAIM ALL  127.5 $FRX ]                         │
│                                                             │
│   ─── STAKED NFTS ─────────────────────────────────────     │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │  #003 Common  │  Rate: 100/day  │  Pending: 42  │       │
│   │               │                 │  [ UNSTAKE ]   │       │
│   ├─────────────────────────────────────────────────┤       │
│   │  #017 Rare    │  Rate: 150/day  │  Pending: 63  │       │
│   │               │                 │  [ UNSTAKE ]   │       │
│   ├─────────────────────────────────────────────────┤       │
│   │  #042 Epic    │  Rate: 250/day  │  Pending: 22  │       │
│   │               │                 │  [ UNSTAKE ]   │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   ─── AVAILABLE TO STAKE ──────────────────────────────     │
│                                                             │
│   ┌──────┐  ┌──────┐                                       │
│   │ #099 │  │ #055 │                                       │
│   │Legend│  │Common│                                       │
│   │[STAKE]│ │[STAKE]│                                      │
│   └──────┘  └──────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Arena Page (/arena) — NFT GATED

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ⚔️  GAME ZONE — ARENA                                     │
│                                                             │
│   Your $FRX Balance: 1,234                                  │
│                                                             │
│   ═══ DAILY LOTTERY ═══════════════════════════════════     │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Current Pool: 2,340 $FRX                        │       │
│   │  Entries: 12 players                             │       │
│   │  Next Draw: 05:23:41                             │       │
│   │                                                  │       │
│   │  Amount: [____10____] $FRX    [ ENTER LOTTERY ]  │       │
│   │                                                  │       │
│   │  Your entries this round: 50 $FRX               │       │
│   │  Win probability: ~2.1%                          │       │
│   │                                                  │       │
│   │  ─── Previous Winners ───                       │       │
│   │  Round 5: 0x1a2b...3c4d won 1,890 $FRX         │       │
│   │  Round 4: 0x5e6f...7g8h won 3,210 $FRX         │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   ═══ CRYSTAL FORGE ═══════════════════════════════════     │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │                                                  │       │
│   │         ◆ (animated crystal visual)             │       │
│   │                                                  │       │
│   │  Cost: 5 $FRX per forge                         │       │
│   │                                                  │       │
│   │  Outcomes:                                       │       │
│   │  SUPERNOVA (10%) — 3x return                    │       │
│   │  BLAZE (15%) — 2x return                        │       │
│   │  GLOW (25%) — 1.5x return                       │       │
│   │  SHATTER (50%) — lose all                       │       │
│   │                                                  │       │
│   │              [ FORGE CRYSTAL ]                   │       │
│   │                                                  │       │
│   │  ─── Recent Forges ───                          │       │
│   │  0x1a2b: BLAZE +10 $FRX                        │       │
│   │  0x5e6f: SHATTER -5 $FRX                       │       │
│   │  0x9i0j: SUPERNOVA +15 $FRX                    │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 AI Hub Page (/ai-hub) — NFT GATED

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🤖  AI AGENT HUB                                          │
│                                                             │
│   Your $FRX Balance: 1,234                                  │
│   Power your AI agents with $FRX tokens.                    │
│                                                             │
│   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ │
│   │  🔍 AI Search  │ │  ✍️ Smart      │ │  📚 Knowledge │ │
│   │  Visibility    │ │  Content       │ │  Distiller     │ │
│   │  Scout         │ │  Forge         │ │                │ │
│   │                │ │                │ │                │ │
│   │ Analyze your   │ │ Generate       │ │ Distill any    │ │
│   │ AI search      │ │ platform-      │ │ text into      │ │
│   │ visibility     │ │ specific       │ │ structured     │ │
│   │                │ │ content        │ │ knowledge      │ │
│   │ Cost: 10 $FRX  │ │ Cost: 10 $FRX  │ │ Cost: 15 $FRX  │ │
│   │                │ │                │ │                │ │
│   │ [ Launch ]     │ │ [ Launch ]     │ │ [ Launch ]     │ │
│   └────────────────┘ └────────────────┘ └────────────────┘ │
│                                                             │
│   ═══ AI SEARCH VISIBILITY SCOUT (expanded) ═══            │
│                                                             │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Enter a business name or website URL:           │       │
│   │  [________________________________]              │       │
│   │                                                  │       │
│   │  [ Analyze — 10 $FRX ]                           │       │
│   │                                                  │       │
│   │  ─── Results ───                                │       │
│   │  (AI-generated report appears here)             │       │
│   │  Markdown rendered, with sections:              │       │
│   │  • AI Search Presence Score                     │       │
│   │  • Key Findings                                 │       │
│   │  • Optimization Recommendations                 │       │
│   │  • Action Items                                 │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.6 Dashboard Page (/dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   📊  PROTOCOL DASHBOARD                                     │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │ Treasury │  │  Total   │  │  Total   │  │Circulating│  │
│   │  1,234   │  │ Burned   │  │ Minted   │  │  Supply   │  │
│   │  $FRX    │  │ 5,678    │  │ 12,345   │  │  5,433    │  │
│   │  🏛️      │  │ 🔥       │  │ ⛏️       │  │  💎       │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────┐       │
│   │  NFTs Minted: 42/100 │  │  NFTs Staked: 28     │       │
│   │  ████████░░ 42%      │  │  Avg Daily Yield:    │       │
│   │                      │  │  3,425 $FRX          │       │
│   └──────────────────────┘  └──────────────────────┘       │
│                                                             │
│   ─── RECENT ACTIVITY ─────────────────────────────────     │
│                                                             │
│   🟢 0x1a2b minted Pass #043 (Rare)         2 min ago     │
│   🔵 0x5e6f staked Pass #017                 5 min ago     │
│   🟡 0x9i0j claimed 150 $FRX                8 min ago     │
│   🔴 0xklmn forged crystal — SHATTER        12 min ago    │
│   🟢 0xopqr won lottery Round 5 — 1,890 $FRX 1 hour ago  │
│                                                             │
│   ─── CHAIN STATUS ────────────────────────────────────     │
│                                                             │
│   Sepolia ⚡ Active    Polygon ⚡ Active    Base ⚡ Active  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Wallet Integration

### 4.1 wagmi v2 + WalletConnect Configuration

```typescript
// lib/utils/chains.ts
import { sepolia, polygon, base } from 'wagmi/chains';

export const supportedChains = [sepolia, polygon, base] as const;

export const chainConfig = {
  [sepolia.id]: {
    name: 'Sepolia Testnet',
    mintPrice: '0.003',
    nativeCurrency: 'ETH',
    contracts: {
      frxToken: '0x...',
      frontierPass: '0x...',
      staking: '0x...',
      lottery: '0x...',
      crystalForge: '0x...',
    },
  },
  [polygon.id]: {
    name: 'Polygon PoS',
    mintPrice: '10',
    nativeCurrency: 'MATIC',
    contracts: {
      frxToken: '0x...',
      frontierPass: '0x...',
      staking: '0x...',
      lottery: '0x...',
      crystalForge: '0x...',
    },
  },
  [base.id]: {
    name: 'Base',
    mintPrice: '0.003',
    nativeCurrency: 'ETH',
    contracts: {
      frxToken: '0x...',
      frontierPass: '0x...',
      staking: '0x...',
      lottery: '0x...',
      crystalForge: '0x...',
    },
  },
};
```

### 4.2 WalletProvider Setup

```typescript
// components/wallet/WalletProvider.tsx
'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { sepolia, polygon, base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'FrontierX Protocol',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [sepolia, polygon, base],
  transports: {
    [sepolia.id]: http(),
    [polygon.id]: http('https://polygon-bor-rpc.publicnode.com'),
    [base.id]: http('https://mainnet.base.org'),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#3B82F6' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 4.3 Custom Contract Hooks Pattern

```typescript
// lib/contracts/hooks/useFrontierPass.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { useChainConfig } from './useChainConfig';
import FrontierPassABI from '../abis/FrontierPass.json';
import FRXStakingABI from '../abis/FRXStaking.json';

export function useFrontierPass() {
  const { address } = useAccount();
  const { contracts, mintPrice } = useChainConfig();

  const { data: totalSupply } = useReadContract({
    address: contracts.frontierPass,
    abi: FrontierPassABI,
    functionName: 'totalSupply',
  });

  const { data: holdsPass } = useReadContract({
    address: contracts.frontierPass,
    abi: FrontierPassABI,
    functionName: 'holdsPass',
    args: [address],
    enabled: !!address,
  });

  const { data: hasPassAccess } = useReadContract({
    address: contracts.staking,
    abi: FRXStakingABI,
    functionName: 'effectivePassHolder',
    args: [address],
    enabled: !!address,
  });

  const { data: ownedTokens } = useReadContract({
    address: contracts.frontierPass,
    abi: FrontierPassABI,
    functionName: 'tokensOfOwner',
    args: [address],
    enabled: !!address,
  });

  const { writeContract: mint, isPending: isMinting } = useWriteContract();

  const handleMint = () => {
    mint({
      address: contracts.frontierPass,
      abi: FrontierPassABI,
      functionName: 'mint',
      value: parseEther(mintPrice),
    });
  };

  return {
    totalSupply: totalSupply ? Number(totalSupply) : 0,
    holdsWalletPass: !!holdsPass,
    hasPassAccess: !!hasPassAccess,
    ownedTokens: ownedTokens || [],
    mint: handleMint,
    isMinting,
  };
}
```

---

## 5. NFT Gate Component

```typescript
// components/nft/NFTGate.tsx
'use client';

import { useFrontierPass } from '@/lib/contracts/hooks/useFrontierPass';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from 'lucide-react';

interface NFTGateProps {
  children: React.ReactNode;
}

export function NFTGate({ children }: NFTGateProps) {
  const { t } = useTranslation();
  const { isConnected } = useAccount();
  const { hasPassAccess } = useFrontierPass();

  if (!isConnected) {
    return (
      <Card className="text-center p-12">
        <LockKeyhole className="mx-auto mb-4 h-14 w-14 text-[var(--accent-blue)]" aria-hidden />
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {t('gate.connectWallet')}
        </h2>
        <p className="text-[var(--text-secondary)]">
          {t('gate.connectDescription')}
        </p>
      </Card>
    );
  }

  if (!hasPassAccess) {
    return (
      <Card className="text-center p-12">
        <LockKeyhole className="mx-auto mb-4 h-14 w-14 text-[var(--accent-red)]" aria-hidden />
        <h2 className="text-2xl font-bold text-[var(--accent-red)] mb-2">
          {t('gate.accessDenied')}
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          {t('gate.needPass')}
        </p>
        <a href="/mint" className="text-[var(--accent-blue)] hover:underline">
          {t('gate.mintNow')} →
        </a>
      </Card>
    );
  }

  // User holds NFT — show gated content
  return <>{children}</>;
}
```

---

## 6. Internationalization (i18n)

### Structure

```json
// lib/i18n/en.json
{
  "nav": {
    "mint": "Mint",
    "stake": "Stake",
    "arena": "Arena",
    "aiHub": "AI Hub",
    "dashboard": "Dashboard"
  },
  "hero": {
    "title": "FrontierX Protocol",
    "subtitle": "Where AI Meets Web3",
    "description": "A dual-token ecosystem demonstrating the full lifecycle of Web3: mint, stake, play, and power AI agents with blockchain tokens.",
    "connect": "Connect Wallet",
    "explore": "Explore"
  },
  "mint": {
    "title": "Mint Your Frontier Access Pass",
    "price": "Price",
    "supply": "Supply",
    "minted": "minted",
    "yourNFTs": "Your NFTs",
    "mintNow": "Mint Now",
    "rarity": {
      "common": "Common",
      "rare": "Rare",
      "epic": "Epic",
      "legendary": "Legendary"
    }
  },
  "gate": {
    "connectWallet": "Connect Your Wallet",
    "connectDescription": "Connect your wallet to check access.",
    "accessDenied": "Access Denied",
    "needPass": "You need a Frontier Access Pass to view this content.",
    "mintNow": "Mint Now",
    "welcome": "Welcome, Pass Holder!"
  },
  "stake": {
    "title": "Staking Dashboard",
    "totalStaked": "Total Staked",
    "pending": "Pending $FRX",
    "totalEarned": "Total Earned",
    "claimAll": "Claim All",
    "stake": "Stake",
    "unstake": "Unstake",
    "dailyRate": "Daily Rate"
  },
  "arena": {
    "title": "Game Zone — Arena",
    "balance": "Your $FRX Balance",
    "lottery": {
      "title": "Daily Lottery",
      "pool": "Current Pool",
      "entries": "Entries",
      "nextDraw": "Next Draw",
      "enter": "Enter Lottery",
      "minEntry": "Minimum entry: 10 $FRX"
    },
    "forge": {
      "title": "Crystal Forge",
      "cost": "Cost per forge",
      "forge": "Forge Crystal",
      "results": {
        "supernova": "SUPERNOVA",
        "blaze": "BLAZE",
        "glow": "GLOW",
        "shatter": "SHATTER"
      }
    }
  },
  "ai": {
    "title": "AI Agent Hub",
    "balance": "Your $FRX Balance",
    "scout": {
      "title": "AI Search Visibility Scout",
      "description": "Analyze your AI search visibility",
      "cost": "10 $FRX",
      "placeholder": "Enter business name or URL",
      "analyze": "Analyze"
    },
    "content": {
      "title": "Smart Content Forge",
      "description": "Generate platform-specific content",
      "cost": "10 $FRX",
      "placeholder": "Enter topic or key message",
      "generate": "Generate",
      "platforms": {
        "linkedin": "LinkedIn",
        "twitter": "Twitter/X",
        "wechat": "WeChat (公众号)",
        "xiaohongshu": "Xiaohongshu (小红书)"
      }
    },
    "distill": {
      "title": "Knowledge Distiller",
      "description": "Distill text into structured knowledge",
      "cost": "15 $FRX",
      "placeholder": "Paste your text here...",
      "distill": "Distill"
    }
  },
  "dashboard": {
    "title": "Protocol Dashboard",
    "treasury": "Treasury",
    "burned": "Total Burned",
    "minted": "Total Minted",
    "circulating": "Circulating Supply",
    "nftsMinted": "NFTs Minted",
    "nftsStaked": "NFTs Staked",
    "recentActivity": "Recent Activity"
  }
}
```

```json
// lib/i18n/zh.json
{
  "nav": {
    "mint": "铸造",
    "stake": "质押",
    "arena": "竞技场",
    "aiHub": "AI 中心",
    "dashboard": "数据面板"
  },
  "hero": {
    "title": "FrontierX Protocol",
    "subtitle": "AI 与 Web3 的交汇点",
    "description": "一个双币经济模型生态系统，展示 Web3 全生命周期：铸造、质押、游戏，以及用区块链代币驱动 AI Agent。",
    "connect": "连接钱包",
    "explore": "探索"
  },
  "mint": {
    "title": "铸造你的 Frontier 通行证",
    "price": "价格",
    "supply": "供应量",
    "minted": "已铸造",
    "yourNFTs": "我的 NFT",
    "mintNow": "立即铸造",
    "rarity": {
      "common": "普通",
      "rare": "稀有",
      "epic": "史诗",
      "legendary": "传说"
    }
  },
  "gate": {
    "connectWallet": "连接你的钱包",
    "connectDescription": "连接钱包以检查访问权限。",
    "accessDenied": "访问被拒绝",
    "needPass": "你需要 Frontier 通行证才能查看此内容。",
    "mintNow": "立即铸造",
    "welcome": "欢迎，通行证持有者！"
  },
  "stake": {
    "title": "质押面板",
    "totalStaked": "已质押总数",
    "pending": "待领取 $FRX",
    "totalEarned": "总收益",
    "claimAll": "全部领取",
    "stake": "质押",
    "unstake": "解除质押",
    "dailyRate": "日产出"
  },
  "arena": {
    "title": "游戏区 — 竞技场",
    "balance": "你的 $FRX 余额",
    "lottery": {
      "title": "每日抽奖",
      "pool": "当前奖池",
      "entries": "参与人数",
      "nextDraw": "下次开奖",
      "enter": "参与抽奖",
      "minEntry": "最低投入：10 $FRX"
    },
    "forge": {
      "title": "锻造水晶",
      "cost": "每次消耗",
      "forge": "锻造水晶",
      "results": {
        "supernova": "超新星",
        "blaze": "烈焰",
        "glow": "微光",
        "shatter": "碎裂"
      }
    }
  },
  "ai": {
    "title": "AI Agent 中心",
    "balance": "你的 $FRX 余额",
    "scout": {
      "title": "AI 搜索可见度分析",
      "description": "分析你在 AI 搜索中的可见度",
      "cost": "10 $FRX",
      "placeholder": "输入企业名称或网址",
      "analyze": "开始分析"
    },
    "content": {
      "title": "智能内容锻造坊",
      "description": "生成适配各平台的内容",
      "cost": "10 $FRX",
      "placeholder": "输入主题或核心观点",
      "generate": "生成内容",
      "platforms": {
        "linkedin": "LinkedIn",
        "twitter": "Twitter/X",
        "wechat": "微信公众号",
        "xiaohongshu": "小红书"
      }
    },
    "distill": {
      "title": "知识蒸馏器",
      "description": "将文本蒸馏为结构化知识",
      "cost": "15 $FRX",
      "placeholder": "在此粘贴文本...",
      "distill": "开始蒸馏"
    }
  },
  "dashboard": {
    "title": "协议数据面板",
    "treasury": "国库",
    "burned": "总销毁量",
    "minted": "总铸造量",
    "circulating": "流通供应量",
    "nftsMinted": "已铸造 NFT",
    "nftsStaked": "已质押 NFT",
    "recentActivity": "最近活动"
  }
}
```

---

## 7. Key Frontend Behaviors

### 7.1 Number Formatting

All $FRX amounts displayed as integers on the frontend:

```typescript
// lib/utils/format.ts
import { formatEther } from 'viem';

export function formatFRX(weiAmount: bigint): string {
  const eth = formatEther(weiAmount);
  return Math.floor(Number(eth)).toLocaleString();
}
```

### 7.2 NFT Gate Check Flow

```
User visits /arena or /ai-hub
  │
  ├── Wallet not connected → Show "Connect Wallet" prompt
  │
  ├── Wallet connected, no effective pass access → Show "Access Denied + Mint link"
  │
  └── Wallet connected, holds NFT or has staked NFT → Show full page content
```

Gate check is done via `frxStaking.effectivePassHolder(address)` after staking is deployed. This keeps access valid for users whose pass is custodied by the staking contract. Before staking exists, `frontierPass.holdsPass(address)` can be used as a temporary fallback.

### 7.3 Chain Switching UX

When user selects a different chain:
1. Trigger MetaMask chain switch via `useSwitchChain()`
2. All contract addresses update to the new chain's addresses
3. All balances and states refresh
4. URL does NOT change — chain is a global state, not a route parameter

### 7.4 Responsive Breakpoints

- Mobile: < 768px (single column, simplified game UIs)
- Tablet: 768px - 1024px (two column grids)
- Desktop: > 1024px (full layout as wireframed above)
