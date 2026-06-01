# FrontierX Protocol — Master Plan & Architecture Overview

> **Version**: 1.0  
> **Date**: 2026-05-31  
> **Author**: Project Architect (Design Phase)  
> **Executor**: Claude Code (Implementation Phase)  
> **Owner**: Kuo / FutureFrontier Technology Ltd.

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Project Name | **FrontierX Protocol** |
| Token A (ERC-20) | **$FRX** (FrontierX Token) |
| NFT (ERC-721) | **Frontier Access Pass** |
| Parent Brand | Khtain Block Technology Ltd. |
| Domain | `frontierx.khtain.com` |
| Purpose | Web3 + AI 能力展示平台，LinkedIn 作品集项目 |

---

## 2. Project Purpose

这是一个**完整的双币经济模型 Demo**，用于展示以下 Web3 全链路能力：

1. **ERC-20 Token 铸造** — $FRX 通过质押产出，无上限
2. **ERC-721 NFT Mint** — 100 个限量 Frontier Access Pass，4 个稀有度等级
3. **NFT 质押挖矿** — 质押 NFT 产出 $FRX
4. **Token 消耗场景** — 抽奖、游戏、AI Agent 调用
5. **NFT 门禁系统** — 持有 NFT 才能访问特定区域
6. **AI × Web3 融合** — Token 驱动的 AI Agent 服务
7. **多链部署** — Sepolia (测试) + Polygon PoS + Base (正式)

---

## 3. Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                 │
│  React 18 + TailwindCSS + wagmi v2 + viem + i18next     │
│  Wallet: MetaMask via WalletConnect v2                  │
│  Deploy: Vercel → frontierx.khtain.com                  │
├─────────────────────────────────────────────────────────┤
│                 BACKEND (Vercel Serverless)              │
│  Next.js API Routes (Edge Functions)                    │
│  AI: DeepSeek V3 (primary) / MiniMax M2.7 (fallback)   │
│  Burn Verification: viem on-chain read                  │
├─────────────────────────────────────────────────────────┤
│                 SMART CONTRACTS (Solidity)               │
│  Hardhat + OpenZeppelin + Solidity 0.8.20+              │
│  Chains: Sepolia | Polygon PoS | Base                   │
├─────────────────────────────────────────────────────────┤
│                    STORAGE                               │
│  NFT Metadata + Images: IPFS via Pinata                 │
└─────────────────────────────────────────────────────────┘
```

---

## 4. System Architecture Diagram

```
                        ┌──────────────────┐
                        │   User (Browser)  │
                        │   MetaMask Wallet │
                        └────────┬─────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐           ┌───────▼───────┐
              │  Frontend  │           │  Vercel API   │
              │  Next.js   │◄─────────►│  Serverless   │
              │  (wagmi)   │           │  Functions    │
              └─────┬──────┘           └───────┬───────┘
                    │                          │
         ┌──────────┴──────────┐       ┌───────┴───────┐
         │                     │       │               │
    ┌────▼────┐         ┌──────▼──┐  ┌─▼───────────┐   │
    │ Blockchain│        │  IPFS   │  │  AI APIs    │   │
    │ Contracts │        │ (Pinata)│  │ DeepSeek V3 │   │
    │           │        │         │  │ MiniMax M2.7│   │
    └────┬──────┘        └─────────┘  └─────────────┘   │
         │                                              │
    ┌────┴───────────────────────────┐                  │
    │         Smart Contracts        │                  │
    ├────────────────────────────────┤                  │
    │ FRXToken.sol       (ERC-20)    │◄─────────────────┘
    │ FrontierPass.sol   (ERC-721)   │   (burn verify)
    │ FRXStaking.sol     (Staking)   │
    │ FRXLottery.sol     (Lottery)   │
    │ CrystalForge.sol   (Game)      │
    └────────────────────────────────┘
```

---

## 5. Token Economics

### 5.1 $FRX (ERC-20) — FrontierX Token

| Parameter | Value |
|-----------|-------|
| Standard | ERC-20 |
| Total Supply | Unlimited (mint via staking) |
| Decimals | 18 (frontend displays as integer) |
| Mint Mechanism | Only StakingContract can mint |
| Burn Mechanism | Game contract burns, AI burn via direct transfer to 0x0 |

### 5.2 Frontier Access Pass (ERC-721) — NFT

| Parameter | Value |
|-----------|-------|
| Standard | ERC-721 + ERC2981 (Royalty) |
| Total Supply | 100 |
| Mint Price (Polygon) | 10 MATIC |
| Mint Price (Base) | 0.003 ETH |
| Mint Price (Sepolia) | 0.003 ETH |
| Royalty | 5% (EIP-2981) |
| Metadata Storage | IPFS (Pinata) |

### 5.3 Rarity Distribution

| Rarity | Count | Color | Staking Multiplier | Daily $FRX Output |
|--------|-------|-------|--------------------|--------------------|
| Common | 60 | Blue (#3B82F6) | 1x | 100 |
| Rare | 25 | Purple (#8B5CF6) | 1.5x | 150 |
| Epic | 10 | Gold (#F59E0B) | 2.5x | 250 |
| Legendary | 5 | Rainbow (gradient) | 5x | 500 |

### 5.4 Economic Flow

```
                     ┌──────────────┐
                     │  NFT Staking │
                     │   Pool       │
                     └──────┬───────┘
                            │ mint $FRX (per second, no cap)
                            ▼
                    ┌───────────────┐
                    │   $FRX Pool   │
                    │  (User Wallet)│
                    └───┬───┬───┬───┘
                        │   │   │
            ┌───────────┘   │   └───────────┐
            ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │  Lottery  │   │  Crystal  │   │ AI Agent  │
    │  (Daily)  │   │  Forge    │   │ Hub       │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │               │               │
     ┌────┴────┐          │               │
     │         │          ▼               ▼
     ▼         ▼      BURN 🔥          BURN 🔥
  Treasury   Winner
   (10%)     (90%)
```

### 5.5 Dashboard Panels

Frontend needs two persistent display panels:

1. **Treasury Balance** — Total $FRX accumulated from lottery 10% cut
2. **Total Burned** — Cumulative $FRX burned by games + AI Agent
3. **Total Minted** — Cumulative $FRX minted via staking
4. **Circulating Supply** — Total Minted - Treasury - Total Burned

---

## 6. Consumption Pricing

| Action | Cost ($FRX) | Destination |
|--------|-------------|-------------|
| Lottery Entry | Min 10 $FRX | 10% Treasury, 90% Winner |
| Crystal Forge Game | 5 $FRX / play | Burn (0x0) |
| AI: Search Visibility Scout | 10 $FRX | Burn (0x0) |
| AI: Smart Content Forge | 10 $FRX | Burn (0x0) |
| AI: Knowledge Distiller | 15 $FRX | Burn (0x0) |

---

## 7. Chain Configuration

### 7.1 Sepolia Testnet (Testing)

| Field | Value |
|-------|-------|
| Chain ID | 11155111 |
| RPC | `https://sepolia.infura.io/v3/{KEY}` or public |
| Explorer | `https://sepolia.etherscan.io` |
| NFT Mint Price | 0.003 ETH |
| Faucet | `https://sepoliafaucet.com` |

### 7.2 Polygon PoS (Mainnet 1)

| Field | Value |
|-------|-------|
| Chain ID | 137 |
| RPC | `https://polygon-bor-rpc.publicnode.com` |
| Explorer | `https://polygonscan.com` |
| NFT Mint Price | 10 MATIC |
| Native Token | MATIC |
| NFT Market | OpenSea (Polygon) |

### 7.3 Base (Mainnet 2)

| Field | Value |
|-------|-------|
| Chain ID | 8453 |
| RPC | `https://mainnet.base.org` |
| Explorer | `https://basescan.org` |
| NFT Mint Price | 0.003 ETH |
| Native Token | ETH |
| NFT Market | OpenSea (Base) |

---

## 8. Page Structure

```
frontierx.khtain.com
│
├── / (Landing Page)
│   ├── Hero Section — Project intro + connect wallet
│   ├── Token Economics Section — $FRX + NFT 介绍
│   ├── How It Works Section — 流程图解
│   └── Footer — Links + social
│
├── /mint (NFT Mint Page)
│   ├── Chain Selector (Sepolia / Polygon / Base)
│   ├── Mint Interface — 连接钱包 + Mint 按钮
│   ├── My NFTs — 显示已 Mint 的 NFT 列表
│   └── Rarity Info — 稀有度说明
│
├── /stake (Staking Page)
│   ├── Staking Dashboard — 已质押 NFT + 累积奖励
│   ├── Stake/Unstake Interface
│   └── Claim $FRX Button
│
├── /arena (Game Zone) ⚠️ NFT GATED
│   ├── Gate Check — 验证钱包持有 NFT
│   ├── Lottery — 每日抽奖
│   ├── Crystal Forge — 锻造水晶游戏
│   └── Leaderboard — 排行榜
│
├── /ai-hub (AI Agent Hub) ⚠️ NFT GATED
│   ├── Gate Check — 验证钱包持有 NFT
│   ├── AI Search Visibility Scout
│   ├── Smart Content Forge
│   └── Knowledge Distiller
│
├── /dashboard (Stats Dashboard)
│   ├── Treasury Balance
│   ├── Total Burned
│   ├── Total Minted
│   ├── Circulating Supply
│   └── Recent Activity Feed
│
└── Components (Global)
    ├── Navbar — Logo + Nav + Wallet + Language Switch (EN/CN)
    ├── WalletProvider — wagmi + WalletConnect
    ├── ChainSwitcher — 三链切换
    └── i18n Provider — next-intl or i18next
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Steps 1-4)
Smart contracts development + testing on Hardhat local

### Phase 2: NFT & Storage (Steps 5-6)
NFT art generation + IPFS upload + metadata setup

### Phase 3: Frontend Core (Steps 7-10)
Next.js project setup, wallet connection, Mint page, Stake page

### Phase 4: Game Zone (Steps 11-13)
Lottery + Crystal Forge + NFT gate implementation

### Phase 5: AI Integration (Steps 14-16)
Serverless API + 3 AI Agents + burn verification

### Phase 6: Polish & Deploy (Steps 17-19)
i18n, dashboard, deploy contracts, deploy frontend

---

## 10. Document Index

### Root Guidance Files

| Filename | Content |
|----------|---------|
| `README.md` | Human-facing project overview and doc map |
| `AGENTS.md` | AI agent operating rules, read order, safety rules |
| `DESIGN.md` | Canonical visual design system for UI generation |
| `doc/README.md` | Documentation index and naming note |

### Detailed Planning Docs

| Doc # | Filename | Content |
|-------|----------|---------|
| 00 | `00-MASTER-PLAN.md` | This document - architecture overview |
| 01 | `01-SMART-CONTRACTS.md` | All contract specs, interfaces, key code |
| 02 | `02-NFT-ART-METADATA.md` | NFT visual design, metadata, IPFS workflow |
| 03 | `03-FRONTEND-DESIGN.md` | Pages, components, UI/UX, i18n |
| 04 | `04-BACKEND-API.md` | Serverless functions, AI Agent integration |
| 05 | `05-DEPLOYMENT.md` | Chain deployment, Vercel, domain config |
| 06 | `06-STEP-BY-STEP-EXECUTION.md` | Step-by-step execution guide + alignment checks |
| 07 | `07-DOCKER-WINDOWS.md` | Docker Desktop on Windows local dev and 983x port rules |

---

## 11. For Claude Code: How to Use These Documents

**Read order**: `AGENTS.md` → `DESIGN.md` → 06 → 00 → (01~05 per step)

Document 06 is the **execution playbook**. It tells you exactly what to do in what order. Each step references the relevant section in documents 01-05 for detailed specs. After completing each step, run the alignment check described in that step before proceeding.

`DESIGN.md` is the **canonical design source**. When implementing UI, use `DESIGN.md` for visual rules and Doc 03 for page structure and behavior.

**Critical rules**:
1. Do NOT skip steps or combine steps
2. Each step ends with an alignment checkpoint — complete it before moving on
3. If an alignment check fails, fix issues before proceeding
4. All contracts must compile and pass tests before frontend work begins
5. Frontend must connect to local Hardhat node first, then deploy to testnets
