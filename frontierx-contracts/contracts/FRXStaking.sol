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

    uint256 public constant BASE_RATE = 100 ether;
    uint256 public constant SECONDS_PER_DAY = 86_400;

    // Rarity multipliers in basis points: 10_000 = 1x.
    mapping(uint8 rarity => uint256 multiplier) public rarityMultiplier;

    struct StakeInfo {
        address owner;
        uint256 stakedAt;
        uint256 lastClaimed;
        uint8 rarity;
    }

    mapping(uint256 tokenId => StakeInfo stakeInfo) public stakes;
    mapping(address owner => uint256[] tokenIds) private _stakedTokens;

    uint256 private _receivingTokenId;
    address private _receivingFrom;

    event Staked(address indexed owner, uint256 tokenId, uint8 rarity);
    event Unstaked(address indexed owner, uint256 tokenId);
    event Claimed(address indexed owner, uint256 amount);
    event UntrackedPassRecovered(uint256 tokenId, address indexed recipient);

    constructor(address _frxToken, address _frontierPass) Ownable(msg.sender) {
        require(_frxToken != address(0), "FRX token required");
        require(_frontierPass != address(0), "FrontierPass required");

        frxToken = IFRXToken(_frxToken);
        frontierPass = IFrontierPass(_frontierPass);

        rarityMultiplier[0] = 10_000;
        rarityMultiplier[1] = 15_000;
        rarityMultiplier[2] = 25_000;
        rarityMultiplier[3] = 50_000;
    }

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

    function claim(uint256 tokenId) external nonReentrant {
        StakeInfo storage info = stakes[tokenId];
        require(info.owner == msg.sender, "Not staker");

        uint256 pending = _pendingRewards(tokenId);
        require(pending > 0, "Nothing to claim");

        info.lastClaimed = block.timestamp;
        frxToken.mint(msg.sender, pending);

        emit Claimed(msg.sender, pending);
    }

    function claimAll() external nonReentrant {
        uint256[] memory tokenIds = _stakedTokens[msg.sender];
        uint256 totalPending = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 pending = _pendingRewards(tokenId);

            if (pending > 0) {
                stakes[tokenId].lastClaimed = block.timestamp;
                totalPending += pending;
            }
        }

        require(totalPending > 0, "Nothing to claim");
        frxToken.mint(msg.sender, totalPending);

        emit Claimed(msg.sender, totalPending);
    }

    function pendingRewards(uint256 tokenId) external view returns (uint256) {
        return _pendingRewards(tokenId);
    }

    function totalPendingRewards(address account) external view returns (uint256) {
        uint256[] memory tokenIds = _stakedTokens[account];
        uint256 total = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            total += _pendingRewards(tokenIds[i]);
        }

        return total;
    }

    function getStakedTokens(address account) external view returns (uint256[] memory) {
        return _stakedTokens[account];
    }

    function recoverUntrackedPass(uint256 tokenId, address recipient) external onlyOwner {
        require(recipient != address(0), "Recipient required");
        require(stakes[tokenId].owner == address(0), "Token is staked");
        require(frontierPass.ownerOf(tokenId) == address(this), "Token not held");

        frontierPass.transferFrom(address(this), recipient, tokenId);

        emit UntrackedPassRecovered(tokenId, recipient);
    }

    function hasStakedPass(address account) external view returns (bool) {
        return _stakedTokens[account].length > 0;
    }

    function effectivePassHolder(address account) external view returns (bool) {
        return frontierPass.balanceOf(account) > 0 || _stakedTokens[account].length > 0;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata)
        external
        view
        override
        returns (bytes4)
    {
        require(msg.sender == address(frontierPass), "Unsupported NFT");
        require(operator == address(this), "Direct transfers not accepted");
        require(from == _receivingFrom && tokenId == _receivingTokenId, "Direct transfers not accepted");

        return IERC721Receiver.onERC721Received.selector;
    }

    function _pendingRewards(uint256 tokenId) internal view returns (uint256) {
        StakeInfo memory info = stakes[tokenId];
        if (info.owner == address(0)) {
            return 0;
        }

        uint256 elapsed = block.timestamp - info.lastClaimed;
        uint256 dailyRate = (BASE_RATE * rarityMultiplier[info.rarity]) / 10_000;

        return (dailyRate * elapsed) / SECONDS_PER_DAY;
    }

    function _removeFromStakedTokens(address owner, uint256 tokenId) internal {
        uint256[] storage tokenIds = _stakedTokens[owner];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId) {
                tokenIds[i] = tokenIds[tokenIds.length - 1];
                tokenIds.pop();
                return;
            }
        }
    }
}
