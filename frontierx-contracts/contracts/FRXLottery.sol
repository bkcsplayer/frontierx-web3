// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ILotteryFRXToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function depositToTreasury(uint256 amount) external;
}

contract FRXLottery is ReentrancyGuard, Ownable {
    ILotteryFRXToken public frxToken;

    uint256 public constant MIN_ENTRY = 10 ether;
    uint256 public constant DRAW_INTERVAL = 24 hours;
    uint256 public constant TREASURY_CUT = 1_000; // 10% in basis points
    uint256 public constant MAX_ENTRIES_PER_ROUND = 100;

    uint256 public currentRound;
    uint256 public lastDrawTime;
    uint256 public currentPool;

    struct Entry {
        address player;
        uint256 amount;
    }

    mapping(uint256 round => Entry[] entries) private _roundEntries;
    mapping(uint256 round => uint256 pool) public roundPool;
    mapping(uint256 round => address winner) public roundWinner;
    mapping(uint256 round => uint256 prize) public roundPrize;

    event EnteredLottery(address indexed player, uint256 amount, uint256 round);
    event WinnerDrawn(uint256 round, address indexed winner, uint256 prize, uint256 treasury);
    event NewRound(uint256 round);
    event ExcessTokensRecovered(address indexed recipient, uint256 amount);

    constructor(address _frxToken) Ownable(msg.sender) {
        require(_frxToken != address(0), "FRX token required");

        frxToken = ILotteryFRXToken(_frxToken);
        currentRound = 1;
        lastDrawTime = block.timestamp;

        emit NewRound(1);
    }

    function enter(uint256 amount) external nonReentrant {
        require(amount >= MIN_ENTRY, "Below minimum entry");
        require(_roundEntries[currentRound].length < MAX_ENTRIES_PER_ROUND, "Round entry limit reached");

        bool transferred = frxToken.transferFrom(msg.sender, address(this), amount);
        require(transferred, "Entry transfer failed");

        _roundEntries[currentRound].push(Entry({ player: msg.sender, amount: amount }));

        currentPool += amount;
        roundPool[currentRound] = currentPool;

        emit EnteredLottery(msg.sender, amount, currentRound);
    }

    function drawWinner() external nonReentrant {
        require(block.timestamp >= lastDrawTime + DRAW_INTERVAL, "Too early");
        require(_roundEntries[currentRound].length > 0, "No entries");

        Entry[] storage entries = _roundEntries[currentRound];
        uint256 pool = currentPool;
        uint256 winningTicket = _random(entries.length) % pool;
        address winner = _selectWinner(entries, winningTicket);

        uint256 treasuryAmount = (pool * TREASURY_CUT) / 10_000;
        uint256 prizeAmount = pool - treasuryAmount;

        roundWinner[currentRound] = winner;
        roundPrize[currentRound] = prizeAmount;

        bool prizeTransferred = frxToken.transfer(winner, prizeAmount);
        require(prizeTransferred, "Prize transfer failed");
        frxToken.depositToTreasury(treasuryAmount);

        emit WinnerDrawn(currentRound, winner, prizeAmount, treasuryAmount);

        currentRound++;
        currentPool = 0;
        lastDrawTime = block.timestamp;

        emit NewRound(currentRound);
    }

    function timeUntilDraw() external view returns (uint256) {
        uint256 nextDraw = lastDrawTime + DRAW_INTERVAL;
        if (block.timestamp >= nextDraw) {
            return 0;
        }

        return nextDraw - block.timestamp;
    }

    function currentEntryCount() external view returns (uint256) {
        return _roundEntries[currentRound].length;
    }

    function getRoundEntries(uint256 round) external view returns (Entry[] memory) {
        return _roundEntries[round];
    }

    function recoverExcessTokens(address recipient) external onlyOwner {
        require(recipient != address(0), "Recipient required");

        uint256 balance = frxToken.balanceOf(address(this));
        require(balance > currentPool, "No excess tokens");

        uint256 excess = balance - currentPool;
        bool transferred = frxToken.transfer(recipient, excess);
        require(transferred, "Excess transfer failed");

        emit ExcessTokensRecovered(recipient, excess);
    }

    function _selectWinner(Entry[] storage entries, uint256 winningTicket) internal view returns (address) {
        uint256 cumulative = 0;

        for (uint256 i = 0; i < entries.length; i++) {
            cumulative += entries[i].amount;
            if (winningTicket < cumulative) {
                return entries[i].player;
            }
        }

        return entries[entries.length - 1].player;
    }

    function _random(uint256 entryCount) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, currentRound, entryCount)));
    }
}
