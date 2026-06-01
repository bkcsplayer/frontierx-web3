# FrontierX Protocol — Smart Contracts Design Document

> **Doc #**: 01  
> **Referenced by**: Step-by-Step Execution Guide (Doc 06), Steps 1-4

---

## 1. Contract Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Contract Ecosystem              │
├─────────────────────────────────────────────┤
│                                             │
│  FRXToken.sol (ERC-20)                      │
│    ├── Ownable                              │
│    ├── mint() — only callable by Staking    │
│    ├── burn() — anyone can burn own tokens  │
│    └── setStakingContract() — owner only    │
│                                             │
│  FrontierPass.sol (ERC-721)                 │
│    ├── ERC721Enumerable                     │
│    ├── ERC2981 (Royalties)                  │
│    ├── mint() — public payable              │
│    ├── MAX_SUPPLY = 100                     │
│    └── Rarity assigned on reveal            │
│                                             │
│  FRXStaking.sol                             │
│    ├── stake() — deposit NFT                │
│    ├── unstake() — withdraw NFT             │
│    ├── claim() — claim accumulated $FRX     │
│    ├── pendingRewards() — view function     │
│    └── Rarity-based multiplier              │
│                                             │
│  FRXLottery.sol                             │
│    ├── enter() — deposit $FRX              │
│    ├── drawWinner() — daily, anyone can call│
│    ├── 10% → treasury, 90% → winner        │
│    └── Uses blockhash for randomness        │
│                                             │
│  CrystalForge.sol                           │
│    ├── forge() — play game, burn $FRX       │
│    ├── 50% nothing, 25% 1.5x, 15% 2x,     │
│    │   10% 3x                               │
│    └── Net result: slightly deflationary    │
│                                             │
└─────────────────────────────────────────────┘
```

### Contract Dependency Graph

```
FRXToken ◄──── FRXStaking (mints $FRX)
    ▲               ▲
    │               │
    │          FrontierPass (NFT is staked)
    │
    ├──── FRXLottery (transfers $FRX)
    │
    └──── CrystalForge (burns $FRX)
```

### Deployment Order

1. FRXToken.sol
2. FrontierPass.sol
3. FRXStaking.sol (needs FRXToken + FrontierPass addresses)
4. FRXLottery.sol (needs FRXToken address)
5. CrystalForge.sol (needs FRXToken address)
6. Call `FRXToken.setStakingContract(stakingAddress)` to authorize minting

---

## 2. FRXToken.sol — ERC-20 Token

### Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FRXToken is ERC20, Ownable {
    address public stakingContract;
    
    // --- Stats Tracking ---
    uint256 public totalMinted;
    uint256 public totalBurned;
    uint256 public totalTreasuryDeposited;
    address public treasuryWallet;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event TreasuryDeposit(uint256 amount);
    event StakingContractUpdated(address indexed newContract);

    constructor(address _treasuryWallet) ERC20("FrontierX Token", "FRX") Ownable(msg.sender) {
        treasuryWallet = _treasuryWallet;
    }

    /// @notice Only staking contract can mint new tokens
    function mint(address to, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking contract");
        _mint(to, amount);
        totalMinted += amount;
        emit TokensMinted(to, amount);
    }

    /// @notice Anyone can burn their own tokens
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount);
    }

    /// @notice Deposit to treasury (called by Lottery contract)
    function depositToTreasury(uint256 amount) external {
        _transfer(msg.sender, treasuryWallet, amount);
        totalTreasuryDeposited += amount;
        emit TreasuryDeposit(amount);
    }

    /// @notice Owner sets staking contract address (one-time or updatable)
    function setStakingContract(address _staking) external onlyOwner {
        stakingContract = _staking;
        emit StakingContractUpdated(_staking);
    }

    /// @notice View: current treasury balance
    function treasuryBalance() public view returns (uint256) {
        return balanceOf(treasuryWallet);
    }

    /// @notice View: circulating supply = totalSupply - current treasury balance
    function circulatingSupply() external view returns (uint256) {
        return totalSupply() - treasuryBalance();
    }
}
```

### Key Design Decisions

- `totalMinted`, `totalBurned`, `totalTreasuryDeposited`, and current `treasuryBalance()` are available for dashboard display
- Only the staking contract can mint — this prevents unauthorized inflation
- `burn()` is public — games and AI burn flow call this
- Treasury wallet is a separate EOA, not the contract itself (simpler, avoids locked funds)
- `depositToTreasury()` is a transfer function, not a burn — treasury funds remain accessible

---

## 3. FrontierPass.sol — ERC-721 NFT

### Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract FrontierPass is ERC721Enumerable, ERC2981, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 100;
    uint256 private constant COMMON_SUPPLY = 60;
    uint256 private constant RARE_SUPPLY = 25;
    uint256 private constant EPIC_SUPPLY = 10;

    uint256 public mintPrice;
    string public baseTokenURI;
    string public placeholderURI;
    bool public revealed;

    uint256 private _nextTokenId = 1;

    // Rarity: 0=Common, 1=Rare, 2=Epic, 3=Legendary
    mapping(uint256 => uint8) public tokenRarity;
    mapping(uint256 => uint8) private _raritySlotOverrides;

    // Fixed 100-token rarity pool:
    // 60 Common, 25 Rare, 10 Epic, 5 Legendary.
    // Rarity is assigned during reveal, not during mint.

    event NFTMinted(address indexed to, uint256 tokenId);
    event Revealed(string baseTokenURI);

    constructor(
        uint256 _mintPrice,
        string memory _placeholderURI,
        address royaltyReceiver
    ) ERC721("Frontier Access Pass", "FAP") Ownable(msg.sender) {
        require(_mintPrice > 0, "Mint price required");
        require(bytes(_placeholderURI).length > 0, "Placeholder URI required");
        require(royaltyReceiver != address(0), "Royalty receiver required");

        mintPrice = _mintPrice;
        placeholderURI = _placeholderURI;
        _setDefaultRoyalty(royaltyReceiver, 500); // 5%
    }

    function mint() external payable {
        require(_nextTokenId <= MAX_SUPPLY, "Max supply reached");
        require(!revealed, "Sale closed after reveal");
        require(msg.value == mintPrice, "Incorrect payment");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId);
    }

    function reveal(string memory _realBaseURI) external onlyOwner {
        require(!revealed, "Already revealed");
        require(totalSupply() > 0, "No tokens minted");
        require(bytes(_realBaseURI).length > 0, "Base URI required");

        uint256 supply = totalSupply();
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            supply,
            address(this)
        )));

        for (uint256 i = 0; i < supply; i++) {
            uint256 remaining = MAX_SUPPLY - i;
            uint256 slot = uint256(keccak256(abi.encodePacked(seed, i))) % remaining;
            uint256 lastSlot = remaining - 1;
            uint256 tokenId = tokenByIndex(i);

            tokenRarity[tokenId] = _drawRarity(slot, lastSlot);
        }

        baseTokenURI = _realBaseURI;
        revealed = true;

        emit Revealed(_realBaseURI);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return placeholderURI;
        }

        string memory rarityFolder = _rarityToFolder(tokenRarity[tokenId]);
        return string(abi.encodePacked(baseTokenURI, rarityFolder, "/", tokenId.toString(), ".json"));
    }

    /// @notice Check if address holds at least one NFT (for gate check)
    function holdsPass(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }

    /// @notice Get all token IDs owned by an address
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{ value: address(this).balance }("");
        require(success, "Withdraw failed");
    }

    // Required overrides for ERC721Enumerable + ERC2981
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721Enumerable, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _drawRarity(uint256 slot, uint256 lastSlot) internal returns (uint8) {
        uint8 rarity = _rarityAtSlot(slot);
        uint8 lastRarity = _rarityAtSlot(lastSlot);

        _raritySlotOverrides[slot] = lastRarity + 1;

        return rarity;
    }

    function _rarityAtSlot(uint256 slot) internal view returns (uint8) {
        uint8 overrideValue = _raritySlotOverrides[slot];
        if (overrideValue != 0) {
            return overrideValue - 1;
        }

        if (slot < COMMON_SUPPLY) return 0;
        if (slot < COMMON_SUPPLY + RARE_SUPPLY) return 1;
        if (slot < COMMON_SUPPLY + RARE_SUPPLY + EPIC_SUPPLY) return 2;
        return 3;
    }

    function _rarityToFolder(uint8 rarity) internal pure returns (string memory) {
        if (rarity == 0) return "common";
        if (rarity == 1) return "rare";
        if (rarity == 2) return "epic";
        return "legendary";
    }
}
```

### Key Design Decisions

- `holdsPass()` is a convenience view function for frontend gate checking
- `tokensOfOwner()` returns all NFTs owned — needed for "My NFTs" display
- Rarity is assigned during `reveal()` from a fixed pool: 60 Common, 25 Rare, 10 Epic, 5 Legendary
- Minting closes after reveal so users cannot mint against already-known metadata
- `tokenURI` points to IPFS by rarity folder after reveal; before reveal it returns the placeholder URI
- ERC2981 royalty set at 5% — OpenSea and other markets will respect this
- Mint price is set in constructor, different per chain deployment, and exact payment is required

### IMPORTANT: Metadata Mapping

Since rarity is assigned during reveal, metadata should be organized by rarity folders on IPFS:
- `common/1.json`, `rare/7.json`, `epic/42.json`, `legendary/99.json`, etc.
- Each revealed token URI is derived from its on-chain `tokenRarity(tokenId)`.
- This avoids mint-time rarity reroll attacks, where a contract minter can revert unfavorable mints.

**Recommended approach**: Use a **reveal pattern**:
1. All tokens initially point to a `placeholder.json`.
2. After all 100 are minted (or after a deadline), owner calls `reveal()`
3. `reveal()` draws each minted token from a fixed rarity pool and sets the real `baseTokenURI`.
4. Minting closes after reveal.
5. The on-chain `tokenRarity` mapping determines which rarity folder each token uses.

The concrete reveal and fixed-pool draw logic is part of the `FrontierPass.sol` specification above.

---

## 4. FRXStaking.sol — NFT Staking

### Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFRXToken {
    function mint(address to, uint256 amount) external;
}

interface IFrontierPass {
    function tokenRarity(uint256 tokenId) external view returns (uint8);
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function revealed() external view returns (bool);
}

contract FRXStaking is IERC721Receiver, ReentrancyGuard, Ownable {
    IFRXToken public frxToken;
    IFrontierPass public frontierPass;

    // Base rate: 100 FRX per day for Common (in wei: 100 * 10^18)
    uint256 public constant BASE_RATE = 100 ether; // 100 FRX/day (with 18 decimals)
    uint256 public constant SECONDS_PER_DAY = 86400;

    // Rarity multipliers (basis points, 10000 = 1x)
    mapping(uint8 => uint256) public rarityMultiplier;

    struct StakeInfo {
        address owner;
        uint256 stakedAt;
        uint256 lastClaimed;
        uint8 rarity;
    }

    // tokenId => StakeInfo
    mapping(uint256 => StakeInfo) public stakes;
    // owner => staked token IDs
    mapping(address => uint256[]) private _stakedTokens;

    uint256 private _receivingTokenId;
    address private _receivingFrom;

    event Staked(address indexed owner, uint256 tokenId, uint8 rarity);
    event Unstaked(address indexed owner, uint256 tokenId);
    event Claimed(address indexed owner, uint256 amount);
    event UntrackedPassRecovered(uint256 tokenId, address indexed recipient);

    constructor(address _frxToken, address _frontierPass) Ownable(msg.sender) {
        frxToken = IFRXToken(_frxToken);
        frontierPass = IFrontierPass(_frontierPass);

        // Set multipliers: Common=1x, Rare=1.5x, Epic=2.5x, Legendary=5x
        rarityMultiplier[0] = 10000;  // 1x
        rarityMultiplier[1] = 15000;  // 1.5x
        rarityMultiplier[2] = 25000;  // 2.5x
        rarityMultiplier[3] = 50000;  // 5x
    }

    /// @notice Stake an NFT to start earning $FRX
    function stake(uint256 tokenId) external nonReentrant {
        require(frontierPass.revealed(), "Pass not revealed");
        require(frontierPass.ownerOf(tokenId) == msg.sender, "Not owner");
        
        uint8 rarity = frontierPass.tokenRarity(tokenId);

        _receivingTokenId = tokenId;
        _receivingFrom = msg.sender;
        frontierPass.safeTransferFrom(msg.sender, address(this), tokenId);
        _receivingTokenId = 0;
        _receivingFrom = address(0);

        stakes[tokenId] = StakeInfo({
            owner: msg.sender,
            stakedAt: block.timestamp,
            lastClaimed: block.timestamp,
            rarity: rarity
        });

        _stakedTokens[msg.sender].push(tokenId);

        emit Staked(msg.sender, tokenId, rarity);
    }

    /// @notice Unstake NFT and claim all pending rewards
    function unstake(uint256 tokenId) external nonReentrant {
        StakeInfo memory info = stakes[tokenId];
        require(info.owner == msg.sender, "Not staker");

        uint256 pending = _pendingRewards(tokenId);

        delete stakes[tokenId];
        _removeFromStakedTokens(msg.sender, tokenId);

        frontierPass.safeTransferFrom(address(this), msg.sender, tokenId);

        if (pending > 0) {
            frxToken.mint(msg.sender, pending);
            emit Claimed(msg.sender, pending);
        }

        emit Unstaked(msg.sender, tokenId);
    }

    /// @notice Claim accumulated $FRX without unstaking
    function claim(uint256 tokenId) external nonReentrant {
        StakeInfo storage info = stakes[tokenId];
        require(info.owner == msg.sender, "Not staker");

        uint256 pending = _pendingRewards(tokenId);
        require(pending > 0, "Nothing to claim");

        info.lastClaimed = block.timestamp;
        frxToken.mint(msg.sender, pending);

        emit Claimed(msg.sender, pending);
    }

    /// @notice Claim all rewards from all staked NFTs
    function claimAll() external nonReentrant {
        uint256[] memory tokens = _stakedTokens[msg.sender];
        uint256 totalPending = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 pending = _pendingRewards(tokens[i]);
            if (pending > 0) {
                stakes[tokens[i]].lastClaimed = block.timestamp;
                totalPending += pending;
            }
        }

        require(totalPending > 0, "Nothing to claim");
        frxToken.mint(msg.sender, totalPending);

        emit Claimed(msg.sender, totalPending);
    }

    /// @notice View: pending rewards for a specific token
    function pendingRewards(uint256 tokenId) external view returns (uint256) {
        return _pendingRewards(tokenId);
    }

    /// @notice View: total pending rewards for an address
    function totalPendingRewards(address account) external view returns (uint256) {
        uint256[] memory tokens = _stakedTokens[account];
        uint256 total = 0;
        for (uint256 i = 0; i < tokens.length; i++) {
            total += _pendingRewards(tokens[i]);
        }
        return total;
    }

    /// @notice View: all staked tokens for an address
    function getStakedTokens(address account) external view returns (uint256[] memory) {
        return _stakedTokens[account];
    }

    /// @notice Recover passes transferred with raw ERC721 transferFrom and no stake accounting
    function recoverUntrackedPass(uint256 tokenId, address recipient) external onlyOwner {
        require(recipient != address(0), "Recipient required");
        require(stakes[tokenId].owner == address(0), "Token is staked");
        require(frontierPass.ownerOf(tokenId) == address(this), "Token not held");

        frontierPass.transferFrom(address(this), recipient, tokenId);

        emit UntrackedPassRecovered(tokenId, recipient);
    }

    /// @notice True when account has at least one pass staked in this contract
    function hasStakedPass(address account) external view returns (bool) {
        return _stakedTokens[account].length > 0;
    }

    /// @notice Gate check: wallet-held pass OR staked pass
    function effectivePassHolder(address account) external view returns (bool) {
        return frontierPass.balanceOf(account) > 0 || _stakedTokens[account].length > 0;
    }

    // --- Internal ---

    function _pendingRewards(uint256 tokenId) internal view returns (uint256) {
        StakeInfo memory info = stakes[tokenId];
        if (info.owner == address(0)) return 0;

        uint256 elapsed = block.timestamp - info.lastClaimed;
        uint256 dailyRate = (BASE_RATE * rarityMultiplier[info.rarity]) / 10000;
        // Per-second rate
        return (dailyRate * elapsed) / SECONDS_PER_DAY;
    }

    function _removeFromStakedTokens(address owner, uint256 tokenId) internal {
        uint256[] storage tokens = _stakedTokens[owner];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata)
        external view override returns (bytes4)
    {
        require(msg.sender == address(frontierPass), "Unsupported NFT");
        require(operator == address(this), "Direct transfers not accepted");
        require(from == _receivingFrom && tokenId == _receivingTokenId, "Direct transfers not accepted");
        return IERC721Receiver.onERC721Received.selector;
    }
}
```

### Key Design Decisions

- Rewards accumulate per-second (not per-block) for predictable UX
- `claimAll()` is a convenience function for users with multiple staked NFTs
- NFT is transferred TO the staking contract — this prevents users from selling staked NFTs
- Direct NFT transfers are rejected unless initiated by `stake()` to avoid locked NFTs
- Raw ERC721 `transferFrom` bypasses receiver hooks, so `recoverUntrackedPass()` exists only for NFTs held by the staking contract without stake accounting
- `effectivePassHolder()` should be used by gated frontend areas after staking exists; it treats wallet-held and staked passes as valid access
- Rarity multiplier uses basis points for precision without floating point

---

## 5. FRXLottery.sol — Daily Lottery

### Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFRXToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function depositToTreasury(uint256 amount) external;
}

contract FRXLottery is ReentrancyGuard, Ownable {
    IFRXToken public frxToken;

    uint256 public constant MIN_ENTRY = 10 ether; // 10 FRX minimum
    uint256 public constant DRAW_INTERVAL = 24 hours;
    uint256 public constant TREASURY_CUT = 1000; // 10% in basis points
    uint256 public constant MAX_ENTRIES_PER_ROUND = 100;

    uint256 public currentRound;
    uint256 public lastDrawTime;
    uint256 public currentPool;

    struct Entry {
        address player;
        uint256 amount;
    }

    // round => entries
    mapping(uint256 => Entry[]) public roundEntries;
    mapping(uint256 => uint256) public roundPool;
    mapping(uint256 => address) public roundWinner;
    mapping(uint256 => uint256) public roundPrize;

    event EnteredLottery(address indexed player, uint256 amount, uint256 round);
    event WinnerDrawn(uint256 round, address indexed winner, uint256 prize, uint256 treasury);
    event NewRound(uint256 round);
    event ExcessTokensRecovered(address indexed recipient, uint256 amount);

    constructor(address _frxToken) Ownable(msg.sender) {
        frxToken = IFRXToken(_frxToken);
        currentRound = 1;
        lastDrawTime = block.timestamp;
        emit NewRound(1);
    }

    /// @notice Enter current lottery round
    function enter(uint256 amount) external nonReentrant {
        require(amount >= MIN_ENTRY, "Below minimum entry");
        require(roundEntries[currentRound].length < MAX_ENTRIES_PER_ROUND, "Round entry limit reached");

        frxToken.transferFrom(msg.sender, address(this), amount);

        roundEntries[currentRound].push(Entry({
            player: msg.sender,
            amount: amount
        }));

        currentPool += amount;
        roundPool[currentRound] = currentPool;

        emit EnteredLottery(msg.sender, amount, currentRound);
    }

    /// @notice Draw winner — callable by anyone after 24h
    function drawWinner() external nonReentrant {
        require(block.timestamp >= lastDrawTime + DRAW_INTERVAL, "Too early");
        require(roundEntries[currentRound].length > 0, "No entries");

        Entry[] storage entries = roundEntries[currentRound];

        // Pick winner weighted by amount
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            currentRound,
            entries.length
        )));

        uint256 winningTicket = seed % currentPool;
        address winner;
        uint256 cumulative = 0;

        for (uint256 i = 0; i < entries.length; i++) {
            cumulative += entries[i].amount;
            if (winningTicket < cumulative) {
                winner = entries[i].player;
                break;
            }
        }

        // Calculate splits
        uint256 treasuryAmount = (currentPool * TREASURY_CUT) / 10000; // 10%
        uint256 prizeAmount = currentPool - treasuryAmount;             // 90%

        // Transfer prize to winner
        frxToken.transfer(winner, prizeAmount);

        // Transfer to treasury
        frxToken.depositToTreasury(treasuryAmount);

        // Record results
        roundWinner[currentRound] = winner;
        roundPrize[currentRound] = prizeAmount;

        emit WinnerDrawn(currentRound, winner, prizeAmount, treasuryAmount);

        // Start new round
        currentRound++;
        currentPool = 0;
        lastDrawTime = block.timestamp;

        emit NewRound(currentRound);
    }

    /// @notice View: time until next draw
    function timeUntilDraw() external view returns (uint256) {
        uint256 nextDraw = lastDrawTime + DRAW_INTERVAL;
        if (block.timestamp >= nextDraw) return 0;
        return nextDraw - block.timestamp;
    }

    /// @notice View: current round entries count
    function currentEntryCount() external view returns (uint256) {
        return roundEntries[currentRound].length;
    }

    /// @notice View: get entries for a round
    function getRoundEntries(uint256 round) external view returns (Entry[] memory) {
        return roundEntries[round];
    }

    /// @notice Recover FRX sent directly to this contract outside round accounting
    function recoverExcessTokens(address recipient) external onlyOwner {
        uint256 balance = frxToken.balanceOf(address(this));
        require(balance > currentPool, "No excess tokens");

        uint256 excess = balance - currentPool;
        frxToken.transfer(recipient, excess);

        emit ExcessTokensRecovered(recipient, excess);
    }
}
```

### Key Design Decisions

- Winner selection is weighted by deposit amount (more tokens = higher chance)
- 24-hour interval enforced on-chain
- `drawWinner()` is permissionless — anyone can trigger the draw after 24h
- Uses `block.prevrandao` for randomness (acceptable for demo; production would use Chainlink VRF or commit/reveal)
- Permissionless settlement has demo-grade selective-settlement risk: a caller can revert their own losing draw attempt, but honest callers can still settle the round
- `MAX_ENTRIES_PER_ROUND` keeps weighted winner selection bounded
- Direct FRX transfers are outside round accounting and can be swept with `recoverExcessTokens()`
- Lottery contract calls `depositToTreasury()` directly for the 10% treasury cut

### NOTE on FRXToken Integration

The Lottery contract holds FRX tokens temporarily. When distributing:
- Prize goes directly to winner via `frxToken.transfer(winner, prizeAmount)`
- Treasury cut: lottery calls `frxToken.depositToTreasury(treasuryAmount)`, which moves tokens from the lottery contract to the FRX treasury wallet

---

## 6. CrystalForge.sol — Game (Burn Mechanic)

### Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFRXToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract CrystalForge is ReentrancyGuard, Ownable {
    IFRXToken public frxToken;

    uint256 public constant PLAY_COST = 5 ether; // 5 FRX per play
    uint256 public totalPlays;
    uint256 public totalBurned;
    uint256 public totalPaidOut;

    // Result types
    enum ForgeResult { SHATTER, GLOW, BLAZE, SUPERNOVA }
    // SHATTER = 0 (50%) — lose all
    // GLOW = 1 (25%) — 1.5x return
    // BLAZE = 2 (15%) — 2x return
    // SUPERNOVA = 3 (10%) — 3x return

    struct PlayRecord {
        address player;
        ForgeResult result;
        uint256 payout;
        uint256 timestamp;
    }

    struct PendingForge {
        address player;
        uint256 paid;
        uint256 requestBlock;
        bool settled;
    }

    PlayRecord[] public history;
    mapping(uint256 => PendingForge) public pendingForges;
    mapping(address => uint256) public playerPlays;
    mapping(address => uint256) public playerWinnings;
    uint256 public nextRequestId = 1;

    event ForgeRequested(address indexed player, uint256 indexed requestId, uint256 paid);
    event ForgeRefunded(address indexed player, uint256 indexed requestId, uint256 amount);
    event CrystalForged(
        address indexed player,
        ForgeResult result,
        uint256 payout,
        uint256 playIndex
    );
    event PoolSeeded(address indexed funder, uint256 amount);

    constructor(address _frxToken) Ownable(msg.sender) {
        frxToken = IFRXToken(_frxToken);
    }

    /// @notice Request a forge play. Payment is locked before the outcome is known.
    function forge() external nonReentrant returns (uint256 requestId) {
        frxToken.transferFrom(msg.sender, address(this), PLAY_COST);

        requestId = nextRequestId++;
        pendingForges[requestId] = PendingForge(msg.sender, PLAY_COST, block.number, false);

        emit ForgeRequested(msg.sender, requestId, PLAY_COST);
    }

    /// @notice Settle a forge request in a later block. Anyone can call this.
    function settleForge(uint256 requestId) external nonReentrant {
        PendingForge storage request = pendingForges[requestId];
        require(request.player != address(0), "Unknown request");
        require(!request.settled, "Already settled");
        require(block.number > request.requestBlock, "Settle in next block");

        request.settled = true;

        bytes32 requestBlockHash = blockhash(request.requestBlock);
        require(requestBlockHash != bytes32(0), "Request expired");

        (ForgeResult result, uint256 payout) = _drawResult(requestId, request.player, requestBlockHash);

        if (payout > 0) {
            uint256 contractBalance = frxToken.balanceOf(address(this));
            if (payout > contractBalance) {
                payout = contractBalance;
            }
            frxToken.transfer(request.player, payout);
            totalPaidOut += payout;
        }

        totalPlays++;
        playerPlays[request.player]++;
        playerWinnings[request.player] += payout;

        history.push(PlayRecord({
            player: request.player,
            result: result,
            payout: payout,
            timestamp: block.timestamp
        }));

        emit CrystalForged(request.player, result, payout, history.length - 1);
    }

    /// @notice Refund requests that missed the 256-block blockhash settlement window
    function refundExpiredForge(uint256 requestId) external nonReentrant {
        PendingForge storage request = pendingForges[requestId];
        require(request.player != address(0), "Unknown request");
        require(!request.settled, "Already settled");
        require(block.number > request.requestBlock + 256, "Request still settleable");

        request.settled = true;
        frxToken.transfer(request.player, request.paid);

        emit ForgeRefunded(request.player, requestId, request.paid);
    }

    /// @notice Owner can burn excess tokens accumulated in the contract
    function burnExcess() external onlyOwner {
        uint256 balance = frxToken.balanceOf(address(this));
        if (balance > 0) {
            frxToken.burn(balance);
            totalBurned += balance;
        }
    }

    /// @notice View: recent play history
    function getRecentHistory(uint256 count) external view returns (PlayRecord[] memory) {
        uint256 len = history.length;
        if (count > len) count = len;
        
        PlayRecord[] memory recent = new PlayRecord[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = history[len - count + i];
        }
        return recent;
    }

    /// @notice Owner can seed the game pool with initial FRX
    function seedPool(uint256 amount) external onlyOwner {
        frxToken.transferFrom(msg.sender, address(this), amount);
        emit PoolSeeded(msg.sender, amount);
    }

    function _drawResult(uint256 requestId, address player, bytes32 requestBlockHash)
        internal
        view
        returns (ForgeResult result, uint256 payout)
    {
        uint256 roll = uint256(keccak256(abi.encodePacked(
            requestBlockHash,
            player,
            requestId,
            address(this)
        ))) % 100;

        if (roll < 50) return (ForgeResult.SHATTER, 0);
        if (roll < 75) return (ForgeResult.GLOW, (PLAY_COST * 15) / 10);
        if (roll < 90) return (ForgeResult.BLAZE, PLAY_COST * 2);
        return (ForgeResult.SUPERNOVA, PLAY_COST * 3);
    }
}
```

### Key Design Decisions

- Game is slightly deflationary in V1:
  - 50% SHATTER (0x), 25% GLOW (1.5x), 15% BLAZE (2x), 10% SUPERNOVA (3x)
  - EV = 0.5×0 + 0.25×7.5 + 0.15×10 + 0.10×15 = 4.875 per 5 FRX play = 0.975x
- `forge()` only locks payment and creates a request; `settleForge()` resolves it in a later block to avoid lossless revert-sampling
- `refundExpiredForge()` returns payment if the request misses the 256-block settlement window
- If the pool is underfunded, payout is capped to the available pool balance; frontend should show pool liquidity
- `burnExcess()` lets owner periodically burn accumulated excess

### Alternative (Simpler) Design

If we want pure burn mechanics (no pool management):

```solidity
function forge() external nonReentrant {
    frxToken.transferFrom(msg.sender, address(this), PLAY_COST);
    
    // Always burn the input
    frxToken.burn(PLAY_COST);
    totalBurned += PLAY_COST;
    
    // Determine if player wins (mint new tokens as reward)
    // This requires FRXToken to allow CrystalForge to mint — 
    // more complex, skip for V1
}
```

**Final recommendation**: Keep the pool-based approach. Owner seeds the pool with initial tokens. The expected value < 1x ensures gradual depletion. Owner periodically calls `burnExcess()` to burn accumulated tokens.

---

## 7. Hardhat Project Structure

```
frontierx-contracts/
├── contracts/
│   ├── FRXToken.sol
│   ├── FrontierPass.sol
│   ├── FRXStaking.sol
│   ├── FRXLottery.sol
│   └── CrystalForge.sol
├── scripts/
│   ├── deploy-sepolia.ts
│   ├── deploy-polygon.ts
│   ├── deploy-base.ts
│   └── verify.ts
├── test/
│   ├── FRXToken.test.ts
│   ├── FrontierPass.test.ts
│   ├── FRXStaking.test.ts
│   ├── FRXLottery.test.ts
│   └── CrystalForge.test.ts
├── hardhat.config.ts
├── package.json
└── .env.example
```

### hardhat.config.ts — Key Configuration

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
  },
};

export default config;
```

### .env.example

```
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com
BASE_RPC_URL=https://mainnet.base.org
ETHERSCAN_API_KEY=
POLYGONSCAN_API_KEY=
BASESCAN_API_KEY=
TREASURY_WALLET=0x_your_treasury_address
```

---

## 8. Deployment Script Template

```typescript
// scripts/deploy-sepolia.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const treasuryWallet = process.env.TREASURY_WALLET!;
  const mintPrice = ethers.parseEther("0.003"); // Sepolia mint price

  // 1. Deploy FRXToken
  const FRXToken = await ethers.getContractFactory("FRXToken");
  const frxToken = await FRXToken.deploy(treasuryWallet);
  await frxToken.waitForDeployment();
  const frxTokenAddr = await frxToken.getAddress();
  console.log("FRXToken:", frxTokenAddr);

  // 2. Deploy FrontierPass
  const FrontierPass = await ethers.getContractFactory("FrontierPass");
  const frontierPass = await FrontierPass.deploy(
    mintPrice,
    "ipfs://PLACEHOLDER/", // Will be updated after IPFS upload
    deployer.address       // Royalty receiver
  );
  await frontierPass.waitForDeployment();
  const frontierPassAddr = await frontierPass.getAddress();
  console.log("FrontierPass:", frontierPassAddr);

  // 3. Deploy FRXStaking
  const FRXStaking = await ethers.getContractFactory("FRXStaking");
  const staking = await FRXStaking.deploy(frxTokenAddr, frontierPassAddr);
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("FRXStaking:", stakingAddr);

  // 4. Deploy FRXLottery
  const FRXLottery = await ethers.getContractFactory("FRXLottery");
  const lottery = await FRXLottery.deploy(frxTokenAddr);
  await lottery.waitForDeployment();
  console.log("FRXLottery:", await lottery.getAddress());

  // 5. Deploy CrystalForge
  const CrystalForge = await ethers.getContractFactory("CrystalForge");
  const crystalForge = await CrystalForge.deploy(frxTokenAddr);
  await crystalForge.waitForDeployment();
  console.log("CrystalForge:", await crystalForge.getAddress());

  // 6. CRITICAL: Authorize staking contract to mint FRX
  await frxToken.setStakingContract(stakingAddr);
  console.log("Staking contract authorized to mint FRX");

  console.log("\n--- Deployment Complete ---");
  console.log("Save these addresses to your .env and frontend config!");
}

main().catch(console.error);
```

---

## 9. Testing Requirements

Each contract must have tests covering:

### FRXToken
- [x] Only staking contract can mint
- [x] Anyone can burn own tokens
- [x] Treasury deposit works
- [x] circulatingSupply() calculation is correct

### FrontierPass
- [x] Mint with correct payment succeeds
- [x] Mint with incorrect payment reverts
- [x] Cannot mint beyond MAX_SUPPLY (100)
- [x] Rarity is assigned during reveal from the fixed pool
- [x] Cannot mint after reveal
- [x] holdsPass() returns correct value
- [x] tokensOfOwner() returns correct array

### FRXStaking
- [x] Can stake owned NFT
- [x] Cannot stake unowned NFT
- [x] Rewards accumulate over time
- [x] Rarity multiplier affects rewards correctly
- [x] Claim resets lastClaimed timestamp
- [x] Unstake returns NFT and claims rewards
- [x] claimAll() works for multiple staked NFTs

### FRXLottery
- [x] Can enter with >= MIN_ENTRY
- [x] Cannot enter below MIN_ENTRY
- [x] Entry cap prevents unbounded draw gas
- [x] Cannot draw before 24h
- [x] Draw distributes 90% to winner, 10% to treasury
- [x] New round starts after draw
- [x] Direct token transfer excess can be recovered

### CrystalForge
- [x] forge() takes correct amount and creates a settlement request
- [x] settleForge() settles a request only once
- [x] refundExpiredForge() refunds missed settlement-window requests
- [x] Results fall within expected probability ranges (fuzzing)
- [x] History recording works
- [x] burnExcess() burns contract balance

### Full Lifecycle
- [x] Deploy all five contracts together
- [x] Mint and reveal FrontierPass
- [x] Stake NFT, accrue rewards, and claim FRX
- [x] Enter and draw lottery with 10/90 split
- [x] Request and settle Crystal Forge
