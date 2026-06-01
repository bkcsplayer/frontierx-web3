# FrontierX Protocol — NFT Art & Metadata Design

> **Doc #**: 02  
> **Referenced by**: Step-by-Step Execution Guide (Doc 06), Steps 5-6

---

## 1. Visual Design Concept: "Holographic Access Card"

### Design Direction

**Tone**: Cyberpunk-Luxury. A fusion of high-tech security pass and collectible holographic card.

**Visual metaphor**: Imagine a corporate access badge from 2077 — sleek, translucent, with shifting holographic elements. It should look like something you'd scan at the door of an exclusive AI research lab.

### Card Layout (Vertical, 800×1200px)

```
┌──────────────────────────────────┐
│  ┌──────────────────────────┐    │
│  │   FRONTIERX PROTOCOL     │    │  ← Top bar: Project name
│  │   ▣ ACCESS PASS          │    │  ← Pass type
│  └──────────────────────────┘    │
│                                  │
│       ┌──────────────┐           │
│       │              │           │
│       │   GENERATIVE │           │  ← Center: Unique generative art
│       │   GEOMETRIC  │           │     (different per rarity tier)
│       │   PATTERN    │           │
│       │              │           │
│       └──────────────┘           │
│                                  │
│  ┌──────────────────────────┐    │
│  │  RARITY: LEGENDARY       │    │  ← Rarity label
│  │  #0042 / 100              │    │  ← Token number / total
│  │  ─────────────────────    │    │
│  │  HOLDER: 0x1a2b...3c4d   │    │  ← (optional, dynamic)
│  └──────────────────────────┘    │
│                                  │
│  ═══════════════════════════     │  ← Holographic strip
│                                  │
└──────────────────────────────────┘
```

### Color Schemes by Rarity

| Rarity | Background | Accent | Glow Effect | Border |
|--------|-----------|--------|-------------|--------|
| Common | #0A0E1A (deep navy) | #3B82F6 (blue) | Blue glow | Thin solid blue |
| Rare | #0D0A1A (deep purple) | #8B5CF6 (purple) | Purple glow | Double line purple |
| Epic | #1A150A (dark gold) | #F59E0B (gold) | Gold shimmer | Thick gold border |
| Legendary | #0A0A0A (pure black) | Rainbow gradient | Rainbow aurora | Animated rainbow |

### Generative Art Pattern (Center Area)

Each NFT has a unique geometric pattern in its center. The pattern is generated algorithmically based on the token ID:

**Common**: Simple geometric grid — intersecting lines forming a circuit-board pattern. Blue lines on dark background.

**Rare**: Sacred geometry — overlapping circles (Flower of Life) with node points. Purple with subtle particle effects.

**Epic**: Crystal lattice — 3D-looking crystalline structure with gold wireframe. Gives impression of depth and luxury.

**Legendary**: Aurora storm — flowing organic lines with rainbow color shift. Looks alive, like trapped northern lights. Most visually complex.

---

## 2. Art Generation Strategy

### Option A: AI Image Generation (Recommended for quality)

Use an AI image generation tool (Midjourney, DALL·E, or Stable Diffusion) to create a contract-compatible rarity image set. For the Pinata Free budget, V1 should use one shared image per rarity plus a placeholder: 5 image files total.

**Prompt templates**:

**Common (60 images)**:
```
A sleek holographic access card, dark navy background (#0A0E1A), 
blue circuit-board pattern in the center, minimalist cyberpunk design, 
high-tech security badge aesthetic, glowing blue edges, 
text "FRONTIERX PROTOCOL" at top, text "ACCESS PASS" below, 
clean vector style, 800x1200, portrait orientation, 
digital art, no text artifacts --v 6.1 --ar 2:3
```

**Rare (25 images)**:
```
A premium holographic access card, deep purple background (#0D0A1A), 
sacred geometry flower of life pattern in purple (#8B5CF6), 
glowing purple node points, cyberpunk luxury design, 
double-line purple border, ethereal glow effect, 
800x1200, portrait, digital art --v 6.1 --ar 2:3
```

**Epic (10 images)**:
```
An elite holographic access card, dark gold background, 
3D crystal lattice pattern in gold (#F59E0B), 
wireframe crystalline structure with depth, luxury tech aesthetic, 
thick gold border, shimmering gold particles, 
800x1200, portrait, digital art --v 6.1 --ar 2:3
```

**Legendary (5 images)**:
```
A legendary holographic access card, pure black background, 
flowing aurora borealis pattern with rainbow colors, 
organic flowing lines trapped in glass, ethereal and alive, 
animated rainbow border effect (frozen frame), 
most premium tier, 800x1200, portrait, digital art --v 6.1 --ar 2:3
```

### Option B: Programmatic SVG Generation (Code-based)

If AI generation is not available, generate SVGs programmatically using `scripts/generate-nft-art.js`.

Important: because on-chain reveal assigns rarity after mint and `FrontierPass.tokenURI()` resolves `baseURI/<rarity>/<tokenId>.json`, metadata still needs every rarity/token combination. To stay under Pinata Free's 500-file cap, the default generator uses shared rarity images instead of every rarity/token image combination.

**Recommendation**: Use Option B (SVG) for V1 to keep things self-contained and avoid external dependencies. The SVG approach produces consistent, clean results and can be done entirely in code.

Implemented generator:

- Script: `scripts/generate-nft-art.js`
- Default output: `nft-art/common.svg`, `rare.svg`, `epic.svg`, `legendary.svg`
- Also outputs `nft-art/placeholder.svg`
- Rarity map: root `rarity-map.json`
- Distribution: 60 Common, 25 Rare, 10 Epic, 5 Legendary
- Pinata Free mode creates 4 shared rarity SVGs + 1 placeholder. Full image matrix mode remains available with `node scripts/generate-nft-art.js --mode=full`, but it does not fit the free Pinata file cap once metadata is included.

---

## 3. Metadata Schema

### Individual Token Metadata (`<rarity>/<tokenId>.json`)

Following OpenSea metadata standards:

```json
{
  "name": "Frontier Access Pass #0042",
  "description": "An exclusive access pass to the FrontierX Protocol ecosystem. Stake to earn $FRX tokens, unlock AI Agent Hub, Game Zone, and exclusive content.",
    "image": "ipfs://QmImageFolderHash/nft-art/epic.svg",
  "external_url": "https://frontierx.khtain.com",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Epic"
    },
    {
      "trait_type": "Tier",
      "value": "Gold"
    },
    {
      "trait_type": "Staking Multiplier",
      "value": "2.5x"
    },
    {
      "trait_type": "Daily FRX Yield",
      "display_type": "number",
      "value": 250
    },
    {
      "trait_type": "Pass Number",
      "display_type": "number",
      "value": 42,
      "max_value": 100
    },
    {
      "trait_type": "Access Level",
      "value": "Full"
    }
  ]
}
```

### Collection Metadata (collection.json)

```json
{
  "name": "Frontier Access Pass",
  "description": "100 exclusive access passes to the FrontierX Protocol — a dual-token Web3 × AI ecosystem. Each pass grants staking privileges for $FRX token generation, access to AI Agent Hub, and entry to the Game Zone.",
  "image": "ipfs://QmCollectionImageHash",
  "external_link": "https://frontierx.khtain.com",
  "seller_fee_basis_points": 500,
  "fee_recipient": "0xYourWalletAddress"
}
```

### Placeholder Metadata (before reveal)

```json
{
  "name": "Frontier Access Pass (Unrevealed)",
  "description": "This Frontier Access Pass has not been revealed yet. Stay tuned!",
  "image": "ipfs://QmPlaceholderImageHash",
  "attributes": [
    {
      "trait_type": "Status",
      "value": "Unrevealed"
    }
  ]
}
```

---

## 4. IPFS Upload Workflow

### Using Pinata

Current Pinata Free-compatible output is 407 files:

- 4 shared revealed SVGs: `nft-art/<rarity>.svg`
- 1 placeholder SVG: `nft-art/placeholder.svg`
- 400 revealed metadata files: `nft-metadata/<rarity>/<tokenId>.json`
- 1 placeholder metadata file
- 1 collection metadata file

This fits Pinata Free's 500-file cap with about 93 files of headroom.

### Step-by-Step Process

```bash
# 1. Generate shared rarity SVG images
node scripts/generate-nft-art.js
node scripts/validate-nft-assets.js --pinata-free

# 2. Upload image folder to Pinata
#    Result: ipfs://QmImagesFolderCID/nft-art/
#    Each shared image is accessible by rarity:
#    ipfs://QmImagesFolderCID/nft-art/common.svg
#    ipfs://QmImagesFolderCID/nft-art/rare.svg
#    ipfs://QmImagesFolderCID/nft-art/epic.svg
#    ipfs://QmImagesFolderCID/nft-art/legendary.svg

# 3. Generate metadata JSON files
node scripts/generate-metadata.js --imagesCID=QmImagesFolderCID/nft-art
node scripts/validate-nft-assets.js --require-final-cid --pinata-free

# 4. Upload metadata folder to Pinata
#    Result: ipfs://QmMetadataFolderCID/nft-metadata/
#    Each metadata accessible as:
#    ipfs://QmMetadataFolderCID/nft-metadata/common/1.json
#    ipfs://QmMetadataFolderCID/nft-metadata/rare/1.json

# 5. Update FrontierPass contract baseTokenURI
#    Call: frontierPass.reveal("ipfs://QmMetadataFolderCID/nft-metadata/")
```

### Metadata Generation Script

Implemented at `scripts/generate-metadata.js`.

Current output:
- `nft-metadata/<rarity>/1.json` through `nft-metadata/<rarity>/100.json`
- `nft-metadata/placeholder.json`
- `nft-metadata/collection.json`

The script reads root `rarity-map.json` generated by `scripts/generate-nft-art.js` and uses shared rarity image paths like `ipfs://<imagesCID>/common.svg` by default. Full image matrix mode is available with `--imageMode=full`.

---

## 5. Pinata Upload Script

Implemented at `scripts/upload-to-pinata.js`.

The script uses Node's built-in `fetch`/`FormData`, so no Pinata SDK dependency is required. It accepts either `PINATA_JWT` or `PINATA_API_KEY` + `PINATA_SECRET_KEY` from the environment.

Useful commands:

```bash
node scripts/upload-to-pinata.js --target=images --confirm-upload
node scripts/upload-to-pinata.js --target=metadata --confirm-upload
node scripts/upload-to-pinata.js --target=all --confirm-upload
```

---

## 6. Marketplace Compatibility Checklist

For OpenSea (Polygon + Base):

- [x] ERC-721 standard compliance (ERC721Enumerable)
- [x] EIP-2981 royalties (5%)
- [x] Metadata follows OpenSea standard schema
- [x] Images stored on IPFS (not centralized server)
- [x] `name`, `description`, `image`, `attributes` fields present
- [x] `external_url` points to project website
- [x] Collection-level metadata available
- [x] Contract verified on block explorer
