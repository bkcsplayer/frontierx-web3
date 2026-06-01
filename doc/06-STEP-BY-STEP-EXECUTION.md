# FrontierX Protocol — Step-by-Step Execution Guide

> **Doc #**: 06 — THE EXECUTION PLAYBOOK  
> **For**: Claude Code (Programmer)  
> **Read `AGENTS.md` and `DESIGN.md` first, then this document, then reference Docs 00-05 as indicated per step.**

---

## How to Use This Document

This document is your **execution order**. Complete each step fully before moving to the next. Every step ends with an **ALIGNMENT CHECKPOINT** — a set of verification criteria that must ALL pass before proceeding.

Before implementation, read:

1. `AGENTS.md` for repository operating rules.
2. `DESIGN.md` for the canonical UI design system.
3. This execution playbook.

## Docker Windows Mode

For Docker Desktop on Windows, follow `doc/07-DOCKER-WINDOWS.md`.

All host-exposed Docker ports must use the `983x` series:

- `9830` -> frontend container port `3000`
- `9831` -> Hardhat container port `8545`

Do not expose local Docker services on default host ports such as `3000` or `8545`.

**If an alignment check fails**: Fix the issue, re-run the check, do NOT move forward.

**Reference pattern**: Each step says "See Doc XX, Section Y" — read that section for detailed specs, code, and design decisions.

---

## PHASE 1: FOUNDATION (Smart Contracts)

### Step 1: Initialize Hardhat Project

**Reference**: Doc 01, Section 7

**Actions**:
1. Create `frontierx-contracts/` directory
2. Initialize Hardhat with TypeScript:
   ```bash
   mkdir frontierx-contracts && cd frontierx-contracts
   npx hardhat init
   # Select: TypeScript project
   ```
3. Install dependencies:
   ```bash
   npm install @openzeppelin/contracts
   npm install --save-dev @nomicfoundation/hardhat-toolbox dotenv
   ```
4. Configure `hardhat.config.ts` — See Doc 01, Section 7
5. Create `.env` from `.env.example` — See Doc 01, Section 7
6. Create directory structure: `contracts/`, `scripts/`, `test/`

**ALIGNMENT CHECKPOINT 1**:
```
□ hardhat.config.ts has sepolia, polygon, base networks configured
□ OpenZeppelin contracts installed (check node_modules/@openzeppelin)
□ `npx hardhat compile` runs without error (even if no contracts yet)
□ .env.example exists with all required vars documented
□ Directory structure matches Doc 01, Section 7
```

---

### Step 2: Implement FRXToken.sol (ERC-20)

**Reference**: Doc 01, Section 2

**Actions**:
1. Create `contracts/FRXToken.sol` — copy the full implementation from Doc 01 Section 2
2. Key features to verify:
   - `mint()` restricted to staking contract only
   - `burn()` public — anyone can burn own tokens
   - `depositToTreasury()` transfers to treasury wallet
   - `totalMinted`, `totalBurned`, `totalTreasuryDeposited`, and `treasuryBalance()` tracked/readable
   - `circulatingSupply()` view function
3. Create `test/FRXToken.test.ts` — test all functions listed in Doc 01 Section 9

**ALIGNMENT CHECKPOINT 2**:
```
□ FRXToken.sol compiles: `npx hardhat compile`
□ All test cases pass: `npx hardhat test test/FRXToken.test.ts`
□ Test covers: mint restriction, burn, treasury deposit, circulatingSupply
□ Events emit correctly: TokensMinted, TokensBurned, TreasuryDeposit
```

---

### Step 3: Implement FrontierPass.sol (ERC-721 NFT)

**Reference**: Doc 01, Section 3

**Actions**:
1. Create `contracts/FrontierPass.sol` — full implementation from Doc 01 Section 3
2. IMPORTANT: Include the reveal pattern code from Section 3 bottom
3. Key features:
   - MAX_SUPPLY = 100
   - mintPrice set in constructor (differs per chain)
   - Rarity assigned during reveal from a fixed pool
   - ERC2981 royalties (5%)
   - `holdsPass()` view function for gate checking
   - `tokensOfOwner()` for listing user's NFTs
   - `reveal()` for assigning rarity and setting real baseURI after IPFS upload
4. Create `test/FrontierPass.test.ts`

**ALIGNMENT CHECKPOINT 3**:
```
□ FrontierPass.sol compiles
□ All test cases pass
□ Mint with correct payment succeeds
□ Mint with insufficient payment reverts
□ Cannot mint beyond 100
□ Reveal assigns fixed rarity pool: 60 common, 25 rare, 10 epic, 5 legendary
□ holdsPass() returns true for holders, false for non-holders
□ tokensOfOwner() returns correct array
□ Royalty info returns 5%
□ reveal() sets real baseURI correctly
```

---

### Step 4: Implement FRXStaking.sol, FRXLottery.sol, CrystalForge.sol

**Reference**: Doc 01, Sections 4, 5, 6

**Actions**:
1. Create `contracts/FRXStaking.sol` — Doc 01 Section 4
2. Create `contracts/FRXLottery.sol` — Doc 01 Section 5
3. Create `contracts/CrystalForge.sol` — Doc 01 Section 6
4. Create test files for each
5. Create integration test: deploy all contracts, run full cycle

**Key integration test scenario**:
```
1. Deploy FRXToken, FrontierPass, FRXStaking, FRXLottery, CrystalForge
2. Set staking contract on FRXToken
3. User mints an NFT
4. Owner reveals FrontierPass metadata and assigns rarity
5. User stakes the NFT
6. Advance time by 1 day
7. User claims rewards based on revealed rarity
8. User enters lottery with 10 FRX
9. Advance time by 24 hours
10. Draw winner
11. Verify treasury received 10% and winner received 90%
12. User requests crystal forge with 5 FRX
13. Settle the forge request in a later block
14. Verify result and balance changes
```

**ALIGNMENT CHECKPOINT 4**:
```
□ All 5 contracts compile together without conflicts
□ FRXStaking: stake/unstake/claim work correctly
□ FRXStaking: staking before FrontierPass reveal is rejected
□ FRXStaking: rarity multipliers produce correct rates
□ FRXStaking: per-second accumulation is accurate
□ FRXLottery: entry and draw work, 10/90 split verified
□ FRXLottery: 24h interval enforced
□ FRXLottery: entry cap prevents unbounded draw gas
□ FRXLottery: direct-token-transfer recovery works
□ CrystalForge: results fall within probability ranges
□ CrystalForge: forge request and later settlement both work
□ CrystalForge: expired requests can be refunded after the blockhash window
□ CrystalForge: correct token transfers on win/loss
□ Integration test passes: full lifecycle works end-to-end (`test/FullLifecycle.test.ts`)
□ All contracts' events are correct and can be indexed by frontend
```

---

## PHASE 2: NFT ART & METADATA

### Step 5: Generate NFT Art

**Reference**: Doc 02, Sections 1-2

**Actions**:
1. Create `scripts/generate-nft-art.js` — SVG generation script from Doc 02
2. Run the script to generate the Pinata Free-compatible shared rarity SVG set
3. Generate `rarity-map.json` with the distribution
4. Visually inspect a sample from each rarity tier:
   - Open a Common (#1 or similar) — should have blue accent
   - Open a Rare — should have purple accent
   - Open an Epic — should have gold accent
   - Open a Legendary — should have rainbow gradient

**ALIGNMENT CHECKPOINT 5**:
```
□ 4 shared revealed SVG files generated in `nft-art/*.svg` plus `nft-art/placeholder.svg`
□ rarity-map.json exists with correct distribution
□ Distribution: ~60 common, ~25 rare, ~10 epic, ~5 legendary
□ Each sampled SVG renders correctly in a browser
□ Visual quality: cards look professional, not broken
□ Each card has: project name, "ACCESS PASS", rarity label, token number
□ Colors match design spec (blue/purple/gold/rainbow)
□ Each card's generative pattern is unique
```

---

### Step 6: Generate Metadata & Prepare for IPFS

**Reference**: Doc 02, Sections 3-5

**Actions**:
1. Create `scripts/generate-metadata.js` — from Doc 02 Section 4
2. Create `scripts/upload-to-pinata.js` — from Doc 02 Section 5
3. Run metadata generation (will use placeholder CID initially)
4. Verify metadata JSON schema matches OpenSea standard
5. Create placeholder metadata and placeholder image

**NOTE**: Actual IPFS upload happens during deployment phase (Step 18). For now, ensure scripts work and metadata is correctly structured.

**ALIGNMENT CHECKPOINT 6**:
```
□ generate-metadata.js produces 400 rarity-folder JSON files + placeholder.json + collection.json
□ Each JSON file follows OpenSea metadata standard (Doc 02, Section 3)
□ Attributes include: Rarity, Tier, Staking Multiplier, Daily FRX Yield, Pass Number
□ upload-to-pinata.js script exists and is syntactically correct
□ Placeholder metadata and placeholder SVG exist for pre-reveal state
□ rarity-map.json distribution is consistent with the on-chain fixed rarity pool
```

---

## PHASE 3: FRONTEND CORE

### Step 7: Initialize Next.js Project

**Reference**: Doc 03, Section 1

**Actions**:
1. Create Next.js 14 project:
   ```bash
   npx create-next-app@latest frontierx-web --typescript --tailwind --app --src=false
   ```
2. Install Web3 dependencies:
   ```bash
   npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
   ```
3. Install i18n:
   ```bash
   npm install react-i18next i18next i18next-browser-languagedetector
   ```
4. Install UI utilities:
   ```bash
   npm install react-markdown framer-motion lucide-react
   ```
5. Set up directory structure matching Doc 03 Section 1
6. Copy the canonical logo asset from `doc/logo.png` to `frontierx-web/public/logo.png`
7. Read root `DESIGN.md`, then configure Tailwind with CSS variables — Doc 03, Section 2.2
8. Set up fonts — Doc 03, Section 2.3
9. Create base UI components: Card, Button, Modal, Loading — Doc 03, Section 2.4

**ALIGNMENT CHECKPOINT 7**:
```
□ `npm run dev` starts without errors
□ TailwindCSS works (test with a utility class)
□ CSS variables from design system are applied (Doc 03 Section 2.2)
□ `public/logo.png` exists and matches `doc/logo.png`
□ Fonts load correctly (Orbitron, Sora, JetBrains Mono, Noto Sans SC)
□ Base Card component renders with glassmorphism effect
□ Background is dark (#050510)
□ Production UI uses SVG icons, not emoji icons
□ Directory structure matches Doc 03, Section 1
```

---

### Step 8: Wallet Connection & Chain Configuration

**Reference**: Doc 03, Sections 4.1 and 4.2

**Actions**:
1. Create `WalletProvider.tsx` — Doc 03 Section 4.2
2. Create `lib/utils/chains.ts` — Doc 03 Section 4.1
3. Create `ConnectButton.tsx` component
4. Create `ChainSwitcher.tsx` component
5. Wrap app in WalletProvider in `layout.tsx`
6. Test: Connect MetaMask, switch chains

**NOTE**: You need a WalletConnect Cloud Project ID. Create at cloud.walletconnect.com. For development, you can use a test project ID.

**ALIGNMENT CHECKPOINT 8**:
```
□ WalletConnect modal appears when clicking connect button
□ MetaMask connects successfully
□ Connected address displays correctly (truncated: 0x1a2b...3c4d)
□ Chain switcher shows all 3 chains: Sepolia, Polygon, Base
□ Switching chains triggers MetaMask chain switch prompt
□ Disconnect works
□ Reconnect on page refresh works (autoConnect)
```

---

### Step 9: Landing Page

**Reference**: Doc 03, Section 3.1

**Actions**:
1. Build the landing page following the wireframe in Doc 03, Section 3.1
2. Sections to implement:
   - Hero: Title, subtitle, CTAs, animated background
   - Stats bar: 4 cards (NFTs, Token, Games, AI Agents)
   - How It Works: Animated flow diagram
   - Token Economics: $FRX + NFT side-by-side cards
   - Live Stats: Treasury, Burned, Minted, Circulating (read from contracts)
   - Footer
3. Apply design system: glassmorphism cards, glow effects, grid background
4. Add scroll animations (Framer Motion)
5. **Make it visually impressive** — this is the first page visitors see

**ALIGNMENT CHECKPOINT 9**:
```
□ Landing page renders all sections
□ Hero section has animated background effect
□ Stats bar shows placeholder data (or reads from contract if deployed)
□ "How It Works" flow is clear and visually appealing
□ Token Economics section explains both tokens
□ Footer shows correct company info
□ Page is responsive (mobile, tablet, desktop)
□ Design quality: NO generic AI aesthetics — unique, memorable, cyberpunk-luxury
□ Overall impression: "This looks professional and intentional"
```

---

### Step 10: Mint Page + NFT Gate

**Reference**: Doc 03, Sections 3.2 and 5

**Actions**:
1. Build Mint Page following wireframe in Doc 03 Section 3.2
2. Implement components:
   - `MintCard.tsx`: Chain selector, price display, mint button
   - `NFTGrid.tsx`: Display owned NFTs
   - `NFTCard.tsx`: Single NFT card with rarity indicator
   - `NFTGate.tsx`: Access control component (Doc 03 Section 5; use effective pass access once staking exists)
3. Create contract hooks:
   - `useFrontierPass.ts` — Doc 03 Section 4.3
4. Implement gated content section at bottom of mint page:
   - Without NFT: "Access Denied" message
   - With NFT: "Welcome, Pass Holder!" + access links
5. Wire up mint function to contract

**ALIGNMENT CHECKPOINT 10**:
```
□ Chain selector toggles between Sepolia/Polygon/Base
□ Mint price updates based on selected chain
□ Supply counter shows X/100 minted
□ Mint button triggers MetaMask transaction
□ After mint: NFT appears in "My NFTs" grid
□ NFT cards show rarity badge (color-coded)
□ NFT Gate: without NFT → "Access Denied" shown
□ NFT Gate: with NFT → welcome content shown
□ Mobile responsive
```

---

## PHASE 4: GAME ZONE

### Step 11: Staking Page

**Reference**: Doc 03, Section 3.3

**Actions**:
1. Build Staking Page following wireframe
2. Implement components:
   - `StakePanel.tsx`: Stake/unstake interface
   - `RewardsDisplay.tsx`: Pending rewards (auto-updating)
   - `StakedNFTList.tsx`: List staked NFTs with daily rates
3. Create `useFRXStaking.ts` hook
4. Implement auto-refresh for pending rewards (poll every 10s)
5. Approve NFT for staking contract (requires separate approval tx)

**ALIGNMENT CHECKPOINT 11**:
```
□ Shows total staked NFTs, pending rewards, total earned
□ "Claim All" button claims from all staked NFTs
□ Individual stake/unstake per NFT works
□ Staking requires approval (NFT approve for staking contract)
□ Pending rewards update in real-time (or near real-time)
□ Daily rate shown per NFT with rarity multiplier
□ Unstake returns NFT + claims pending rewards
□ Available (unstaked) NFTs shown separately from staked
```

---

### Step 12: Arena — Lottery

**Reference**: Doc 03, Section 3.4 (top half)

**Actions**:
1. Build Lottery section of Arena page
2. Implement NFT gate at page level (Arena requires NFT)
3. Components:
   - Pool size display
   - Entry count
   - Countdown timer to next draw
   - Entry amount input (min 10 FRX)
   - Enter button (requires FRX approval for lottery contract)
   - Previous winners list
4. Create `useFRXLottery.ts` hook
5. Implement `CountdownTimer.tsx` component
6. Implement `drawWinner()` trigger (visible to all, callable after 24h)

**ALIGNMENT CHECKPOINT 12**:
```
□ Arena page blocked for non-NFT holders (NFTGate works)
□ Staked NFT holders still pass NFTGate via `FRXStaking.effectivePassHolder`
□ Current pool amount displays correctly
□ Entry count is accurate
□ Countdown timer counts down to next draw
□ Can enter with custom amount (≥10 FRX)
□ Entering requires FRX approval then transfer
□ Draw button appears when timer reaches 0
□ Drawing selects winner and distributes 90/10
□ Previous winners list shows history
□ User's entries in current round are displayed
```

---

### Step 13: Arena — Crystal Forge

**Reference**: Doc 03, Section 3.4 (bottom half)

**Actions**:
1. Build Crystal Forge section
2. Create animated crystal visual (CSS or Canvas):
   - Idle state: rotating/pulsing crystal
   - Forging state: shaking/glowing animation
   - Result state: 
     - SHATTER: crystal breaks apart (red particles)
     - GLOW: gentle glow (green)
     - BLAZE: fire effect (orange)
     - SUPERNOVA: explosion effect (rainbow, confetti)
3. Create `useCrystalForge.ts` hook
4. Show recent forge history (live-updating)
5. Implement cost: 5 FRX per forge (requires approval)

**ALIGNMENT CHECKPOINT 13**:
```
□ Crystal visual renders and animates
□ Forge flow triggers: approval → request forge tx → settle tx in later block → result animation
□ Correct result displayed (SHATTER/GLOW/BLAZE/SUPERNOVA)
□ Token balance updates after forge
□ Win amounts are correct: 0 / 7.5 / 10 / 15 FRX
□ Result animation matches the outcome
□ Recent forge history updates with new entries
□ Game is fun and feels responsive
□ Outcome probabilities: 50/25/15/10 (verified by multiple plays on testnet)
```

---

## PHASE 5: AI INTEGRATION

### Step 14: Backend — AI API Routes

**Reference**: Doc 04, Sections 2-5

**Actions**:
1. Create burn verification module: `lib/api/verify-burn.ts` — Doc 04, Section 3
2. Create AI client with fallback: `lib/api/ai-client.ts` — Doc 04, Section 4
3. Create API route: `app/api/ai/scout/route.ts` — Doc 04, Section 5.2
4. Create API route: `app/api/ai/content/route.ts` — Doc 04, Section 5.3
5. Create API route: `app/api/ai/distill/route.ts` — Doc 04, Section 5.4
6. Add rate limiting middleware — Doc 04, Section 7.1
7. Set environment variables in .env.local

**NOTE ON AI APIs**: 
- DeepSeek API endpoint: `https://api.deepseek.com` (international/海外版)
- MiniMax API endpoint: Check official international docs at platform.minimaxi.com
- Claude Code should verify the exact API format by checking the official docs before implementing

**ALIGNMENT CHECKPOINT 14**:
```
□ verify-burn.ts compiles and exports verifyBurn function
□ ai-client.ts successfully calls DeepSeek API (test with curl first)
□ ai-client.ts falls back to MiniMax on DeepSeek failure
□ /api/ai/scout returns AI response with valid burn tx
□ /api/ai/scout returns 403 with invalid/missing burn tx
□ /api/ai/content works for all 4 platforms (linkedin, twitter, wechat, xiaohongshu)
□ /api/ai/distill processes text input and returns structured output
□ Rate limiting blocks excessive requests (>10/min)
□ No API keys exposed in frontend bundle (check with browser dev tools)
```

---

### Step 15: Frontend — AI Agent Hub UI

**Reference**: Doc 03, Section 3.5

**Actions**:
1. Build AI Hub page with NFT gate
2. Create agent selection cards (3 cards layout)
3. Implement each agent's expanded UI:
   - Scout: URL/business name input → Report output
   - Content: Topic input + platform selector → Generated content
   - Distill: Text area input → Structured knowledge card
4. Create `useAIAgent.ts` hook — Doc 04, Section 6
5. Implement burn → verify → AI call flow
6. Render AI response as markdown

**Complete flow to implement per agent**:
```
User enters input
  → Clicks action button
  → Confirmation modal: "Burn X $FRX?"
  → User confirms
  → Frontend calls FRXToken.burn(X) via wagmi
  → Wait for tx confirmation
  → Show loading state
  → POST to /api/ai/[agent] with txHash + payload
  → Display result (markdown rendered)
```

**ALIGNMENT CHECKPOINT 15**:
```
□ AI Hub page blocked for non-NFT holders
□ 3 agent cards display correctly
□ Clicking "Launch" expands the agent interface
□ Burn confirmation modal appears before execution
□ After burn: loading state shown
□ AI response renders as formatted markdown
□ Error handling: insufficient balance, failed burn, API error
□ Each agent works end-to-end:
  □ Scout: input URL → get report
  □ Content: input topic + platform → get content
  □ Distill: input text → get knowledge card
□ Token balance decreases correctly after each use
□ Response quality: AI output is useful and well-formatted
```

---

### Step 16: Dashboard Page

**Reference**: Doc 03, Section 3.6

**Actions**:
1. Build Dashboard page (public, no gate)
2. Implement stat cards reading from contracts:
   - Treasury balance (`frxToken.treasuryBalance()`)
   - Total burned (`frxToken.totalBurned()`)
   - Total minted (`frxToken.totalMinted()`)
   - Circulating supply (`frxToken.circulatingSupply()`)
3. NFT stats:
   - NFTs minted (`frontierPass.totalSupply()`)
   - NFTs staked (count from staking contract events)
4. Recent activity feed (parse contract events)
5. Chain status indicators
6. Auto-refresh every 30s

**ALIGNMENT CHECKPOINT 16**:
```
□ All 4 token stats display correctly
□ Numbers formatted as integers (no 18 decimal places)
□ NFT mint progress bar shows X/100
□ Recent activity feed shows real events
□ Stats auto-refresh periodically
□ Chain status shows which chains are active
□ Dashboard is publicly accessible (no NFT gate)
□ Mobile responsive
```

---

## PHASE 6: POLISH & DEPLOY

### Step 17: Internationalization (i18n)

**Reference**: Doc 03, Section 6

**Actions**:
1. Set up i18n configuration
2. Create `en.json` and `zh.json` — full translations from Doc 03 Section 6
3. Add language switcher to Navbar
4. Wrap all user-facing text in `t()` calls
5. Test every page in both languages

**ALIGNMENT CHECKPOINT 17**:
```
□ Language switcher visible in navbar
□ Clicking EN/CN switches all text
□ All pages render correctly in English
□ All pages render correctly in Chinese
□ No hardcoded text remains (all via t())
□ Language preference persists on page refresh
□ AI Agent prompts adapt to user's language
□ Chinese characters render correctly (Noto Sans SC loads)
```

---

### Step 18: Deploy Contracts + IPFS Upload

**Reference**: Doc 05, Sections 2 and 4

**Actions**:
1. Upload NFT art to Pinata → get Images CID
   ```bash
   node scripts/validate-nft-assets.js
   node scripts/upload-to-pinata.js --target=images --confirm-upload
   ```
2. Generate final metadata with Images CID
   ```bash
   node scripts/generate-metadata.js --imagesCID=QmImagesCID/nft-art --feeRecipient=0xYourTreasuryOrRoyaltyWallet
   node scripts/validate-nft-assets.js --require-final-cid --pinata-free
   ```
3. Upload metadata to Pinata → get Metadata CID
   ```bash
   node scripts/upload-to-pinata.js --target=metadata --confirm-upload
   ```
4. Deploy contracts to Sepolia:
   ```bash
   npm run deploy:sepolia
   ```
5. Record all addresses in `deployments/addresses.json` and copy generated `deployments/frontend-env.*.env` values into frontend/Vercel env vars
6. Mint at least one pass on Sepolia before reveal (contract requires `totalSupply() > 0`; minting closes after reveal)
7. Call `reveal()` on Sepolia FrontierPass with metadata CID:
   ```bash
   METADATA_CID=QmMetadataCID/nft-metadata npm run reveal -- --network sepolia
   ```
8. Verify all Sepolia contracts on Etherscan
9. Test full flow on Sepolia
10. Deploy to Polygon (same process; requires `ALLOW_MAINNET_DEPLOY=true`)
11. Deploy to Base (same process; requires `ALLOW_MAINNET_DEPLOY=true`)
12. Reveal Polygon/Base only when final metadata and minting policy are confirmed (`ALLOW_MAINNET_REVEAL=true` plus `CONFIRM_REVEAL_NETWORK=<network>`)

**ALIGNMENT CHECKPOINT 18**:
```
□ 4 shared revealed NFT rarity images plus placeholder image accessible on IPFS (verify with gateway URL)
□ 400 rarity-folder metadata files plus placeholder/collection metadata accessible on IPFS
□ Total uploaded file count fits Pinata Free budget: 407/500 files
□ Metadata JSON schema matches OpenSea standard
□ All 5 contracts deployed on Sepolia
□ All 5 contracts deployed on Polygon
□ All 5 contracts deployed on Base
□ All contracts verified on respective block explorers
□ FRXToken.stakingContract is correctly set on each chain
□ FrontierPass is revealed only after at least one mint, and not before the intended minting phase closes
□ Full lifecycle test passes on Sepolia:
  □ Mint NFT → Stake → Wait → Claim FRX → Play lottery → Forge crystal → AI agent
□ Addresses correctly recorded in deployment manifest
□ Frontend addresses.ts updated with all deployment addresses
```

---

### Step 19: Deploy Frontend + Final QA

**Reference**: Doc 05, Sections 3 and 6

**Actions**:
1. Push code to Git repository
2. Connect repository to Vercel
3. Set all environment variables in Vercel
4. Deploy to Vercel
5. Configure domain: `frontierx.khtain.com`
6. Wait for SSL certificate provisioning
7. Run full QA checklist:

**FINAL ALIGNMENT CHECKPOINT 19 — PRODUCTION QA**:
```
General:
□ https://frontierx.khtain.com loads correctly
□ SSL certificate is valid
□ No console errors in browser
□ Page load time < 3 seconds

Wallet:
□ MetaMask connects on desktop Chrome
□ MetaMask connects on mobile
□ Chain switching works for all 3 chains
□ Disconnect/reconnect works

Landing Page:
□ Hero section renders with animation
□ Live stats update from contracts
□ All links/buttons work
□ Responsive on mobile

Mint:
□ Can mint NFT on Sepolia (test chain)
□ Can mint NFT on Polygon
□ Can mint NFT on Base
□ Minted NFT appears in "My NFTs"
□ NFT appears on OpenSea (Polygon + Base)
□ NFT Gate: Access granted after mint
□ NFT Gate: Access denied without NFT

Stake:
□ Can stake NFT
□ Rewards accumulate over time
□ Can claim rewards
□ Can unstake (returns NFT + claims)
□ Rarity multiplier applied correctly

Arena:
□ NFT gate blocks non-holders
□ Lottery: can enter, draw works
□ Crystal Forge: request and settlement flow works, results display
□ Animations work smoothly

AI Hub:
□ NFT gate blocks non-holders
□ Scout agent: returns report
□ Content agent: all 4 platforms work
□ Distill agent: processes text correctly
□ Burn verification working (rejects fake txs)
□ API keys not exposed in frontend

Dashboard:
□ All stats display correctly
□ Activity feed shows events
□ Auto-refresh works

i18n:
□ EN/CN toggle works on every page
□ All text translated
□ Chinese renders correctly

Performance:
□ No memory leaks (navigate between pages)
□ API response times < 5s for AI agents
□ Contract interactions < 15s including confirmations
```

---

## POST-LAUNCH

### LinkedIn Showcase Preparation

After all checkpoints pass, prepare for LinkedIn:

1. Take screenshots / screen recordings of:
   - Landing page (impressive hero)
   - Minting an NFT (tx flow)
   - Staking dashboard with rewards
   - Crystal Forge game (win animation)
   - AI Agent generating a report
   - Dashboard with live stats

2. Write a LinkedIn post explaining:
   - What you built (dual-token Web3 ecosystem)
   - Technical stack (Solidity + Next.js + AI APIs)
   - Three chains deployed (Sepolia + Polygon + Base)
   - AI integration innovation (token-powered AI agents)
   - Link to live site

3. Verify NFTs visible on:
   - OpenSea (Polygon collection page)
   - OpenSea (Base collection page)

---

## Emergency Procedures

### If a contract has a bug after mainnet deployment:
- Cannot upgrade (contracts are not upgradeable in V1)
- Options: pause contract (if pausable), or deploy new version and update frontend

### If AI API is down:
- Fallback from DeepSeek → MiniMax is automatic
- If both fail: error message shown to user, no FRX burned (burn happens first, but API failure means user already burned — consider implementing a refund mechanism or burn-after-success pattern)

### If IPFS content is unavailable:
- Pinata gateway may have downtime
- Fallback: use public IPFS gateway (slower)
- Long-term: pin to multiple IPFS services
