# Local Sepolia End-to-End Test Runbook

Use this checklist with **Docker web** at `http://localhost:9830` and **Sepolia contracts** already deployed (see `frontierx-contracts/deployments/addresses.json`).

## Before you start

1. **Docker** — `frontierx-web` on port `9830`, healthy.
2. **Wallet** — MetaMask on **Sepolia**, same account that minted/staked (`deployer` in addresses.json).
3. **Site network** — Navbar chain dropdown must show **Sepolia** (not Local). If it shows Local, Dashboard/Arena read Hardhat RPC and show zeros.
4. **Sepolia ETH** — Small balance for gas on each transaction.
5. **FRX from staking** — Lottery needs **10 FRX**, Crystal Forge **5 FRX**, AI agents **10–15 FRX**. Common pass earns **100 FRX/day** while staked. Claim on `/stake` when pending is enough.

Check on-chain status:

```bash
cd frontierx-contracts
npx hardhat run scripts/check-sepolia-demo.ts --network sepolia
```

## Test order (Checkpoint 18 lifecycle)

| # | Page | Action | Pass criteria |
|---|------|--------|----------------|
| 1 | `/stake` | **Claim** (or Claim All) | FRX balance increases; pending goes down |
| 2 | `/stake` | Confirm NFT #1 still staked | Arena/AI access via `effectivePassHolder` |
| 3 | `/arena` | Lottery: **Approve FRX** → **Enter** (≥10 FRX) | Tx confirms; round/pool UI updates |
| 4 | `/arena` | Forge: **Approve** → **Play** (5 FRX) | `ForgeRequested` tx; next block **Settle** | Result + history row |
| 5 | `/ai-hub` | Pick agent (e.g. Scout 10 FRX): burn → sign → API | Result panel; no 402 without burn |
| 6 | `/dashboard` | Refresh | Treasury, supply, forge/lottery stats non-zero on Sepolia |
| 7 | `/mint` | UI state | Sale closed after reveal (expected on current Sepolia deploy) |

## FRX timing (Common, 100 FRX/day)

Approximate wait **after stake** before claim covers:

| Target | FRX needed | ~Wait from 0 pending |
|--------|------------|----------------------|
| Crystal Forge | 5 | ~1.2 h |
| Lottery entry | 10 | ~2.4 h |
| AI Scout/Content | 10 | ~2.4 h |
| AI Distill | 15 | ~3.6 h |

You can **Claim** early and repeat as rewards accrue.

## Crystal Forge settle

1. `forge()` pulls 5 FRX and creates a pending request.
2. Wait **at least 1 block** on Sepolia.
3. Click **Settle** in the UI for that request id.
4. Outcome: Shatter / Glow / Blaze / Supernova (demo RNG).

## AI Hub

- `GET http://localhost:9830/api/ai/status` → `burnConsumptionReady: true`
- Docker must pass `DEEPSEEK_API_KEY` (and `SEPOLIA_RPC_URL` for burn verification).
- Flow: approve/burn FRX on-chain → sign message → API returns JSON.

## Known limitations (current Sepolia deploy)

- **Mint closed** — `reveal()` already ran; only 1/100 minted. Do not expect new mints on this deployment.
- **NFT image in wallet** — May cache old placeholder; site uses `/public/nft-art/{rarity}.svg` when revealed.
- **AbortError in dev** — Often cancelled RPC; safe to ignore if the tx succeeded.

## When all rows pass

Step **18** alignment (Sepolia slice) is done. Next: Step **19** (Vercel env, domain, production QA) when you choose to deploy.
