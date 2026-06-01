// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IForgeFRXToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract CrystalForge is ReentrancyGuard, Ownable {
    IForgeFRXToken public frxToken;

    uint256 public constant PLAY_COST = 5 ether;

    uint256 public totalPlays;
    uint256 public totalBurned;
    uint256 public totalPaidOut;

    enum ForgeResult {
        SHATTER,
        GLOW,
        BLAZE,
        SUPERNOVA
    }

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
    mapping(uint256 requestId => PendingForge request) public pendingForges;
    mapping(address player => uint256 plays) public playerPlays;
    mapping(address player => uint256 winnings) public playerWinnings;

    uint256 public nextRequestId = 1;

    event ForgeRequested(address indexed player, uint256 indexed requestId, uint256 paid);
    event ForgeRefunded(address indexed player, uint256 indexed requestId, uint256 amount);
    event CrystalForged(address indexed player, ForgeResult result, uint256 payout, uint256 playIndex);
    event PoolSeeded(address indexed funder, uint256 amount);

    constructor(address _frxToken) Ownable(msg.sender) {
        require(_frxToken != address(0), "FRX token required");

        frxToken = IForgeFRXToken(_frxToken);
    }

    function forge() external nonReentrant returns (uint256 requestId) {
        bool paid = frxToken.transferFrom(msg.sender, address(this), PLAY_COST);
        require(paid, "Play transfer failed");

        requestId = nextRequestId;
        nextRequestId++;

        pendingForges[requestId] =
            PendingForge({ player: msg.sender, paid: PLAY_COST, requestBlock: block.number, settled: false });

        emit ForgeRequested(msg.sender, requestId, PLAY_COST);
    }

    function settleForge(uint256 requestId) external nonReentrant {
        PendingForge storage request = pendingForges[requestId];
        require(request.player != address(0), "Unknown request");
        require(!request.settled, "Already settled");
        require(block.number > request.requestBlock, "Settle in next block");

        bytes32 requestBlockHash = blockhash(request.requestBlock);
        require(requestBlockHash != bytes32(0), "Request expired");

        request.settled = true;

        (ForgeResult result, uint256 payout) = _drawResult(requestId, request.player, requestBlockHash);

        if (payout > 0) {
            uint256 contractBalance = frxToken.balanceOf(address(this));
            if (payout > contractBalance) {
                payout = contractBalance;
            }

            if (payout > 0) {
                bool transferred = frxToken.transfer(request.player, payout);
                require(transferred, "Payout transfer failed");
                totalPaidOut += payout;
            }
        }

        totalPlays++;
        playerPlays[request.player]++;
        playerWinnings[request.player] += payout;

        history.push(
            PlayRecord({ player: request.player, result: result, payout: payout, timestamp: block.timestamp })
        );

        emit CrystalForged(request.player, result, payout, history.length - 1);
    }

    function refundExpiredForge(uint256 requestId) external nonReentrant {
        PendingForge storage request = pendingForges[requestId];
        require(request.player != address(0), "Unknown request");
        require(!request.settled, "Already settled");
        require(block.number > request.requestBlock + 256, "Request still settleable");

        request.settled = true;

        bool refunded = frxToken.transfer(request.player, request.paid);
        require(refunded, "Refund transfer failed");

        emit ForgeRefunded(request.player, requestId, request.paid);
    }

    function burnExcess() external onlyOwner {
        uint256 balance = frxToken.balanceOf(address(this));
        if (balance == 0) {
            return;
        }

        frxToken.burn(balance);
        totalBurned += balance;
    }

    function getRecentHistory(uint256 count) external view returns (PlayRecord[] memory) {
        uint256 length = history.length;
        if (count > length) {
            count = length;
        }

        PlayRecord[] memory recent = new PlayRecord[](count);
        uint256 start = length - count;

        for (uint256 i = 0; i < count; i++) {
            recent[i] = history[start + i];
        }

        return recent;
    }

    function seedPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Seed amount required");

        bool transferred = frxToken.transferFrom(msg.sender, address(this), amount);
        require(transferred, "Seed transfer failed");

        emit PoolSeeded(msg.sender, amount);
    }

    function historyLength() external view returns (uint256) {
        return history.length;
    }

    function _drawResult(uint256 requestId, address player, bytes32 requestBlockHash)
        internal
        view
        returns (ForgeResult result, uint256 payout)
    {
        uint256 roll = _random(requestId, player, requestBlockHash) % 100;

        if (roll < 50) {
            return (ForgeResult.SHATTER, 0);
        }

        if (roll < 75) {
            return (ForgeResult.GLOW, (PLAY_COST * 15) / 10);
        }

        if (roll < 90) {
            return (ForgeResult.BLAZE, PLAY_COST * 2);
        }

        return (ForgeResult.SUPERNOVA, PLAY_COST * 3);
    }

    function _random(uint256 requestId, address player, bytes32 requestBlockHash) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(requestBlockHash, player, requestId, address(this))));
    }
}
